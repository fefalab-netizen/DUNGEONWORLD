// Milestone 8 — versioned persistent save snapshots for seeded, multi-region adventures.
// Store mutable state, never the 256x256 terrain, loaded textures, closures or canvas objects.
import {Adventure} from './adventure.js?v=8.0';
import {createOverworld} from './overworld.js?v=8.0';
import {createStoryDungeon} from './story-dungeon.js?v=8.0';
import {createUnderkeep} from './underkeep.js?v=8.0';
import {createGrandHall} from './grand-hall.js?v=8.0';
import {createLegendaryDungeon} from './legendary-dungeons.js?v=8.0';

export const SAVE_VERSION=1;
const PREFIX='first-descent.m8.';
const REGION_IDS=new Set(['overworld','expedition','raider','chapel','underkeep-1','underkeep-2','underkeep-3','grandhall','labyrinth','threeWings']);
const WORLD_FIELDS=['hasKey','completed','bossDefeated','treasureKey','key','ritual','objects','chests','traps','doors','hall','legendary','lastHazardAt'];
const plain=value=>JSON.parse(JSON.stringify(value));
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const setToList=collection=>collection instanceof Set?[...collection]:[];
const safeStorage=()=>{if(typeof localStorage==='undefined')throw new Error('Browser storage is unavailable. Export a save file instead.');return localStorage;};

function captureWorld(world){
 const result={};
 for(const field of WORLD_FIELDS)if(world[field]!==undefined)result[field]=plain(world[field]);
 if(world.explored instanceof Uint8Array){
  const indices=[];for(let i=0;i<world.explored.length;i++)if(world.explored[i])indices.push(i);
  result.exploration={type:'bitmap',indices};
 }else if(world.explored instanceof Set)result.exploration={type:'set',indices:setToList(world.explored)};
 if(world.revealedRooms instanceof Set)result.revealedRooms=setToList(world.revealedRooms);
 if(world.colossiDefeated instanceof Set)result.colossiDefeated=setToList(world.colossiDefeated);
 return result;
}
function applyWorld(world,saved){
 if(!saved||typeof saved!=='object')return;
 for(const field of WORLD_FIELDS)if(Object.prototype.hasOwnProperty.call(saved,field))world[field]=plain(saved[field]);
 for(const door of world.doors||[])if(door.open&&door.x>=0&&door.y>=0&&door.x<world.width&&door.y<world.height)world.solid[door.y*world.width+door.x]=false;
 if(saved.exploration?.type==='bitmap'&&world.explored instanceof Uint8Array){
  world.explored.fill(0);
  for(const i of saved.exploration.indices||[])if(Number.isInteger(i)&&i>=0&&i<world.explored.length)world.explored[i]=1;
  // Rebuild streaming chunks and fog from the loaded player position on the next frame.
  world.revealX=-1;world.revealY=-1;
 }else if(saved.exploration?.type==='set')world.explored=new Set(saved.exploration.indices||[]);
 if(saved.revealedRooms)world.revealedRooms=new Set(saved.revealedRooms);
 if(saved.colossiDefeated)world.colossiDefeated=new Set(saved.colossiDefeated);
}
function captureCombat(combat){
 return {
  time:combat.time,kills:combat.kills,randomState:combat.randomState,
  nextEnemyId:combat.nextEnemyId,finished:combat.finished,
  enemies:combat.enemies.map(enemy=>{
   // Tactical targets refer to other enemy objects and would form cycles.
   const {tactics,target,...fields}=enemy;return plain(fields);
  })
 };
}
function applyCombat(combat,saved){
 if(!saved||!Array.isArray(saved.enemies))throw new Error('Save has incomplete enemy state.');
 combat.time=Number(saved.time)||0;
 combat.kills=Number(saved.kills)||0;
 combat.randomState=(saved.randomState>>>0)||127;
 combat.enemies=plain(saved.enemies).map(e=>({...e,tacticalTimer:0,tactics:null,target:null}));
 combat.nextEnemyId=Number.isInteger(saved.nextEnemyId)?saved.nextEnemyId:combat.enemies.length;
 combat.finished=!!saved.finished;
 combat.projectiles=[];combat.effects=[];combat.numbers=[];combat.noise=null;
}
function captureProgression(p){
 return {
  level:p.level,xp:p.xp,gold:p.gold,goldEarned:p.goldEarned,soldCount:p.soldCount,
  points:p.points,potions:p.potions,bonus:plain(p.bonus),
  items:plain(p.items),equipment:Object.fromEntries(Object.entries(p.equipment).map(([slot,item])=>[slot,item?.id??null])),
  serial:p.serial,seed:p.seed,wave:p.wave
 };
}
function applyProgression(p,s){
 if(!s||!Array.isArray(s.items)||!s.equipment)throw new Error('Save has incomplete inventory.');
 for(const k of ['level','xp','gold','goldEarned','soldCount','points','potions','serial','seed','wave'])
  if(Number.isFinite(s[k]))p[k]=s[k];
 p.bonus={attack:0,defense:0,hp:0,...s.bonus};
 p.items=plain(s.items);
 p.equipment=Object.fromEntries(['weapon','armor','trinket'].map(slot=>[slot,p.items.find(item=>item.id===s.equipment[slot])||null]));
 p.recalculate();
}
function captureQuests(q){
 return {
  accepted:q.accepted,stairOpen:q.stairOpen,heraldDefeated:q.heraldDefeated,finished:q.finished,depth:q.depth||1,
  artifacts:setToList(q.artifacts),lore:setToList(q.lore),spoken:setToList(q.spoken),secrets:setToList(q.secrets)
 };
}
function applyQuests(q,s){
 if(!s)throw new Error('Save has no quest progress.');
 for(const key of ['accepted','stairOpen','heraldDefeated','finished'])q[key]=!!s[key];
 q.depth=Number(s.depth)||1;
 for(const key of ['artifacts','lore','spoken','secrets'])q[key]=new Set(s[key]||[]);
}
export function captureAdventure(a,heroId){
 if(!a||!Number.isInteger(heroId)||heroId<0||heroId>7)throw new Error('An active character is required to save.');
 return {
  format:'the-first-descent',version:SAVE_VERSION,savedAt:new Date().toISOString(),
  seed:String(a.seed),heroId,regionId:a.regionId,elapsed:a.elapsed,
  expeditionTrips:a.expeditionTrips,totalKills:a.totalKills||0,
  player:plain(a.player),progression:captureProgression(a.progression),quests:captureQuests(a.quests),
  shop:plain(a.shop),returnPosition:plain(a.returnPosition||null),
  underkeepReturn:plain(a.underkeepReturn||null),grandHallReturn:plain(a.grandHallReturn||null),
  legendaryReturn:plain(a.legendaryReturn||null),
  regions:[...a.regions].map(([id,r])=>({
   id,world:captureWorld(r.world),combat:captureCombat(r.combat),
   drops:plain(id===a.regionId?a.progression.drops:r.drops),
   enemySpawns:plain(r.world.enemySpawns||[]),
   generation:{level:r.world.generation?.level||r.world.hall?.level||r.world.legendary?.level||a.progression.level,
               progress:r.world.generation?.progress||0}
  }))
 };
}
export function validateSave(data){
 if(!data||data.format!=='the-first-descent'||data.version!==SAVE_VERSION)
  throw new Error('Unsupported save version. This build accepts Milestone 8 saves (version 1).');
 if(typeof data.seed!=='string'||data.seed.length>48||!Number.isInteger(data.heroId)||data.heroId<0||data.heroId>7)
  throw new Error('Save contains an invalid seed or character.');
 if(!REGION_IDS.has(data.regionId)||!point(data.player)||!Array.isArray(data.regions)||data.regions.length<1||data.regions.length>REGION_IDS.size)
  throw new Error('Save has invalid region or player information.');
 const names=new Set();
 for(const rec of data.regions){
  if(!REGION_IDS.has(rec.id)||names.has(rec.id)||!rec.world||!rec.combat||!Array.isArray(rec.combat.enemies))
   throw new Error('Save has invalid or duplicate region data.');
  names.add(rec.id);
 }
 if(!names.has('overworld')||!names.has(data.regionId))throw new Error('Save is missing its current region.');
 if(data.regionId!=='overworld'&&data.regionId!=='raider'&&data.regionId!=='chapel'&&!names.has('expedition')&&['grandhall','labyrinth','threeWings'].includes(data.regionId))throw new Error('Legendary save is missing its expedition region.');
 if(!data.progression||!data.quests||!Array.isArray(data.shop)||data.shop.length!==3||!Array.isArray(data.progression.items))throw new Error('Save is missing progression data.');
 return data;
}
function generatedWorld(a,rec){
 const id=rec.id,level=rec.generation?.level||1,progress=rec.generation?.progress||0;
 if(id==='overworld')return a.overworld;
 if(id==='expedition'){a.expedition=createOverworld(a.seed+':expedition',true);return a.expedition;}
 if(id==='raider'||id==='chapel'){
  const w=createStoryDungeon(a.seed+':'+id,id,level,progress);
  w.name=a.overworld.landmarks.find(l=>l.id===id)?.name||w.name;
  return w;
 }
 if(id.startsWith('underkeep-'))return createUnderkeep(a.seed,Number(id.slice(-1)));
 if(id==='grandhall')return createGrandHall(a.seed+':grandhall',level);
 if(id==='labyrinth'||id==='threeWings')return createLegendaryDungeon(id,a.seed+':'+id,level);
 throw new Error('Unknown saved region: '+id);
}
export function restoreAdventure(data,classes,player,onNotice=()=>{}){
 const save=validateSave(data),a=new Adventure(save.seed,classes[save.heroId],player,onNotice);
 applyProgression(a.progression,save.progression);
 applyQuests(a.quests,save.quests);
 a.shop=plain(save.shop);a.expeditionTrips=save.expeditionTrips||0;
 a.elapsed=save.elapsed||0;a.totalKills=save.totalKills||0;
 for(const field of ['returnPosition','underkeepReturn','grandHallReturn','legendaryReturn'])
  a[field]=plain(save[field]||null);
 // Rebuild region generators and install their normal defeat callbacks through travel().
 for(const rec of save.regions){
  if(rec.id==='overworld')continue;
  const w=generatedWorld(a,rec);
  if(rec.id==='raider'||rec.id==='chapel')w.generation={level:rec.generation?.level||1,progress:rec.generation?.progress||0};
  a.travel(rec.id,w,w.spawn);
 }
 for(const rec of save.regions){
  const region=a.regions.get(rec.id);
  if(!region)throw new Error('Could not reconstruct region '+rec.id);
  region.world.enemySpawns=plain(rec.enemySpawns||region.world.enemySpawns);
  applyWorld(region.world,rec.world);
  applyCombat(region.combat,rec.combat);
  region.drops=plain(rec.drops||[]);
 }
 a.current=a.regions.get(save.regionId);a.regionId=save.regionId;
 a.progression.drops=a.current.drops;
 Object.assign(player,plain(save.player));
 return a;
}
// Three named manual saves, plus a separate automatic recovery checkpoint.
// A legacy M8 manual save is copied to the first empty slot at most once.
export const SAVE_SLOTS=Object.freeze([1,2,3]);
const slotKey=slot=>{
 if(!SAVE_SLOTS.includes(Number(slot)))throw new Error('Choose save slot 1, 2, or 3.');
 return 'slot'+Number(slot);
};
export function cleanSaveName(input,slot=1){
 const name=String(input??'').trim().replace(/[\\u0000-\\u001f\\u007f]/g,'').slice(0,32).trim();
 return name||'Adventure '+slot;
}
const storeSnapshot=(key,snapshot)=>{
 try{safeStorage().setItem(PREFIX+key,JSON.stringify(snapshot));}
 catch(error){throw new Error('Could not save in this browser (storage may be full or blocked): '+error.message);}
};
export function readBrowserSave(slot='auto'){
 const raw=safeStorage().getItem(PREFIX+slot);
 return raw?validateSave(JSON.parse(raw)):null;
}
export function readNamedSlot(slot){return readBrowserSave(slotKey(slot));}
export function migrateLegacyManual(){
 const storage=safeStorage();
 if(storage.getItem(PREFIX+'legacyMigrated')==='1')return null;
 const old=readBrowserSave('manual');
 if(!old)return null;
 const free=SAVE_SLOTS.find(i=>!storage.getItem(PREFIX+slotKey(i)));
 if(!free)return null; // Never overwrite an existing named slot.
 const copy={...old,slotName:cleanSaveName(old.slotName||'Recovered adventure',free)};
 storeSnapshot(slotKey(free),copy);
 storage.setItem(PREFIX+'legacyMigrated','1');
 // Keep the original legacy record as an untouched fallback for export.
 return free;
}
export function saveNamedSlot(a,heroId,slot,name){
 const id=Number(slot);
 const snapshot=captureAdventure(a,heroId);
 snapshot.slotName=cleanSaveName(name,id);
 storeSnapshot(slotKey(id),snapshot);
 return snapshot;
}
export function renameNamedSlot(slot,name){
 const id=Number(slot),snapshot=readNamedSlot(id);
 if(!snapshot)throw new Error('This save slot is empty.');
 snapshot.slotName=cleanSaveName(name,id);
 storeSnapshot(slotKey(id),snapshot);
 return snapshot;
}
export function deleteNamedSlot(slot){safeStorage().removeItem(PREFIX+slotKey(slot));}
export function listNamedSlots(){
 try{migrateLegacyManual();}catch{/* An unreadable legacy save must not hide the current slots. */}
 return SAVE_SLOTS.map(slot=>{
  try{const save=readNamedSlot(slot);return {slot,save,name:save?cleanSaveName(save.slotName,slot):''};}
  catch(error){return {slot,save:null,name:'',error:error.message};}
 });
}
export function saveToBrowser(a,heroId,slot='auto',activeSlot=null){
 if(slot!=='auto'&&slot!=='manual')throw new Error('Unknown automatic save destination.');
 const snapshot=captureAdventure(a,heroId);
 if(slot==='auto'&&SAVE_SLOTS.includes(Number(activeSlot)))snapshot.activeSaveSlot=Number(activeSlot);
 storeSnapshot(slot,snapshot);
 return snapshot;
}
export function latestBrowserSave(){
 const slots=listNamedSlots().filter(entry=>entry.save).map(entry=>({slot:entry.slot,save:entry.save,name:entry.name}));
 const candidates=[...slots];
 try{const save=readBrowserSave('auto');if(save)candidates.push({slot:'auto',save,name:'Automatic recovery'});}catch{}
 // If migration could not find a free slot, the former manual save remains recoverable.
 try{
  if(safeStorage().getItem(PREFIX+'legacyMigrated')!=='1'){
   const save=readBrowserSave('manual');
   if(save)candidates.push({slot:'legacy',save,name:'Earlier manual save'});
  }
 }catch{}
 return candidates.sort((a,b)=>Date.parse(b.save.savedAt||0)-Date.parse(a.save.savedAt||0))[0]||null;
}
export function deleteBrowserSaves(){
 const storage=safeStorage();
 for(const key of [...SAVE_SLOTS.map(slotKey),'manual','auto','legacyMigrated'])storage.removeItem(PREFIX+key);
}
