import {hashSeed,spawnMonster} from './monsters.js?v=6.0';
import {directEncounter} from './encounters.js?v=6.0';
import {canOccupy} from './world.js?v=6.0';
export function createStoryDungeon(seed,theme,level=1,progress=0){
 let rng=hashSeed(seed+theme);const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const chapel=theme==='chapel',mainCount=chapel?7:6,width=80,height=60;
 const positions=[[0,0],[1,0],[2,0],[2,1],[1,1],[0,1],...(chapel?[[0,2]]:[]),[3,0],[3,1]];
 // Required chain and optional branches are fixed before any room carving.
 const edges=Array.from({length:mainCount-1},(_,i)=>[i,i+1]);edges.push([2,mainCount],[3,mainCount+1]);
 const rooms=positions.map(([gx,gy],id)=>{const w=11+Math.floor(random()*3),h=11+Math.floor(random()*3),x=3+gx*19,y=3+gy*19;return {id,x,y,w,h,cx:x+6,cy:y+6,optional:id>=mainCount,type:id===0?'entrance':id===mainCount-1?'boss':id===mainCount-2?'objective':id>=mainCount?'treasure':chapel?['crypt','plate','ritual'][id%3]:['storage','guard post','supply'][id%3]};});
 const solid=Array(width*height).fill(true),carve=(x,y)=>solid[y*width+x]=false;
 for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)carve(x,y);
 const doors=[];
 for(const [a,b]of edges){const r=rooms[a],t=rooms[b];let x=r.cx,y=r.cy;const horizontal=r.cy===t.cy;while(x!==t.cx||y!==t.cy){for(let k=-1;k<=1;k++)carve(x+(horizontal?0:k),y+(horizontal?k:0));if(x!==t.cx)x+=Math.sign(t.cx-x);else y+=Math.sign(t.cy-y);}
  const dx=horizontal?(t.cx>r.cx?r.x+r.w:r.x-1):r.cx,dy=horizontal?r.cy:(t.cy>r.cy?r.y+r.h:r.y-1);
  const lock=b===mainCount-1?'objective':b===mainCount?'treasure':b===mainCount+1?'secret':null;
  const group=doors.length;for(let k=-1;k<=1;k++)doors.push({x:dx+(horizontal?0:k),y:dy+(horizontal?k:0),open:false,lock,group});
 }
 const center=r=>({x:(r.cx+.5)*32,y:(r.cy+.5)*32}),spawn=center(rooms[0]),bossRoom=rooms[mainCount-1],objective=center(rooms[mainCount-2]);
 const objects=[{...center(rooms[1]),kind:'lore',text:chapel?'The inscription reads: wake the stone with your weight, raise the lever, then touch the altar.':'A ledger records stolen camp supplies. The Quartermaster keeps an iron seal beneath his coat.'},{...center(rooms[2]),kind:chapel?'plate':'supply',active:false}];
 if(chapel)objects.push({...center(rooms[3]),kind:'lever',active:false});
 const w={kind:'dungeon',theme,name:chapel?'The Bone Chapel':'The Raider Cellar',seed:String(seed),numericSeed:hashSeed(seed),width,height,solid,rooms,edges,mainCount,doors,props:[],objects,spawn,exit:{...center(bossRoom),y:center(bossRoom).y+96},key:{...objective,taken:false},hasKey:false,completed:false,bossDefeated:false,treasureKey:false,ritual:{plate:false,lever:false},chests:[],traps:[],enemySpawns:[],revealedRooms:new Set([0]),requiredSheets:chapel?['66','67','68','69','70']:[]};
 for(const r of rooms.slice(1)){
  if(r.type==='boss')w.enemySpawns.push([r.cx,r.cy,chapel?'keeper':'quartermaster','boss']);
  else w.enemySpawns.push(...directEncounter(w,r,level,progress));
  if(r.optional||r.id===1)w.chests.push({...center(r),x:center(r).x+64,open:false,rare:r.optional});
  if((chapel&&r.id===3)||(!chapel&&r.id===3&&random()<.5))w.traps.push({x:center(r).x,y:center(r).y+64,phase:random()*3});
  if(r.id!==mainCount-1)w.props.push({x:r.x+1,y:r.y+1,cell:chapel?9:2,sheet:chapel?'70':'03'});
 }
 for(const d of doors)solid[d.y*width+d.x]=true;
 return w;
}
export function storyAction(w,p){
 const near=q=>Math.hypot(q.x-p.x,q.y-p.y)<44;
 const door=w.doors.find(d=>!d.open&&near({x:(d.x+.5)*32,y:(d.y+.5)*32}));if(door)return {kind:door.lock==='secret'?'break':door.lock==='treasure'?'locked door':'door',target:door};
 const object=w.objects.find(o=>near(o));if(object)return {kind:object.kind,target:object};
 if(!w.key.taken&&near(w.key))return {kind:w.theme==='chapel'?'altar':'key',target:w.key};
 const chest=w.chests.find(o=>!o.open&&near(o));if(chest)return {kind:'chest',target:chest};
 if(near(w.exit))return {kind:'exit',target:w.exit};if(near(w.spawn))return {kind:'entrance',target:w.spawn};return null;
}
export function interactStory(w,p,pr,quests){
 const a=storyAction(w,p);if(!a)return 'Nothing nearby to interact with.';const t=a.target;
 if(['door','break','locked door'].includes(a.kind)){
  if(t.lock==='objective'&&!w.hasKey)return w.theme==='chapel'?'The altar must be awakened first. Read the inscription.':'Find the guard key in the supply chamber first.';
  if(t.lock==='treasure'&&!w.treasureKey)return 'Locked treasury. Search the supply cache in the third chamber.';
  for(const d of w.doors.filter(d=>d.group===t.group)){d.open=true;w.solid[d.y*w.width+d.x]=false;}
  if(t.lock==='secret'){quests.lore.add('A hidden passage behind crumbling masonry.');return 'Brittle barricade broken. A guarded cache lies beyond.';}return 'Door opened.';
 }
 if(a.kind==='lore'){quests.lore.add(t.text);return t.text;}
 if(a.kind==='supply'){w.treasureKey=true;t.active=true;return 'Found a brass treasury key among the stolen supplies.';}
 if(a.kind==='plate'){w.ritual.plate=true;t.active=true;return 'The pressure plate holds. Now raise the ritual lever.';}
 if(a.kind==='lever'){if(!w.ritual.plate)return 'The lever falls back. Wake the pressure plate first.';w.ritual.lever=true;w.treasureKey=true;t.active=true;return 'The lever catches and releases the side treasury lock. Touch the altar in the next chamber.';}
 if(a.kind==='altar'&&!w.ritual.lever)return 'The altar sleeps. Plate, lever, altar: the inscription describes the rite.';
 if(a.kind==='altar'||a.kind==='key'){w.key.taken=true;w.hasKey=true;return w.theme==='chapel'?'The ritual gate opens to your touch. The Chapel Keeper awaits.':'Guard key acquired. The Quartermaster’s chamber can now be opened.';}
 if(a.kind==='chest'){t.open=true;const item=pr.makeItem('weapon',true);if(t.rare){item.rarity=2;item.name='Rare Cache '+item.name.replace('Uncommon ','');item.stats.attack+=4;}pr.items.push(item);pr.gold+=t.rare?40:20;pr.potions++;return `Found ${item.name}, gold and a potion.`;}
 if(a.kind==='entrance')return 'entrance';
 if(!w.bossDefeated)return 'Defeat the chamber guardian to claim the artifact and open the exit.';
 w.completed=true;return 'complete';
}
export function validateStoryDungeon(w){
 const errors=[],open={...w,solid:[...w.solid]};for(const d of w.doors)open.solid[d.y*w.width+d.x]=false;
 const flood=(map,radius=8)=>{const start=Math.floor(w.spawn.y/32)*w.width+Math.floor(w.spawn.x/32),seen=new Set([start]),q=[start];for(let i=0;i<q.length;i++){const n=q[i],x=n%w.width,y=Math.floor(n/w.width);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w.width+nx;if(!seen.has(k)&&canOccupy(map,(nx+.5)*32,(ny+.5)*32,radius)){seen.add(k);q.push(k);}}}return seen;};
 const seen=flood(open,14),cell=p=>Math.floor(p.y/32)*w.width+Math.floor(p.x/32);
 for(const p of [w.key,w.exit,...w.objects,...w.chests])if(!seen.has(cell(p)))errors.push('Unreachable objective');
 w.enemySpawns.forEach(([x,y,id,tier],i)=>{const e=spawnMonster(id,i,(x+.5)*32,(y+.5)*32,w.seed,tier);if(!canOccupy(w,e.x,e.y,e.radius)||!seen.has(cell(e)))errors.push('Invalid enemy clearance');});
 // Required route must work while every optional door remains closed.
 const required={...open,solid:[...open.solid]};for(const d of w.doors)if(['secret','treasure'].includes(d.lock))required.solid[d.y*w.width+d.x]=true;
 const reachable=flood(required);for(const p of [w.key,w.exit,...w.objects])if(!reachable.has(cell(p)))errors.push('Optional branch blocks progression');
 const before={...required,solid:[...required.solid]};for(const d of w.doors)if(d.lock==='objective')before.solid[d.y*w.width+d.x]=true;
 const initial=flood(before);if(!initial.has(cell(w.key))||initial.has(cell(w.exit)))errors.push('Invalid progression gate');
 return {valid:!errors.length,errors};
}
