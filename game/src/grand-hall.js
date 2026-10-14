// Grand Hall: a separate 7.5E dungeon topology, leaving classic and story generators intact.
import {hashSeed,spawnMonster} from './monsters.js?v=7.5d';
import {TILE} from './world.js?v=7.0';

const center=r=>({x:(r.cx+.5)*TILE,y:(r.cy+.5)*TILE});
const inside=(p,r)=>p.x/TILE>=r.x&&p.x/TILE<r.x+r.w&&p.y/TILE>=r.y&&p.y/TILE<r.y+r.h;
const room=(id,x,y,w,h,floorType)=>({id,x,y,w,h,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2),floorType});

export function createGrandHall(seed,level=1){
 let state=hashSeed(seed);const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const offset=Math.floor(random()*5)-2,width=156,height=106;
 const themes=['storage','collapsed','crypt'];
 const rooms=[
  room(0,6,41,13,13,'standard'),
  room(1,27,39+offset,16,17,themes[Math.floor(random()*themes.length)]),
  room(2,51,38-offset,16,19,themes[Math.floor(random()*themes.length)]),
  room(3,78,24,34,44,'boss'),
  room(4,123,31,27,31,'ritual')
 ];
 const solid=Array(width*height).fill(true);
 const carve=(x,y)=>{if(x>0&&y>0&&x<width-1&&y<height-1)solid[y*width+x]=false;};
 for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)carve(x,y);
 const corridor=(a,b)=>{
  // The room graph is deliberately linear: entrance -> two chambers -> Great Hall -> optional arena.
  const stepX=Math.sign(b.cx-a.cx),stepY=Math.sign(b.cy-a.cy);
  for(let x=a.cx;x!==b.cx+stepX;x+=stepX)for(let k=-1;k<=1;k++)carve(x,a.cy+k);
  if(stepY)for(let y=a.cy;y!==b.cy+stepY;y+=stepY)for(let k=-1;k<=1;k++)carve(b.cx+k,y);
 };
 for(let i=0;i<rooms.length-1;i++)corridor(rooms[i],rooms[i+1]);
 const hall=rooms[3],arena=rooms[4],gateX=119,gateGroup=0;
 const doors=[-1,0,1].map(dy=>({x:gateX,y:arena.cy+dy,open:false,group:gateGroup,lock:'hall'}));
 for(const d of doors)solid[d.y*width+d.x]=true;
 // Stone columns are deliberately away from the center aisle and wave spawn positions.
 const props=[];for(const x of [hall.x+7,hall.x+26])for(const y of [hall.y+8,hall.y+35]){
  props.push({x,y,sheet:'04',cell:13});solid[y*width+x]=true;
 }
 const traps=[[-7,-8],[7,-8],[-7,8],[7,8]].map(([dx,dy],i)=>({
  x:(hall.cx+dx+.5)*TILE,y:(hall.cy+dy+.5)*TILE,phase:i*.65
 }));
 const enemySpawns=[
  [rooms[1].cx-3,rooms[1].cy-3,'grunt'],[rooms[1].cx+3,rooms[1].cy+3,'archer'],
  [rooms[2].cx-3,rooms[2].cy+3,'tank'],[rooms[2].cx+3,rooms[2].cy-3,'bandit']
 ];
 return {
  kind:'dungeon',layout:'grandHall',theme:'grandHall',name:'The Grand Hall',
  seed:String(seed),numericSeed:hashSeed(seed),width,height,solid,rooms,
  edges:[[0,1],[1,2],[2,3],[3,4]],doors,props,traps,enemySpawns,
  spawn:center(rooms[0]),exit:{x:(hall.cx+1.5)*TILE,y:(hall.y+5.5)*TILE},
  key:{...center(rooms[0]),taken:true},objects:[],chests:[],ritual:{plate:false,lever:false},
  completed:false,bossDefeated:false,hasKey:false,
  // Colossal AI expects a safe-zone descriptor; the dungeon intentionally has none.
  safeZone:{x:-100000,y:-100000,radius:0},
  requiredSheets:['91'],
  hall:{roomId:3,bossRoomId:4,phase:'waiting',wave:0,delay:0,level,bossStarted:false,bossDefeated:false}
 };
}

export function grandHallAction(w,p){
 const near=(q,r=47)=>Math.hypot(q.x-p.x,q.y-p.y)<r;
 const door=w.doors.find(d=>!d.open&&near({x:(d.x+.5)*TILE,y:(d.y+.5)*TILE}));
 if(door)return {kind:'door',target:door};
 if(near(w.exit,55))return {kind:'exit',target:w.exit};
 if(near(w.spawn,55))return {kind:'entrance',target:w.spawn};
 return null;
}
export function interactGrandHall(w,p){
 const action=grandHallAction(w,p);
 if(!action)return 'Nothing nearby to interact with.';
 if(action.kind==='entrance')return 'entrance';
 if(action.kind==='exit'){
  if(w.hall.phase!=='cleared')return 'The Great Hall must be conquered before its exit will open.';
  w.completed=true;return 'complete';
 }
 if(w.hall.phase!=='cleared')return 'A great seal bars the colossus arena. Survive the Great Hall first.';
 for(const d of w.doors){d.open=true;w.solid[d.y*w.width+d.x]=false;}
 return w.hall.bossDefeated?'The empty colossus arena is open.':'The optional colossus arena opens. You can still return to the unlocked exit.';
}

const wavePositions=[
 [[-5,-6,'grunt'],[6,-6,'archer'],[0,8,'bandit'],[-8,6,'scavenger']],
 [[-8,-7,'tank','elite'],[7,-7,'archer'],[-7,8,'grunt'],[7,8,'bandit'],[0,-10,'scavenger']],
 [[-6,-10,'brute','elite'],[6,-10,'archer','elite'],[-9,0,'tank','elite'],[9,0,'bandit'],[-5,10,'grunt'],[5,10,'archer'],[0,3,'scavenger']]
];
export function updateGrandHall(w,combat,p,dt,progression,onNotice){
 const h=w.hall,hall=w.rooms[h.roomId],arena=w.rooms[h.bossRoomId];
 if(h.phase==='waiting'&&inside(p,hall)){h.phase='intermission';h.delay=1.2;onNotice('The Great Hall awakens. Three waves stand between you and the exit.');}
 if(h.phase==='intermission'&&inside(p,hall)){
  h.delay-=dt;
  if(h.delay<=0){
   h.wave++;
   for(const [dx,dy,species,tier='normal'] of wavePositions[h.wave-1]){
    const x=hall.cx+dx,y=hall.cy+dy;
    const e=spawnMonster(species,combat.nextEnemyId++,(x+.5)*TILE,(y+.5)*TILE,w.seed,tier);
    e.grandHallWave=h.wave;e.alert=true;e.detection=850;combat.enemies.push(e);
   }
   h.phase='fight';onNotice('Great Hall · Wave '+h.wave+' / 3');
  }
 }else if(h.phase==='fight'&&!combat.enemies.some(e=>e.grandHallWave===h.wave&&e.hp>0)){
  if(h.wave<3){h.phase='intermission';h.delay=2.5;onNotice('Wave '+h.wave+' defeated. The hall stirs again…');}
  else {
   h.phase='cleared';w.hasKey=true;w.traps=[];
   progression.addGold(30);progression.potions++;
   onNotice('GREAT HALL CLEARED! Exit unlocked · 30 gold and a potion. Optional colossus arena to the east.');
  }
 }
 // No boss is spawned until the player chooses to enter the optional arena.
 if(h.phase==='cleared'&&!h.bossStarted&&inside(p,arena)){
  h.bossStarted=true;
  const giant=spawnMonster('infernalJuggernaut',combat.nextEnemyId++,center(arena).x,center(arena).y,w.seed,'boss');
  giant.grandHallBoss=true;giant.name='The Hallbreaker';giant.attackColor='#ffc581';
  giant.hp=Math.round(giant.hp*(1+Math.min(4,Math.max(0,h.level-1))*.10));giant.maxHp=giant.hp;
  giant.alert=true;combat.enemies.push(giant);
  onNotice('THE HALLBREAKER AWAKENS · Optional colossal encounter!');
 }
}
