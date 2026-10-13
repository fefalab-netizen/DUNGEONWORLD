import {TILE} from './world.js?v=7.0';
import {seedNumber} from './dungeon.js?v=7.0';
export const CHUNK_SIZE=64;
// Four connected, unlocked expedition regions radiate from the safe central outpost.
export function expeditionBiome(x,y){const dx=x-128,dy=y-128;if(Math.hypot(dx,dy)<19)return 'outpost';if(Math.abs(dx)>Math.abs(dy))return dx<0?'volcanic':'jungle';return dy<0?'frozen':'coast';}
export function createOverworld(seed='Dunbarrow',expedition=false){
 const numericSeed=seedNumber(seed);let state=numericSeed;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const jitter=()=>Math.floor(random()*13)-6,width=256,height=256;
 const terrain=new Uint8Array(width*height),solid=Array(width*height).fill(false);
 const hash=(x,y)=>{let n=Math.imul(x+numericSeed,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;};
 // Logical geography remains resident; nearby 64x64 presentation chunks stream independently.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,border=x<2||y<2||x>253||y>253;
  const lake=Math.sin(x*.053+numericSeed%19)+Math.cos(y*.061)+Math.sin((x+y)*.027)+(.32*(hash(Math.floor(x/6),Math.floor(y/6))-.5))>2.1;
  terrain[i]=lake?2:0;solid[i]=border||lake||hash(x,y)<.075;
 }
 const definitions=expedition?
  [['camp','Expedition Outpost',128,128],['west','Volcanic Wastes',76,128],['north','Frozen Peaks',128,70],['east','Deep Jungle',181,128],['south','Drowned Coast',128,181],['highlands','Obsidian Ruins',64,94],['thicket','Ancient Jungle Shrine',194,91],['frontier','Wreckers Bay',128,211]]:
  [['camp','Dunbarrow Camp',128,128],['bandit','Bandit Road',76,128],['ridge','North Ridge',128,70],['grave','Grave Path',181,128],['approach','Sealed Stair Approach',128,181],['raider','The Raider Cellar',64,94],['chapel','The Bone Chapel',194,91],['underkeep','The Black Stair Underkeep',128,211]];
 const landmarks=definitions.map(([id,name,x,y])=>({id,name,tx:x+(id==='camp'?0:jitter()),ty:y+(id==='camp'?0:jitter())}));
 for(const l of landmarks){l.x=(l.tx+.5)*TILE;l.y=(l.ty+.5)*TILE;}
 const carve=(x,y,r=2)=>{for(let dy=-r-1;dy<=r+1;dy++)for(let dx=-r-1;dx<=r+1;dx++){const nx=x+dx,ny=y+dy;if(nx<2||nx>253||ny<2||ny>253)continue;const distance=Math.max(Math.abs(dx),Math.abs(dy)),edge=hash(nx+881,ny-319);if(distance>r&&edge<.70)continue;const i=ny*width+nx;terrain[i]=terrain[i]===2?3:1;solid[i]=false;}};
 const routes=[[0,1],[0,2],[0,3],[0,4],[1,5],[3,6],[4,7],[2,5],[2,6]];
 for(const [a,b] of routes){let {tx:x,ty:y}=landmarks[a];const t=landmarks[b];let horizontal=random()<.5;
  // Advance along the dominant axis with short seeded bends, avoiding Manhattan L-shaped highways.
  const bend=()=>{if(random()<.35){const nx=x+(random()<.5?-1:1),ny=y+(random()<.5?-1:1);if(nx>=4&&nx<=251&&ny>=4&&ny<=251){x=nx;y=ny;}}};
  let steps=0;
  while((x!==t.tx||y!==t.ty)&&steps++<1024){
   carve(x,y);
   const dx=t.tx-x,dy=t.ty-y;
   if(Math.abs(dx)>Math.abs(dy)+4||(!dy&&dx))x+=Math.sign(dx);
   else if(Math.abs(dy)>Math.abs(dx)+4||(!dx&&dy))y+=Math.sign(dy);
   else if(horizontal){x+=Math.sign(dx);horizontal=false;}
   else{y+=Math.sign(dy);horizontal=true;}
   // This only affects the road width, not the connected centerline.
   if(random()<.14)carve(x,y,3);
  }
  carve(t.tx,t.ty);
 }
 for(const l of landmarks){const r=l.id==='camp'?10:5;for(let y=l.ty-r-1;y<=l.ty+r+1;y++)for(let x=l.tx-r-1;x<=l.tx+r+1;x++){const d=Math.hypot(x-l.tx,y-l.ty),edge=r-.8+hash(x+41,y+71)*2;if(d>edge&&Math.abs(x-l.tx)>2&&Math.abs(y-l.ty)>2)continue;terrain[y*width+x]=l.id==='camp'?1:0;solid[y*width+x]=false;}}
 const camp=landmarks[0],decorations=[{tx:camp.tx-5,ty:camp.ty-4,sheet:'84',cell:0,size:80},{tx:camp.tx+4,ty:camp.ty-4,sheet:'84',cell:1,size:86},{tx:camp.tx-5,ty:camp.ty+4,sheet:'84',cell:2,size:70},{tx:camp.tx+5,ty:camp.ty+4,sheet:'96',cell:11,size:58}];
 // A single caravan at a clear roadside stop connects the two persistent overworld regions.
 const caravan={id:'caravan',name:expedition?'Caravan · Return Free':'Expedition Caravan',tx:camp.tx+8,ty:camp.ty+1};
 caravan.x=(caravan.tx+.5)*TILE;caravan.y=(caravan.ty+.5)*TILE;
 landmarks.push(caravan);
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const tx=caravan.tx+dx,ty=caravan.ty+dy,i=ty*width+tx;terrain[i]=1;solid[i]=false;}
 // Keep the caravan clear of trees, rocks, and decorative camp buildings.
 // Preserve every pre-carved route. Natural hazards never create artificial biome gates.
 if(expedition)for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){
  const i=y*width+x,b=expeditionBiome(x,y),t=terrain[i],v=hash(x+229,y-107);
  if(b==='volcanic'&&t===2){terrain[i]=4;solid[i]=true;} // Lava pools
  else if(b==='frozen'&&t===2){terrain[i]=5;solid[i]=false;} // Crossable frozen lake
  else if(b==='volcanic'&&t===0&&!solid[i]&&v>.989){terrain[i]=6;} // Scalding fissures
  else if(b==='jungle'&&t===0&&!solid[i]&&v>.990){terrain[i]=7;} // Poison mire
  else if(b==='coast'&&t===0&&!solid[i]&&v>.986){terrain[i]=8;} // Shallow tide pools
 }
 // All landmarks and their immediate approaches remain reachable and walkable.
 if(expedition)for(const l of landmarks)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const x=l.tx+dx,y=l.ty+dy;if(x<2||y<2||x>=width-2||y>=height-2)continue;
  const i=y*width+x;if([4,6,7,8].includes(terrain[i])){terrain[i]=1;solid[i]=false;}
 }
 for(const p of decorations)solid[p.ty*width+p.tx]=true;
 if(expedition){
  // Scenic, non-blocking ruins signal the frontier's history without gating routes.
  for(const [id,sheet,cell] of [
   ['highlands','104',9],['thicket','85',7],['frontier','111',2],
   ['west','104',12],['north','85',4],['east','85',6],['south','111',1]
  ]){
   const l=landmarks.find(l=>l.id===id);
   if(l)decorations.push({tx:l.tx+5,ty:l.ty-4,sheet,cell,size:52});
  }
 }
 const enemySpawns=[];
 const biomeEnemies={volcanic:['fireImp','hellhound','magmaElemental'],jungle:['sporeling','jungleStalker','fungalMage'],frozen:['frostStalker','iceWraith','frostStalker'],coast:['coastRaider','drownedWraith','coastRaider']};
 for(const l of landmarks.slice(1,7)){for(const [k,[dx,dy,type]] of [[-3,3,4],[3,3,0],[0,-3,1]].entries()){
  const x=l.tx+dx,y=l.ty+dy;if(Math.hypot(x-camp.tx,y-camp.ty)>15){solid[y*width+x]=false;terrain[y*width+x]=1;
   enemySpawns.push([x,y,expedition?biomeEnemies[expeditionBiome(x,y)]?.[k]||'coastRaider':type]);}
 }}
 const w={kind:'overworld',expedition,biomeAt:expedition?expeditionBiome:null,seed:String(seed),numericSeed,width,height,terrain,solid,landmarks,decorations,enemySpawns,spawn:{x:camp.x,y:camp.y},safeZone:{x:camp.x,y:camp.y,radius:11*TILE},explored:new Uint8Array(width*height),chunks:new Map(),props:[],doors:[],traps:[],chests:[],hash};
 const report=validateOverworld(w);if(!report.valid)throw new Error('Overworld has unreachable landmarks.');
 reveal(w,w.spawn);updateChunks(w,w.spawn);return w;
}
export function validateOverworld(w){
 const start=Math.floor(w.spawn.y/TILE)*w.width+Math.floor(w.spawn.x/TILE),seen=new Uint8Array(w.width*w.height),queue=[start];seen[start]=1;
 for(let i=0;i<queue.length;i++){const n=queue[i],x=n%w.width,y=Math.floor(n/w.width);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w.width+nx;if(nx<0||ny<0||nx>=w.width||ny>=w.height||seen[k]||w.solid[k])continue;seen[k]=1;queue.push(k);}}
 return {valid:[...w.landmarks.map(l=>[l.tx,l.ty]),...w.enemySpawns].every(([x,y])=>seen[y*w.width+x]),reachable:queue.length};
}
export function updateChunks(w,p){
 const cx=Math.floor(p.x/TILE/CHUNK_SIZE),cy=Math.floor(p.y/TILE/CHUNK_SIZE),wanted=new Set();
 for(let y=Math.max(0,cy-1);y<=Math.min(3,cy+1);y++)for(let x=Math.max(0,cx-1);x<=Math.min(3,cx+1);x++){
  const key=x+','+y;wanted.add(key);if(w.chunks.has(key))continue;
  const props=[];for(let ty=y*64;ty<(y+1)*64;ty++)for(let tx=x*64;tx<(x+1)*64;tx++)if(w.terrain[ty*256+tx]===0&&w.solid[ty*256+tx]){
   const v=w.hash(tx+73,ty-51);
   let cell=v<.30?0:v<.47?1:v<.57?2:v<.68?4:v<.79?5:v<.88?8:v<.96?9:10;
   let sheet='83',size=cell<=2?56:cell<=5?40:38;
   if(w.expedition){const biome=expeditionBiome(tx,ty);
    if(biome==='volcanic'){sheet='104';cell=[0,1,3,4,8,9,14][Math.floor(v*7)];size=cell===8?62:42;}
    else if(biome==='jungle'){sheet='83';cell=[0,0,4,5,6,12][Math.floor(v*6)];size=cell===0?64:cell===12?48:44;}
    else if(biome==='frozen'){sheet='83';cell=[1,1,8,9,10][Math.floor(v*5)];size=cell===1?54:42;}
    else if(biome==='coast'){sheet='111';cell=[0,1,3,5,9,10][Math.floor(v*6)];size=cell===1?46:34;}
   }
   props.push({tx,ty,sheet,cell,size});
  }
  props.push(...w.decorations.filter(p=>Math.floor(p.tx/64)===x&&Math.floor(p.ty/64)===y));w.chunks.set(key,{x,y,props});
 }
 for(const key of w.chunks.keys())if(!wanted.has(key))w.chunks.delete(key);
}
export function reveal(w,p){
 const x=Math.floor(p.x/TILE),y=Math.floor(p.y/TILE);if(w.revealX===x&&w.revealY===y)return;
 w.revealX=x;w.revealY=y;
 for(let dy=-11;dy<=11;dy++)for(let dx=-11;dx<=11;dx++)if(dx*dx+dy*dy<=121&&x+dx>=0&&y+dy>=0&&x+dx<w.width&&y+dy<w.height)w.explored[(y+dy)*w.width+x+dx]=1;
 updateChunks(w,p);
}
export function nearbyLandmark(w,p){return w.landmarks.find(l=>Math.hypot(l.x-p.x,l.y-p.y)<58);}
