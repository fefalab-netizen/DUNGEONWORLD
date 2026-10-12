import {TILE} from './world.js?v=6.0';

export function seedNumber(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function createDungeon(seed='Dunbarrow'){
 const numericSeed=seedNumber(seed);let state=numericSeed;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const pick=n=>Math.floor(random()*n),width=56,height=56;
 // A spanning graph defines progression before room geometry is assigned.
 const edges=[],visited=new Set([0]),queue=[0];
 while(queue.length){const a=queue[queue.length-1],x=a%3,y=Math.floor(a/3);
  const options=[x>0?a-1:-1,x<2?a+1:-1,y>0?a-3:-1,y<2?a+3:-1].filter(b=>b>=0&&!visited.has(b));
  if(!options.length){queue.pop();continue;}const b=options[pick(options.length)];edges.push([a,b]);visited.add(b);queue.push(b);
 }
 const extras=[];for(let a=0;a<9;a++)for(const b of [a%3<2?a+1:-1,a<6?a+3:-1])if(b>=0&&!edges.some(e=>e.includes(a)&&e.includes(b)))extras.push([a,b]);
 edges.push(extras[pick(extras.length)]);
 const rooms=Array.from({length:9},(_,id)=>{const w=8+pick(4),h=8+pick(4),x=3+(id%3)*18+pick(3),y=3+Math.floor(id/3)*18+pick(3);return {id,x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)};});
 const solid=Array(width*height).fill(true),floor=(x,y)=>solid[y*width+x]=false;
 for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)floor(x,y);
 const doors=[];
 for(const [a,b] of edges){const r=rooms[a],t=rooms[b];let x=r.cx,y=r.cy;
  // Horizontal neighbors bend in the gap; vertical neighbors do likewise.
  if(a%3!==b%3){const mid=Math.floor((r.cx+t.cx)/2);while(x!==mid){floor(x,y);x+=Math.sign(mid-x);}while(y!==t.cy){floor(x,y);y+=Math.sign(t.cy-y);}while(x!==t.cx){floor(x,y);x+=Math.sign(t.cx-x);}}
  else {const mid=Math.floor((r.cy+t.cy)/2);while(y!==mid){floor(x,y);y+=Math.sign(mid-y);}while(x!==t.cx){floor(x,y);x+=Math.sign(t.cx-x);}while(y!==t.cy){floor(x,y);y+=Math.sign(t.cy-y);}}
  floor(x,y);
  const horizontal=a%3!==b%3,dx=horizontal?(t.cx>r.cx?r.x+r.w:r.x-1):r.cx,dy=horizontal?r.cy:(t.cy>r.cy?r.y+r.h:r.y-1);
  doors.push({x:dx,y:dy,open:false});
 }
 const center=r=>({x:(r.cx+.5)*TILE,y:(r.cy+.5)*TILE});
 const spawn=center(rooms[0]),exit=center(rooms[8]),key={...center(rooms[4]),taken:false};
 const chests=[1,3,5,7].map(id=>({x:(rooms[id].cx-2+.5)*TILE,y:(rooms[id].cy+.5)*TILE,open:false}));
 const traps=[2,3,5,6,7,8].map(id=>({x:(rooms[id].cx+.5)*TILE,y:(rooms[id].cy+2+.5)*TILE,phase:random()*3}));
 const enemySpawns=rooms.slice(1).flatMap(r=>[[r.cx+2,r.cy-2,pick(6)],[r.cx-2,r.cy-2,pick(6)]]);
 const world={seed:String(seed),numericSeed,width,height,solid,props:[],rooms,edges,doors,chests,traps,enemySpawns,spawn,exit,key,hasKey:false,completed:false};
 // Doors are traversable in validation because every one can be opened without a key.
 for(const d of doors)solid[d.y*width+d.x]=true;
 const report=validateDungeon(world);if(!report.valid)throw new Error('Invalid dungeon: '+report.errors.join(', '));
 return world;
}
export function validateDungeon(w){
 const errors=[],doorCells=new Set(w.doors.map(d=>d.y*w.width+d.x));
 const start=Math.floor(w.spawn.y/TILE)*w.width+Math.floor(w.spawn.x/TILE),seen=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%w.width,y=Math.floor(n/w.width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w.width+nx;if(nx<0||ny<0||nx>=w.width||ny>=w.height||seen.has(k)||(w.solid[k]&&!doorCells.has(k)))continue;seen.add(k);queue.push(k);}}
 const reachable=p=>seen.has(Math.floor(p.y/TILE)*w.width+Math.floor(p.x/TILE));
 for(const p of [w.spawn,w.exit,w.key,...w.chests,...w.traps,...w.enemySpawns.map(([x,y])=>({x:(x+.5)*TILE,y:(y+.5)*TILE}))])if(!reachable(p))errors.push('unreachable objective or actor');
 for(let i=0;i<w.solid.length;i++)if(!w.solid[i]&&!seen.has(i))errors.push('isolated floor');
 for(let x=0;x<w.width;x++)if(!w.solid[x]||!w.solid[(w.height-1)*w.width+x])errors.push('open boundary');
 return {valid:!errors.length,errors,reachable:seen.size};
}
export function nearbyInteraction(w,p){
 const near=(q,r=44)=>Math.hypot(q.x-p.x,q.y-p.y)<r;
 const door=w.doors.find(d=>!d.open&&near({x:(d.x+.5)*TILE,y:(d.y+.5)*TILE}));
 if(door)return {kind:'door',target:door};
 if(!w.key.taken&&near(w.key))return {kind:'key',target:w.key};
 const chest=w.chests.find(c=>!c.open&&near(c));if(chest)return {kind:'chest',target:chest};
 if(near(w.exit))return {kind:'exit',target:w.exit};
 if(near(w.spawn))return {kind:'entrance',target:w.spawn};
 return null;
}
export function interactDungeon(w,p,progression,cleared){
 const action=nearbyInteraction(w,p);if(!action)return 'Nothing nearby to interact with.';
 const {kind,target}=action;
 if(kind==='door'){target.open=true;w.solid[target.y*w.width+target.x]=false;return 'Door opened.';}
 if(kind==='key'){target.taken=true;w.hasKey=true;return 'Found the exit key.';}
 if(kind==='chest'){target.open=true;const item=progression.makeItem('weapon',true);progression.items.push(item);progression.gold+=20;progression.potions++;return `Chest: ${item.name}, 20 gold and a potion. Press I to equip.`;}
 if(kind==='entrance')return 'entrance';
 if(!w.hasKey)return 'The exit is sealed. Find the golden key.';
 if(!cleared)return 'Clear the remaining enemies to unseal the exit.';
 w.completed=true;return 'complete';
}
export function trapActive(trap,time){return (time+trap.phase)%3>1.9;}
