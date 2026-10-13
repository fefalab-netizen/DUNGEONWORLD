// Independent ambient wildlife and optional colossal boss behaviors.
// These creatures never alter Dunbarrow's campaign quest flags.
import {move,canOccupy} from './world.js?v=7.0';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const walk=(world,e,target,dt,speed)=>{if(!target)return;
 const angle=Math.atan2(target.y-e.y,target.x-e.x),x=e.x,y=e.y;
 e.angle=angle;move(world,e,Math.cos(angle)*speed*dt,Math.sin(angle)*speed*dt);
 if(Math.hypot(e.x-x,e.y-y)<speed*dt*.05)e.roamTimer=0;
};
const seededDirection=(e,time)=>((e.id*2.399963+Math.floor(time/4)*1.618033)%6.28318);
const wander=(c,e,dt,radius=100)=>{
 e.roamTimer=(e.roamTimer||0)-dt;
 if(e.roamTimer<=0){
  const angle=seededDirection(e,c.time);
  const t={x:e.post.x+Math.cos(angle)*radius,y:e.post.y+Math.sin(angle)*radius};
  e.roamTarget=canOccupy(c.world,t.x,t.y,e.radius)?t:{...e.post};
  e.roamTimer=3+(e.id%4);
 }
 if(distance(e,e.roamTarget||e.post)>9)walk(c.world,e,e.roamTarget,dt,e.speed*.28);
};
export function updateWildlife(c,e,dt,clear){
 const p=c.player,d=distance(e,p),w=c.world;
 for(const k of ['cooldown','flash','slow'])e[k]=Math.max(0,(e[k]||0)-dt);
 if(d>600){e.state='idle';return;}
 const safe=d>0&&distance(p,w.safeZone)<w.safeZone.radius;
 const attacked=e.alert;
 if(e.behavior==='flee'&&(d<125||attacked)){
  e.state='flee';const a=Math.atan2(e.y-p.y,e.x-p.x);
  const t={x:e.x+Math.cos(a)*110,y:e.y+Math.sin(a)*110};
  walk(w,e,t,dt,e.speed*1.35);if(d>270)e.alert=false;return;
 }
 if(e.behavior==='passive'&&!attacked){e.state='graze';wander(c,e,dt,65);return;}
 const provoked=attacked||(e.behavior==='predator'&&d<200)||(e.behavior==='territorial'&&d<77);
 if(!provoked||safe){e.state='wander';wander(c,e,dt,80);return;}
 if(d>310){e.alert=false;e.state='return';wander(c,e,dt,60);return;}
 e.state='hunt';
 if(d<e.range+14&&clear(w,e,p)&&e.cooldown===0){
  c.hurt(e.damage,e);e.cooldown=1.4/e.attackSpeed;
 }else if(d>e.range+7)walk(w,e,p,dt,e.speed*(e.slow>0?.5:1));
}
// Slow, readable wind-up; four distinct colossal strikes, all dodgeable.
// The impact target is fixed when telegraphed, not aimed at the player afterwards.
export function updateColossal(c,e,dt,clear){
 const p=c.player,w=c.world,d=distance(e,p);
 for(const k of ['cooldown','flash','slow'])e[k]=Math.max(0,(e[k]||0)-dt);
 if(d>700){e.state='idle';return;}
 if(distance(p,w.safeZone)<w.safeZone.radius){e.state='patrol';e.alert=false;e.telegraph=null;wander(c,e,dt,130);return;}
 if(!e.alert&&d>e.detection){e.state='roaming';wander(c,e,dt,165);return;}
 e.alert=true;
 if(d>640){e.alert=false;e.telegraph=null;e.state='roaming';return;}
 if(e.telegraph){
  e.telegraph.time-=dt;e.state='windup';
  if(e.telegraph.time>0)return;
  const t=e.telegraph;e.telegraph=null;e.state='recover';e.cooldown=3.8;
  if(t.type==='line'){
   const ax=t.end.x-t.origin.x,ay=t.end.y-t.origin.y,len=Math.hypot(ax,ay)||1;
   const px=p.x-t.origin.x,py=p.y-t.origin.y,projection=(px*ax+py*ay)/len;
   const perpendicular=Math.abs(px*ay-py*ax)/len;
   if(projection>0&&projection<len&&perpendicular<34&&clear(w,e,p))c.hurt(e.damage*1.4,e);
  }else if(distance(p,t.target)<t.radius&&clear(w,e,p))c.hurt(e.damage*(t.type==='slam'?1.5:1.1),e);
  c.effect('100',t.type==='line'?8:0,t.target.x,t.target.y,t.radius*2,0,.35);
  return;
 }
 if(e.cooldown>0){e.state='recover';return;}
 if(d<250&&clear(w,e,p)){
  const line=e.species==='infernalJuggernaut'||e.species==='drownedAdmiral';
  const type=line?'line':e.species==='frostfangTyrant'?'slam':'roots';
  const target={x:p.x,y:p.y},origin={x:e.x,y:e.y};
  const angle=Math.atan2(p.y-e.y,p.x-e.x);
  const end={x:origin.x+Math.cos(angle)*265,y:origin.y+Math.sin(angle)*265};
  e.telegraph={type,target,origin,end,radius:type==='slam'?74:63,time:type==='slam'?1.75:2.05,total:type==='slam'?1.75:2.05};
  e.state='windup';e.angle=angle;return;
 }
 e.state='stalking';
 if(d>100)walk(w,e,p,dt,e.speed*(e.slow>0?.5:1));
}
