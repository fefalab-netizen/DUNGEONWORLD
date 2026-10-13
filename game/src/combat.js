import {legacyMonsters,spawnMonster} from './monsters.js?v=7.0';
import {updateEnemy} from './enemy-ai.js?v=7.0';
import {flipForAim,facingAngle} from './facing.js?v=7.0';
import {move,canOccupy,TILE} from './world.js?v=7.0';
export const weapons=[
 {kind:'melee',cooldown:.55,range:55,arc:1.2,fx:10,special:'Wide axe sweep'},
 {kind:'melee',cooldown:.4,range:52,arc:.95,fx:0,special:'Heavy armor'},
 {kind:'magic',cooldown:.55,speed:260,special:'Frost bolts slow enemies'},
 {kind:'magic',cooldown:.5,speed:245,special:'Hits restore 2 health'},
 {kind:'arrow',cooldown:.32,speed:390,special:'Fast precision arrows'},
 {kind:'melee',cooldown:.24,range:40,arc:.7,fx:6,special:'25% critical chance; fast dodge'},
 {kind:'melee',cooldown:.7,range:65,arc:1.5,fx:8,special:'Heavy knockback'},
 {kind:'bomb',cooldown:.8,speed:210,special:'Bombs explode in a 55px radius'},
];
export const enemyTypes=legacyMonsters;
export function lineClear(world,a,b,radius=2){const count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);for(let i=0;i<=count;i++){const t=count?i/count:0;if(!canOccupy(world,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,radius))return false;}return true;}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Combat targets cover the visible body; movement retains the feet collider.
export function enemyHitDistance(point,enemy){
 const dx=Math.max(0,Math.abs(point.x-enemy.x)-14*(enemy.scale||1));
 const dy=Math.max(0,Math.abs(point.y-(enemy.y+8-21*(enemy.scale||1)))-21*(enemy.scale||1));
 return Math.hypot(dx,dy);
}
export class Combat {
 constructor(world,player,hero){this.world=world;this.player=player;this.hero=hero;this.weapon=weapons[hero.id];Object.assign(player,{hp:hero.hp,xp:0,cooldown:0,dodge:0,dodgeCooldown:0,invulnerable:0,flash:0,angle:0});this.enemies=[];this.projectiles=[];this.effects=[];this.numbers=[];this.kills=0;this.time=0;this.started=false;this.finished=false;this.randomState=127;}
 start(){if(this.started)return;this.started=true;const positions=this.world.enemySpawns||[[12,12,0],[9,15,3],[15,7,1],[25,13,4],[29,10,5],[31,17,2]];this.enemies=positions.map(([x,y,type,tier='normal'],id)=>spawnMonster(typeof type==='number'?enemyTypes[type].id:type,id,(x+.5)*32,(y+.5)*32,this.world.seed||'legacy',tier));this.nextEnemyId=this.enemies.length;for(const e of this.enemies)if(!canOccupy(this.world,e.x,e.y,e.radius))throw new Error('Invalid monster spawn');}

 random(){this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;return this.randomState/4294967296;}
 effect(sheet,cell,x,y,size=36,angle=0,duration=.24){this.effects.push({sheet,cell,x,y,size,angle,ttl:duration,duration});}
 number(text,x,y,color='#f2deaf'){this.numbers.push({text,x,y,color,ttl:.8});}
 damage(enemy,amount,from,critical=false){if(enemy.hp<=0)return;amount=Math.max(1,Math.round(amount-(enemy.armor||0)-(enemy.ward>0?4:0)));enemy.hp=Math.max(0,enemy.hp-amount);this.noise={...from,until:this.time+1};enemy.flash=.12;enemy.alert=true;this.number(`${amount}${critical?'!':''}`,enemy.x,enemy.y-32,critical?'#ffd76e':'#f2deaf');this.effect('100',critical?14:8,enemy.x,enemy.y-12,32);const angle=Math.atan2(enemy.y-from.y,enemy.x-from.x);move(this.world,enemy,Math.cos(angle)*(this.hero.id===6?18:7)*(1-(enemy.resistance||0)),Math.sin(angle)*(this.hero.id===6?18:7)*(1-(enemy.resistance||0)));if(this.hero.id===3)this.player.hp=Math.min(this.hero.hp,this.player.hp+2);if(enemy.hp===0){enemy.state='dead';this.kills++;this.player.xp+=enemy.xp;this.onDefeat?.(enemy,this.kills);this.number(`+${enemy.xp} XP`,enemy.x,enemy.y-48,'#98cce6');}}
 hurt(amount,from){const p=this.player;if(this.world.safeZone&&distance(p,this.world.safeZone)<this.world.safeZone.radius)return false;if(p.hp<=0||p.invulnerable>0)return false;const damage=Math.max(1,Math.round(amount-this.hero.defense*.5));p.hp=Math.max(0,p.hp-damage);p.invulnerable=.45;p.flash=.18;this.number(`-${damage}`,p.x,p.y-38,'#ff8273');this.effect('100',8,p.x,p.y-12);const angle=Math.atan2(p.y-from.y,p.x-from.x);move(this.world,p,Math.cos(angle)*7,Math.sin(angle)*7);return true;}
 dodge(dx,dy){const p=this.player;if(p.dodgeCooldown>0||p.hp<=0)return;const length=Math.hypot(dx,dy);p.dodgeX=length?dx/length:Math.cos(p.angle);p.dodgeY=length?dy/length:Math.sin(p.angle);p.dodge=.22;p.invulnerable=.18;p.dodgeCooldown=this.hero.id===5?.65:.9;this.effect('89',4,p.x,p.y,34);}
 attack(){const p=this.player,w=this.weapon;this.noise={x:p.x,y:p.y,until:this.time+1};if(p.hp<=0||p.cooldown>0||p.dodge>0)return;p.cooldown=w.cooldown/(1+(this.hero.haste||0));const critical=this.random()<(this.hero.crit??(this.hero.id===5?.25:.08));const damage=Math.round(this.hero.attack*(critical?1.7:1));if(w.kind==='melee'){this.effect('99',w.fx,p.x+Math.cos(p.angle)*30,p.y+Math.sin(p.angle)*30-10,w.range*1.4,p.angle);for(const e of this.enemies){const a=Math.atan2(e.y-p.y,e.x-p.x),delta=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));if(e.hp>0&&enemyHitDistance(p,e)<=w.range&&Math.abs(delta)<=w.arc&&lineClear(this.world,p,e))this.damage(e,damage,p,critical);}}else this.shoot(p,p.angle,w.kind,damage,'player',w.speed,critical);}
 shoot(from,angle,kind,damage,team,speed,critical=false,statuses=[]){this.projectiles.push({x:from.x,y:from.y,angle,kind,damage,team,speed,critical,statuses,ttl:kind==='bomb'?1.05:1.65,radius:kind==='bomb'?5:3});}
 explode(q){this.effect('100',0,q.x,q.y,90,0,.3);for(const e of this.enemies)if(e.hp>0&&enemyHitDistance(q,e)<55&&lineClear(this.world,q,e))this.damage(e,q.damage,q,q.critical);}
 // Breadth-first navigation through open cell centers; no diagonal corner cutting.
 waypoint(enemy,targetPosition=this.player){this.pathSearches=(this.pathSearches||0)+1;const w=this.world,p=targetPosition,sx=Math.floor(enemy.x/32),sy=Math.floor(enemy.y/32),tx=Math.floor(p.x/32),ty=Math.floor(p.y/32),start=sy*w.width+sx,target=ty*w.width+tx;const queue=[start],previous=new Map([[start,-1]]);for(let i=0;i<queue.length&&i<2048&&!previous.has(target);i++){const n=queue[i],x=n%w.width,y=Math.floor(n/w.width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w.width+nx;if(nx<0||ny<0||nx>=w.width||ny>=w.height||previous.has(k)||!canOccupy(w,(nx+.5)*32,(ny+.5)*32,enemy.radius))continue;previous.set(k,n);queue.push(k);}}if(!previous.has(target))return null;if(target===start)return {x:p.x,y:p.y};let n=target;while(previous.get(n)!==start&&previous.get(n)!==-1)n=previous.get(n);return {x:(n%w.width+.5)*32,y:(Math.floor(n/w.width)+.5)*32};}
 update(dt,input){this.time+=dt;const p=this.player;
  for(const key of ['cooldown','dodgeCooldown','invulnerable','flash','slow'])p[key]=Math.max(0,(p[key]||0)-dt);
  p.angle=facingAngle(input,p.angle);
  if(input.dodge)this.dodge(input.x,input.y);
  if(p.dodge>0){move(this.world,p,p.dodgeX*420*dt,p.dodgeY*420*dt);p.dodge=Math.max(0,p.dodge-dt);}else move(this.world,p,input.x*this.hero.speed*dt*(input.moveMultiplier||1)*(p.slow>0?.65:1),input.y*this.hero.speed*dt*(input.moveMultiplier||1)*(p.slow>0?.65:1));
  p.flip=flipForAim(p.angle);if(input.attack)this.attack();
  for(const e of [...this.enemies])if(e.hp>0)updateEnemy(this,e,dt,lineClear);
  // Separate living bodies without forcing either body into a wall.
  const bodies=[p,...this.enemies.filter(e=>e.hp>0&&distance(e,p)<700)];for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const a=bodies[i],b=bodies[j],d=distance(a,b);const separation=(a.radius||8)+(b.radius||8);if(d<separation){const angle=d?Math.atan2(b.y-a.y,b.x-a.x):0,push=(separation-d)/2;move(this.world,a,-Math.cos(angle)*push,-Math.sin(angle)*push);move(this.world,b,Math.cos(angle)*push,Math.sin(angle)*push);}}
  for(const q of this.projectiles){q.ttl-=dt;let ended=q.ttl<=0;const steps=Math.ceil(q.speed*dt/3);for(let i=0;i<steps&&!ended;i++){const nx=q.x+Math.cos(q.angle)*q.speed*dt/steps,ny=q.y+Math.sin(q.angle)*q.speed*dt/steps;if(!canOccupy(this.world,nx,ny,q.radius)){ended=true;break;}q.x=nx;q.y=ny;if(q.team==='enemy'){if(distance(q,p)<11){if(this.hurt(q.damage,q)&&q.statuses?.includes('slow'))p.slow=1.2;ended=true;}}else{for(const e of this.enemies)if(e.hp>0&&enemyHitDistance(q,e)<=q.radius){if(q.kind!=='bomb'){this.damage(e,q.damage,q,q.critical);if(this.hero.id===2)e.slow=1.2;}ended=true;break;}}}if(ended){q.ttl=0;if(q.kind==='bomb')this.explode(q);else this.effect('100',q.kind==='magic'?12:0,q.x,q.y,24);}}
  this.projectiles=this.projectiles.filter(q=>q.ttl>0);for(const e of this.effects)e.ttl-=dt;this.effects=this.effects.filter(e=>e.ttl>0);for(const n of this.numbers){n.ttl-=dt;n.y-=18*dt;}this.numbers=this.numbers.filter(n=>n.ttl>0);
  this.finished=this.started&&this.enemies.every(e=>e.hp<=0);
 }
}



