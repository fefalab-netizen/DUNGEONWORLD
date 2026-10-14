// Milestone 7.5E: two independent legendary dungeon layouts.
// Uses the same room, tile, spawn and collision contracts as the approved dungeons.
import {hashSeed} from './monsters.js?v=7.5d';
import {TILE} from './world.js?v=7.0';

const center=r=>({x:(r.cx+.5)*TILE,y:(r.cy+.5)*TILE});
const rectangle=(id,x,y,w,h,floorType)=>({id,x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2),floorType});
const rngFor=seed=>{let value=hashSeed(seed);return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};};
const shuffle=(values,random)=>{for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;};
const point=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
const floorCarver=(width,height)=>{
 const solid=Array(width*height).fill(true);
 const carve=(x,y)=>{if(x>0&&y>0&&x<width-1&&y<height-1)solid[y*width+x]=false;};
 const room=r=>{for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)carve(x,y);};
 // Three-tile corridors keep the existing real-time dodge and enemy movement usable.
 const path=(a,b,horizontalFirst=true)=>{
  const line=(x1,y1,x2,y2)=>{
   const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);
   if(dx)for(let x=x1;x!==x2+dx;x+=dx)for(let k=-1;k<=1;k++)carve(x,y1+k);
   else if(dy)for(let y=y1;y!==y2+dy;y+=dy)for(let k=-1;k<=1;k++)carve(x1+k,y);
  };
  if(horizontalFirst){line(a.cx,a.cy,b.cx,a.cy);line(b.cx,a.cy,b.cx,b.cy);}
  else{line(a.cx,a.cy,a.cx,b.cy);line(a.cx,b.cy,b.cx,b.cy);}
 };
 return {solid,room,path};
};
const common=(layout,seed,width,height,solid,rooms,edges,enemySpawns,extra)=>({
 kind:'dungeon',theme:'legendary',layout,
 name:layout==='labyrinth'?'The Whispering Labyrinth':'The Three Wings',
 seed:String(seed),numericSeed:hashSeed(seed),width,height,solid,rooms,edges,
 enemySpawns,doors:[],props:[],traps:[],chests:[],objects:[],
 spawn:center(rooms[0]),exit:center(rooms[extra.exitRoomId]),
 key:{...center(rooms[0]),taken:true},hasKey:false,completed:false,bossDefeated:false,
 requiredSheets:[],legendary:extra
});

// A connectivity guard is part of generation, not a separate test run.
export function validateLegendaryDungeon(w){
 const seen=new Uint8Array(w.width*w.height),sx=Math.floor(w.spawn.x/TILE),sy=Math.floor(w.spawn.y/TILE),start=sy*w.width+sx;
 const queue=[start];seen[start]=1;
 for(let i=0;i<queue.length;i++){
  const n=queue[i],x=n%w.width,y=Math.floor(n/w.width);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;
   if(nx<0||ny<0||nx>=w.width||ny>=w.height)continue;
   const k=ny*w.width+nx;if(!seen[k]&&!w.solid[k]){seen[k]=1;queue.push(k);}
  }
 }
 const reachable=p=>{const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE);return x>=0&&y>=0&&x<w.width&&y<w.height&&!!seen[y*w.width+x];};
 return reachable(w.exit)&&reachable(w.key)&&w.chests.every(reachable)&&
  (w.legendary.wings||[]).every(wing=>reachable(wing))&&
  w.enemySpawns.every(([x,y])=>reachable(point(x,y)));
}

export function createLabyrinth(seed,level=1){
 const random=rngFor(seed+':labyrinth'),columns=7,rows=5,width=99,height=72;
 const {solid,room,path}=floorCarver(width,height);
 const rooms=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const id=y*columns+x,w=6+Math.floor(random()*3),h=6+Math.floor(random()*3);
  const floorType=['standard','standard','crypt','collapsed','storage','ritual'][Math.floor(random()*6)];
  const r=rectangle(id,5+x*13,5+y*12,w,h,floorType);rooms.push(r);room(r);
 }
 const visited=new Set([0]),stack=[0],edges=[];
 const neighbors=id=>{
  const x=id%columns,y=Math.floor(id/columns);
  return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
   .filter(([nx,ny])=>nx>=0&&nx<columns&&ny>=0&&ny<rows)
   .map(([nx,ny])=>ny*columns+nx);
 };
 while(stack.length){
  const a=stack[stack.length-1],choices=neighbors(a).filter(n=>!visited.has(n));
  if(!choices.length){stack.pop();continue;}
  const b=choices[Math.floor(random()*choices.length)];visited.add(b);stack.push(b);
  edges.push([a,b]);path(rooms[a],rooms[b],random()<.5);
 }
 // A handful of extra links makes the maze navigable in more than one way.
 const edgeKey=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
 const used=new Set(edges.map(([a,b])=>edgeKey(a,b)));
 const options=[];
 for(let id=0;id<rooms.length;id++)for(const n of neighbors(id))if(n>id&&!used.has(edgeKey(id,n)))options.push([id,n]);
 shuffle(options,random);
 for(const [a,b] of options.slice(0,5)){edges.push([a,b]);path(rooms[a],rooms[b],random()<.5);}
 const adjacency=Array.from({length:rooms.length},()=>[]);
 for(const [a,b] of edges){adjacency[a].push(b);adjacency[b].push(a);}
 const distances=Array(rooms.length).fill(-1),queue=[0];distances[0]=0;
 for(let i=0;i<queue.length;i++)for(const b of adjacency[queue[i]])if(distances[b]===-1){distances[b]=distances[queue[i]]+1;queue.push(b);}
 const far=rooms.map(r=>r.id).sort((a,b)=>distances[b]-distances[a]);
 const exitRoomId=far[0],keyRoomId=far.find(id=>id!==exitRoomId&&id!==0);
 rooms[0].floorType='standard';rooms[exitRoomId].floorType='boss';rooms[keyRoomId].floorType='ritual';
 const enemySpawns=[];
 for(const r of rooms){
  if(r.id===0||r.id===exitRoomId||r.id===keyRoomId||random()>.47)continue;
  const species=['grunt','scavenger','bandit','archer','tank'][Math.floor(random()*5)];
  enemySpawns.push([r.cx,r.cy,species,random()<.22?'elite':'normal']);
 }
 const guardIndex=enemySpawns.length,guardian=rooms[exitRoomId];
 enemySpawns.push([guardian.cx,guardian.cy,'brute','elite']);
 enemySpawns.push([guardian.cx-2,guardian.cy-2,'archer','normal']);
 const w=common('labyrinth',seed,width,height,solid,rooms,edges,enemySpawns,{
  exitRoomId,keyRoomId,guardIndex,level,rewarded:false
 });
 w.key={...center(rooms[keyRoomId]),taken:false};w.exit={...center(guardian),x:(guardian.cx+2+.5)*TILE};
 const deadEnds=rooms.filter(r=>r.id!==0&&r.id!==exitRoomId&&r.id!==keyRoomId&&adjacency[r.id].length===1);
 shuffle(deadEnds,random);
 for(const r of deadEnds.slice(0,3))w.chests.push({...center(r),x:(r.cx+2+.5)*TILE,open:false,rare:false});
 if(!validateLegendaryDungeon(w))throw new Error('Legendary Labyrinth failed reachability generation.');
 return w;
}

export function createThreeWings(seed,level=1){
 const random=rngFor(seed+':wings'),width=132,height=112;
 const {solid,room,path}=floorCarver(width,height);
 const rooms=[
  rectangle(0,52,45,19,17,'standard'),     // Hub
  rectangle(1,51,24,21,13,'crypt'),        // North passage
  rectangle(2,51,5,21,13,'ritual'),        // North seal
  rectangle(3,31,46,13,15,'collapsed'),   // West passage
  rectangle(4,8,43,16,21,'storage'),       // West seal
  rectangle(5,80,46,13,15,'storage'),      // East passage
  rectangle(6,102,43,19,21,'crypt'),       // East seal
  rectangle(7,52,83,19,15,'boss')         // Exit hall
 ];
 const wingFloorOptions=[['crypt','ritual'],['collapsed','storage'],['storage','crypt']];
 for(let i=0;i<3;i++){
  const [a,b]=wingFloorOptions[i];
  const first=1+i*2,second=2+i*2;
  if(random()<.5){rooms[first].floorType=b;rooms[second].floorType=a;}
 }
 for(const r of rooms)room(r);
 const edges=[[0,1],[1,2],[0,3],[3,4],[0,5],[5,6],[0,7]];
 for(const [a,b] of edges)path(rooms[a],rooms[b],random()<.5);
 const wingNames=['Northern Crypt','Western Armory','Eastern Sanctum'];
 const wingColors=[0,1,2],guardSpecies=['shaman','brute','cult'];
 const enemySpawns=[],wings=[];
 for(let i=0;i<3;i++){
  const outer=rooms[2+i*2],inner=rooms[1+i*2];
  enemySpawns.push([inner.cx,inner.cy,i===0?'bone':i===1?'bandit':'cult','normal']);
  enemySpawns.push([inner.cx+3,inner.cy-2,i===0?'cult':i===1?'scavenger':'archer','normal']);
  const guardIndex=enemySpawns.length;
  enemySpawns.push([outer.cx-2,outer.cy-2,guardSpecies[i],'elite']);
  enemySpawns.push([outer.cx+3,outer.cy+2,i===0?'bone':i===1?'tank':'archer','normal']);
  enemySpawns.push([outer.cx+2,outer.cy-3,i===0?'cult':i===1?'bandit':'bone','normal']);
  wings.push({...point(outer.cx+1,outer.cy),name:wingNames[i],cell:wingColors[i],roomId:outer.id,guardIndex,claimed:false});
 }
 const w=common('threeWings',seed,width,height,solid,rooms,edges,enemySpawns,{
  exitRoomId:7,wings,seals:0,level,rewarded:false
 });
 w.exit={...center(rooms[7]),y:(rooms[7].cy+1.5)*TILE};
 // Decorative pillars create a clear central hub without closing any exits.
 for(const [x,y] of [[55,48],[67,48],[55,58],[67,58]]){
  w.props.push({x,y,sheet:'04',cell:13});w.solid[y*width+x]=true;
 }
 w.traps=[{x:(rooms[1].cx+3.5)*TILE,y:(rooms[1].cy+1.5)*TILE,phase:.4},
  {x:(rooms[5].cx-3.5)*TILE,y:(rooms[5].cy+1.5)*TILE,phase:1.7}];
 if(!validateLegendaryDungeon(w))throw new Error('Three Wings failed reachability generation.');
 return w;
}

export function createLegendaryDungeon(layout,seed,level=1){
 if(layout==='labyrinth')return createLabyrinth(seed,level);
 if(layout==='threeWings')return createThreeWings(seed,level);
 throw new Error('Unknown legendary dungeon layout: '+layout);
}
const near=(p,q,range=48)=>Math.hypot(p.x-q.x,p.y-q.y)<range;
export function legendaryAction(w,p){
 if(w.layout==='labyrinth'&&!w.key.taken&&near(p,w.key))return {kind:'key',target:w.key};
 if(w.layout==='threeWings'){
  const wing=w.legendary.wings.find(s=>!s.claimed&&near(p,s));
  if(wing)return {kind:'wingSeal',target:wing};
 }
 const chest=w.chests.find(c=>!c.open&&near(p,c));if(chest)return {kind:'chest',target:chest};
 if(near(p,w.exit,55))return {kind:'exit',target:w.exit};
 if(near(p,w.spawn,55))return {kind:'entrance',target:w.spawn};
 return null;
}
export function legendaryObjective(w,combat){
 if(w.layout==='labyrinth'){
  const guard= combat.enemies[w.legendary.guardIndex];
  return !w.key.taken?'Find the Wayfinder Sigil in the Labyrinth':
    guard?.hp>0?'Reach the far chamber and defeat its guardian':'Sigil recovered · Find the exit';
 }
 if(w.legendary.seals<3)return 'Three Wings · Recover seals '+w.legendary.seals+' / 3';
 return 'All three seals recovered · Exit unlocked';
}
export function interactLegendary(w,p,combat,progression){
 const action=legendaryAction(w,p);if(!action)return 'Nothing nearby to interact with.';
 if(action.kind==='entrance')return 'entrance';
 if(action.kind==='key'){w.key.taken=true;w.hasKey=true;return 'Wayfinder Sigil recovered. Seek the guardian at the far end of the maze.';}
 if(action.kind==='wingSeal'){
  const wing=action.target,guard=combat.enemies[wing.guardIndex];
  if(guard?.hp>0)return wing.name+': the guardian must be defeated before the seal can be claimed.';
  wing.claimed=true;w.legendary.seals++;
  if(w.legendary.seals===3){w.hasKey=true;return 'THREE WINGS COMPLETE! All seals recovered. The southern exit is now open.';}
  return wing.name+' secured · '+w.legendary.seals+' / 3 seals. Choose your next wing.';
 }
 if(action.kind==='chest'){
  const chest=action.target;chest.open=true;progression.addGold(12);progression.potions++;
  return 'Hidden labyrinth cache: 12 gold and a potion.';
 }
 if(w.layout==='labyrinth'){
  if(!w.hasKey)return 'The labyrinth exit requires the Wayfinder Sigil.';
  if(combat.enemies[w.legendary.guardIndex]?.hp>0)return 'The maze guardian still holds the exit.';
 }else if(w.legendary.seals!==3)return 'Three wing seals are required to unlock the exit.';
 if(!w.legendary.rewarded){
  const wings=w.layout==='threeWings';
  const item=progression.makeItem(wings?'armor':'trinket',true);
  item.rarity=wings?3:2;
  item.name=wings?'Triune Ward':'Wayfinder’s Covenant';
  if(wings)item.stats={defense:Math.max(9,(progression.equipment.armor?.stats.defense||0)+3),hp:32};
  else item.stats={crit:.09,haste:.12};
  progression.items.push(item);progression.addGold(wings?55:35);
  w.legendary.rewarded=true;w.completed=true;
  return {kind:'complete',text:w.name+' conquered! '+item.name+' and '+(wings?55:35)+' gold awarded.'};
 }
 w.completed=true;return {kind:'complete',text:w.name+' already cleared. Returning to the expedition outpost.'};
}
