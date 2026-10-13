import {move,canOccupy} from './world.js?v=7.0';
import {spawnMonster} from './monsters.js?v=7.0';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// Boss-local timers use simulation time; debug movement never accelerates these attacks.
export function updateHerald(c,e,dt,clear){
 const p=c.player,a=c.world.arena;
 for(const k of ['flash','slow','cooldown'])e[k]=Math.max(0,(e[k]||0)-dt);
 const inside=p.x>a.left&&p.x<a.right&&p.y>a.top&&p.y<a.bottom;
 if(!inside||!clear(c.world,e,p)){e.state='idle';e.action=null;e.runes=[];return;}
 e.alert=true;e.phase??=1;e.sequence??=0;e.runes??=[];
 if(e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.state='recover';e.timer=1.5;e.action=null;e.runes=[];c.number('THE SEAL BREAKS',e.x,e.y-90,'#e8b6ff');c.effect('100',12,e.x,e.y-25,110,0,.8);c.onNotice?.('The Herald breaks its seal. Violet circles will burn — move before they close.');}
 for(const r of e.runes){r.time-=dt;if(r.time<=0&&!r.fired){r.fired=true;r.fade=.35;if(distance(p,r)<r.radius&&clear(c.world,e,p))c.hurt(e.damage*1.2,e);c.effect('100',12,r.x,r.y,90,0,.35);}if(r.fired)r.fade-=dt;}
 e.runes=e.runes.filter(r=>!r.fired||r.fade>0);
 if(e.state==='attack'){
  e.timer-=dt;if(e.timer>0)return;
  if(e.action==='summon'){
   let made=0;const living=c.enemies.filter(n=>n.summoner===e.id&&n.hp>0).length;
   for(const [dx,dy]of [[-70,40],[70,40],[0,-70]]){
    if(living+made>=2)break;const x=e.x+dx,y=e.y+dy;
    if(!canOccupy(c.world,x,y,12)||distance({x,y},p)<70||c.enemies.some(n=>n.hp>0&&distance(n,{x,y})<26))continue;
    const n=spawnMonster('cult',c.nextEnemyId++,x,y,c.world.seed);Object.assign(n,{summoner:e.id,noLoot:true,xp:0,alert:true,cooldown:1.5});c.enemies.push(n);made++;c.effect('100',12,x,y,42,0,.5);
   }
   if(!made)volley(c,e);
  }else if(e.action==='volley')volley(c,e);
  e.action=null;e.state='recover';e.timer=e.phase===2?.65:1;return;
 }
 if(e.state==='recover'){
  e.timer-=dt;
  // A measured sidestep between casts keeps the boss mobile without cancelling telegraphs.
  const angle=Math.atan2(p.y-e.y,p.x-e.x)+Math.PI/2*(e.sequence%2?1:-1),step=32*dt;
  const x=e.x+Math.cos(angle)*step,y=e.y+Math.sin(angle)*step;
  if(x>a.left+48&&x<a.right-48&&y>a.top+48&&y<a.bottom-48)move(c.world,e,x-e.x,y-e.y);
  if(e.timer<=0)e.state='chase';return;
 }
 e.sequence++;e.angle=Math.atan2(p.y-e.y,p.x-e.x);e.action=['volley','rune','volley','summon'][(e.sequence-1)%4];e.state='attack';e.timer=e.action==='rune'?1.25:.9;
 if(e.action==='rune'){
  const offsets=e.phase===2?[[0,0],[-82,0],[82,0],[0,82]]:[[0,0]];
  for(const [dx,dy]of offsets){const x=p.x+dx,y=p.y+dy;if(canOccupy(c.world,x,y,12))e.runes.push({x,y,radius:34,time:1.25,total:1.25,fired:false});}
 }
}
function volley(c,e){for(const offset of (e.phase===2?[-.36,-.18,0,.18,.36]:[-.18,0,.18]))c.shoot(e,e.angle+offset,'magic',e.damage,'enemy',e.phase===2?175:145);}
