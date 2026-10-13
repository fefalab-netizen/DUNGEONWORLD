import {updateHerald} from './herald.js?v=7.0';
import {move,canOccupy} from './world.js?v=7.0';
import {spawnMonster} from './monsters.js?v=7.0';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function tactics(e,enemies){
 const allies=enemies.filter(a=>a!==e&&a.hp>0&&a.faction===e.faction&&dist(a,e)<260);
 const frontline=allies.find(a=>a.kind==='melee');
 const injured=allies.filter(a=>a.hp<a.maxHp*.8).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 return {frontline,injured,allies,mode:e.role==='ranged'?(frontline?'covered':'independent'):e.role==='support'?(injured?'heal':allies.length?'ward':'offense'):e.role==='tank'?(allies.length?'protect':'pressure'):'offense'};
}
function summon(c,e){
 if(c.world.depth===3&&c.world.bossDefeated)return false;
 if(c.enemies.filter(a=>a.hp>0&&a.summoner===e.id).length>=2)return false;
 for(const [dx,dy]of [[48,0],[-48,0],[0,48],[0,-48]]){
  const x=e.x+dx,y=e.y+dy;if(!canOccupy(c.world,x,y,12)||dist({x,y},c.player)<60||c.enemies.some(a=>a.hp>0&&dist(a,{x,y})<26))continue;
  const n=spawnMonster(e.faction==='chapel'?'bone':'grunt',c.nextEnemyId++,x,y,c.world.seed);n.faction=e.faction;n.summoner=e.id;n.alert=true;n.cooldown=1.3;n.xp=0;n.noLoot=true;c.enemies.push(n);c.effect('100',12,x,y,42,0,.5);return true;
 }return false;
}
export function updateEnemy(c,e,dt,clear){
 if(e.finalBoss){updateHerald(c,e,dt,clear);return;}
 const p=c.player,w=c.world,d=dist(e,p);
 if(w.kind==='overworld'&&(d>640||dist(p,w.safeZone)<w.safeZone.radius)){e.state='idle';e.alert=false;return;}
 for(const k of ['cooldown','flash','slow','ward','abilityCooldown'])e[k]=Math.max(0,(e[k]||0)-dt);
 e.pathTimer-=dt;e.tacticalTimer-=dt;
 if(e.tacticalTimer<=0){e.tactics=tactics(e,c.enemies);e.tacticalTimer=.5;}
 const visible=clear(w,e,p),notice=e.role==='ambusher'?105:e.detection;
 if(d<notice&&visible)e.alert=true;
 if(!e.alert&&c.noise&&dist(e,c.noise)<210&&c.noise.until>c.time){e.state='investigate';e.investigate={x:c.noise.x,y:c.noise.y};e.timer=3;}
 if(!e.alert&&e.tactics.allies.some(a=>a.alert&&dist(a,e)<140)&&d<340){e.state='alert';e.alert=true;}
 if(e.alert&&d>520){e.alert=false;e.state='return';}
 if(!e.alert){
  if(e.state==='investigate'){e.timer-=dt;if(visible&&d<320)e.alert=true;if(e.timer<=0)e.state='return';}
  else if(dist(e,e.post)>50)e.state='return';
  else if(e.role==='ambusher'){e.state='idle';return;}
  else e.state='patrol';
  const target=e.state==='investigate'?e.investigate:e.state==='return'?e.post:{x:e.post.x+Math.sin(c.time*.4+e.id)*28,y:e.post.y};
  navigate(c,e,target,dt,clear,.45);return;
 }
 if(e.state==='attack'){
  e.timer-=dt;if(e.timer>0)return;
  const action=e.action;e.action=null;
  if(action==='heal'||action==='ward'){
   const a=e.target;if(a&&a.hp>0&&dist(e,a)<260&&clear(w,e,a)){if(action==='heal')a.hp=Math.min(a.maxHp,a.hp+18);else a.ward=5;c.effect('100',2,a.x,a.y-16,40);}
   else c.shoot(e,e.angle,'magic',e.damage,'enemy',135);
  }else if(action==='summon'){if(!summon(c,e))c.shoot(e,e.angle,'magic',e.damage,'enemy',135);else if(e.boss)summon(c,e);}
  else if(action==='rune'){if(dist(p,e.mark)<e.mark.radius&&clear(w,e,p))c.hurt(e.damage*1.3,e);c.effect('100',12,e.mark.x,e.mark.y,90);e.mark=null;}
  else if(action==='lunge'){
   // Locked direction; collision substeps and the long windup make this avoidable.
   for(let i=0;i<16;i++){move(w,e,Math.cos(e.angle)*6,Math.sin(e.angle)*6);if(dist(e,p)<e.range+8&&clear(w,e,p))c.hurt(e.damage,e);}
  }else if(e.kind==='melee'){const a=Math.atan2(p.y-e.y,p.x-e.x);if(dist(e,p)<e.range+9&&Math.cos(a-e.angle)>.35&&clear(w,e,p))c.hurt(e.damage,e);}
  else {c.shoot(e,e.angle,e.kind,e.damage,'enemy',e.kind==='arrow'?190:135,false,e.statuses);if(e.tier==='elite')for(const offset of [-.18,.18])c.shoot(e,e.angle+offset,e.kind,e.damage*.7,'enemy',135);}
  e.state='recover';e.timer=.42;e.cooldown=(e.kind==='melee'?.7:1.4)/e.attackSpeed;return;
 }
 if(e.state==='recover'){e.timer-=dt;if(e.timer<=0)e.state='chase';return;}
 if(e.abilityCooldown===0&&visible&&d<280){
  let action=null,target=null;
  if(e.abilities.includes('heal')&&e.tactics.injured?.hp>0){action='heal';target=e.tactics.injured;}
  else if(e.abilities.includes('ward')){target=e.tactics.allies.find(a=>a.hp>0&&!a.ward);if(target)action='ward';}
  if(e.abilities.includes('reinforce')&&!e.reinforced&&e.hp<e.maxHp*.6){action='summon';e.reinforced=true;}
  if(e.abilities.includes('summon'))action=e.attackCount%2?'summon':'rune';
  if(action==='rune'&&!e.abilities.includes('rune'))action='summon';
  if(e.abilities.includes('lunge')&&d>60&&d<190)action='lunge';
  if(action){e.action=action;e.target=target;e.abilityCooldown=e.tier==='elite'?4:6;e.attackCount=(e.attackCount||0)+1;e.mark=action==='rune'?{x:p.x,y:p.y,radius:46}:null;windup(e,p,action==='rune'?1.25:1);return;}
 }
 if(d<e.range&&visible&&e.cooldown===0){windup(e,p,e.kind==='melee'?.48:.7);return;}
 let target=p,speed=1;e.state='chase';
 if(e.kind!=='melee'&&visible){
  const front=e.tactics.frontline;
  if(front?.hp>0&&d>150){const a=Math.atan2(front.y-p.y,front.x-p.x);target={x:front.x+Math.cos(a)*60,y:front.y+Math.sin(a)*60};if(!canOccupy(w,target.x,target.y,e.radius))target=p;}
  if(d<110){const a=Math.atan2(e.y-p.y,e.x-p.x);const choices=[a,a+1.2,a-1.2].map(v=>({x:e.x+Math.cos(v)*50,y:e.y+Math.sin(v)*50}));target=choices.find(t=>canOccupy(w,t.x,t.y,e.radius)&&clear(w,e,t,e.radius));if(!target){e.tactics.mode='cornered';if(e.cooldown===0)windup(e,p,.55);return;}e.state='retreat';}
  else if(d<e.range*.85)return;
 }
 if(e.abilities.includes('coward')&&e.hp<e.maxHp*.3&&e.tactics.allies.length){target=e.tactics.allies[0];e.state='retreat';}
 navigate(c,e,target,dt,clear,speed);
}
function windup(e,p,time){e.state='attack';e.timer=time;e.angle=Math.atan2(p.y-e.y,p.x-e.x);}
function navigate(c,e,target,dt,clear,factor){
 if(!target)return;
 let aim=target;
 if(!clear(c.world,e,target,e.radius)){
  if(e.waypoint&&dist(e,e.waypoint)<5){e.waypoint=null;e.pathTimer=0;}
  if(e.pathTimer<=0){e.waypoint=c.waypoint(e,target);e.pathTimer=.65;}
  aim=e.waypoint;if(!aim){e.state='recover';e.timer=.35;return;}
 }
 const a=Math.atan2(aim.y-e.y,aim.x-e.x),x=e.x,y=e.y;e.angle=a;
 const speed=e.speed*(e.slow>0?.5:1)*factor;move(c.world,e,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt);
 e.stuck=dist(e,{x,y})<speed*dt*.1?e.stuck+dt:0;
 if(e.stuck>1){e.waypoint=null;e.pathTimer=0;e.state='recover';e.timer=.3;e.stuck=0;}
}
