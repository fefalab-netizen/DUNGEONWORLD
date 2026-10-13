import {createStoryDungeon,storyAction,interactStory} from './story-dungeon.js?v=7.0';
import {hashSeed} from './monsters.js?v=7.0';

export const floorNames=['Gate Halls','Broken Barracks','Sealed Sanctum'];
export const underkeepSheets=['64','66','67','68','69','70'];
const center=r=>({x:(r.cx+.5)*32,y:(r.cy+.5)*32});
export function createUnderkeep(seed,depth){
 // Retain the established three-wide corridors, optional branches and gated spine.
 const w=createStoryDungeon(`${seed}:underkeep:${depth}`,depth===2?'chapel':'raider',4,2);
 w.theme='underkeep';w.depth=depth;w.name=`Black Stair ${depth} / 3 · ${floorNames[depth-1]}`;
 w.floorSheet=depth===3?'68':'05';w.wallSheet=depth===3?'69':'04';w.requiredSheets=underkeepSheets;
 w.key.taken=false;w.hasKey=false;w.objects=[];w.traps=[];w.props=[];
 const objective=w.rooms[w.mainCount-2],arena=w.rooms[w.mainCount-1];
 w.arena={left:arena.x*32,top:arena.y*32,right:(arena.x+arena.w)*32,bottom:(arena.y+arena.h)*32,...center(arena)};
 w.objects.push({...center(w.rooms[1]),kind:'lore',text:[
  'The gate ledger ends mid-sentence. Someone scratched beneath it: We were not guarding treasure. We were keeping the doors shut.',
  'A captain’s last order: Pull the brass lever before approaching the lower gate. Leave the wounded here. Do not answer the singing.',
  'There are other prisons. Other Hearts. The Herald is a jailer that has forgotten which side of the bars it belongs on.',
 ][depth-1]});
 w.objects.push({...center(w.rooms[2]),kind:'supply',active:false});
 if(depth===2){w.key.taken=true;w.objects.push({...center(objective),kind:'lever',active:false,gateLever:true});}
 w.enemySpawns=[];
 const pools=depth===1?['grunt','archer','bandit','scavenger']:depth===2?['tank','brute','shaman','cult']:['cult','shaman','summoner','bone'];
 for(const r of w.rooms.slice(1)){
  if(depth===3&&r===arena){w.enemySpawns.push([r.cx,r.cy,'herald','boss']);continue;}
  const count=r.optional?2:depth===1?2:3;
  const roll=hashSeed(`${w.seed}:${r.id}`),positions=[[-3,-2],[3,-2],[0,3]];
  for(let i=0;i<count;i++){
   const species=i===0?pools[0]:pools[(roll+i)%pools.length];
   const tier=(r.optional&&i===0)||(depth>1&&r.id===3&&i===0)?'elite':'normal';
   w.enemySpawns.push([r.cx+positions[i][0],r.cy+positions[i][1],species,tier]);
  }
  // Pillars leave the center aisle and all spawn/interaction positions clear.
  if(depth===2&&!r.optional)for(const dx of [-4,4]){const x=r.cx+dx,y=r.cy;w.solid[y*w.width+x]=true;w.props.push({x,y,sheet:'04',cell:0});}
  else w.props.push({x:r.x+1,y:r.y+1,sheet:depth===3?'70':'03',cell:depth===3?9:2});
  if(depth===3&&r.id>=2&&!r.optional)w.traps.push({x:center(r).x+64,y:center(r).y+64,phase:(roll%300)/100});
 }
 for(const c of w.chests)c.depth=depth;
 // An unlockable return loop connects the final hall to the entry, never bypassing its key.
 if(depth===1){const a=w.rooms[0],b=arena;for(let y=a.cy;y<=b.cy;y++)for(let k=-1;k<=1;k++)w.solid[y*w.width+a.cx+k]=false;
  const group=w.doors.length;for(let k=-1;k<=1;k++){const d={x:a.cx+k,y:a.y+a.h,group,lock:'objective',open:false};w.doors.push(d);w.solid[d.y*w.width+d.x]=true;}w.edges.push([0,arena.id]);
 }
 return w;
}
export function underkeepAction(w,p){return storyAction(w,p);}
export function interactUnderkeep(w,p,pr,q){
 const action=underkeepAction(w,p);if(!action)return 'Nothing nearby to interact with.';
 if(action.kind==='entrance')return 'ascend';
 if(action.kind==='exit'){
  if(w.depth===3&&!w.bossDefeated)return 'The First Herald still holds the Heart. The way home remains sealed.';
  if(!w.hasKey&&w.depth<3)return 'Unlock the lower gate before descending.';
  w.completed=true;return w.depth===3?'escape':'descend';
 }
 if(action.target.gateLever){w.hasKey=true;action.target.active=true;return 'The counterweights rise. The lower gate and return route are unlocked.';}
 if(action.kind==='door'&&action.target.lock==='objective'&&!w.hasKey)return w.depth===2?'The brass lever in the far hall controls this gate.':'Find the seal key in the far chamber to open this gate.';
 if(action.kind==='chest'){
  const c=action.target;c.open=true;const slot=w.depth===1?'armor':w.depth===2?'weapon':'trinket',item=pr.makeItem(slot,true),power=w.depth+2;
  item.rarity=c.rare?3:2;item.name=`${c.rare?'Forgotten':'Underkeep'} ${slot==='weapon'?'Arsenal':slot==='armor'?'Bastion':'Star Seal'}`;
  item.stats=slot==='weapon'?{attack:power*5}:slot==='armor'?{defense:power*2,hp:power*8}:{crit:.02*power,haste:.04*power};
  pr.items.push(item);pr.addGold(25*w.depth);pr.potions+=2;return `${item.name} recovered, ${25*w.depth} gold and two potions. I to equip.`;
 }
 return interactStory(w,p,pr,q);
}
