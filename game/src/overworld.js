import {TILE} from './world.js?v=6.0';
import {seedNumber} from './dungeon.js?v=6.0';
export const CHUNK_SIZE=64;
export function createOverworld(seed='Dunbarrow'){
 const numericSeed=seedNumber(seed);let state=numericSeed;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const jitter=()=>Math.floor(random()*13)-6,width=256,height=256;
 const terrain=new Uint8Array(width*height),solid=Array(width*height).fill(false);
 const hash=(x,y)=>{let n=Math.imul(x+numericSeed,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967296;};
 // Logical geography remains resident; nearby 64x64 presentation chunks stream independently.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,border=x<2||y<2||x>253||y>253;
  const lake=Math.sin(x*.053+numericSeed%19)+Math.cos(y*.061)+Math.sin((x+y)*.027)>2.1;
  terrain[i]=lake?2:0;solid[i]=border||lake||hash(x,y)<.075;
 }
 const definitions=[['camp','Dunbarrow Camp',128,128],['bandit','Bandit Road',76,128],['ridge','North Ridge',128,70],['grave','Grave Path',181,128],['approach','Sealed Stair Approach',128,181],['raider','The Raider Cellar',64,94],['chapel','The Bone Chapel',194,91],['underkeep','The Black Stair Underkeep',128,211]];
 const landmarks=definitions.map(([id,name,x,y])=>({id,name,tx:x+(id==='camp'?0:jitter()),ty:y+(id==='camp'?0:jitter())}));
 for(const l of landmarks){l.x=(l.tx+.5)*TILE;l.y=(l.ty+.5)*TILE;}
 const carve=(x,y,r=2)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const i=(y+dy)*width+x+dx;if(x+dx<2||x+dx>253||y+dy<2||y+dy>253)continue;terrain[i]=terrain[i]===2?3:1;solid[i]=false;}};
 const routes=[[0,1],[0,2],[0,3],[0,4],[1,5],[3,6],[4,7],[2,5],[2,6]];
 for(const [a,b] of routes){let {tx:x,ty:y}=landmarks[a];const t=landmarks[b],horizontal=random()<.5;
  const walkX=()=>{while(x!==t.tx){carve(x,y);x+=Math.sign(t.tx-x);}};
  const walkY=()=>{while(y!==t.ty){carve(x,y);y+=Math.sign(t.ty-y);}};
  if(horizontal){walkX();walkY();}else{walkY();walkX();}carve(x,y);
 }
 for(const l of landmarks){const r=l.id==='camp'?10:5;for(let y=l.ty-r;y<=l.ty+r;y++)for(let x=l.tx-r;x<=l.tx+r;x++){terrain[y*width+x]=l.id==='camp'?1:0;solid[y*width+x]=false;}}
 const camp=landmarks[0],decorations=[{tx:camp.tx-5,ty:camp.ty-4,sheet:'84',cell:0,size:80},{tx:camp.tx+4,ty:camp.ty-4,sheet:'84',cell:1,size:86},{tx:camp.tx-5,ty:camp.ty+4,sheet:'84',cell:2,size:70},{tx:camp.tx+5,ty:camp.ty+4,sheet:'96',cell:11,size:58}];
 for(const p of decorations)solid[p.ty*width+p.tx]=true;
 const enemySpawns=[];
 for(const l of landmarks.slice(1,7)){for(const [dx,dy,type] of [[-3,3,4],[3,3,0],[0,-3,1]]){const x=l.tx+dx,y=l.ty+dy;if(Math.hypot(x-camp.tx,y-camp.ty)>15){solid[y*width+x]=false;enemySpawns.push([x,y,type]);}}}
 const w={kind:'overworld',seed:String(seed),numericSeed,width,height,terrain,solid,landmarks,decorations,enemySpawns,spawn:{x:camp.x,y:camp.y},safeZone:{x:camp.x,y:camp.y,radius:10*TILE},explored:new Uint8Array(width*height),chunks:new Map(),props:[],doors:[],traps:[],chests:[],hash};
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
  const props=[];for(let ty=y*64;ty<(y+1)*64;ty++)for(let tx=x*64;tx<(x+1)*64;tx++)if(w.terrain[ty*256+tx]===0&&w.solid[ty*256+tx])props.push({tx,ty,sheet:'83',cell:w.hash(tx,ty)>.04?9:1,size:48});
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
