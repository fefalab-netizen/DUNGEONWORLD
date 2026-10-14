import {underkeepAction,underkeepSheets} from './underkeep.js?v=7.5f-danger';
import {grandHallAction,updateGrandHall} from './grand-hall.js?v=7.5f-danger';
import {legendaryAction,legendaryObjective} from './legendary-dungeons.js?v=7.5f-danger';
import {presentEnding} from './ending.js?v=7.0';
import {DebugSpeed} from './debug-speed.js?v=7.0';
import {nearbyNPC} from './quests.js?v=7.5b';
import {openStory} from './story-ui.js?v=7.0';
import {storyAction} from './story-dungeon.js?v=7.5f-danger';
import {spriteUsage,coreSheets} from './sprite-usage.js?v=7.5a-audit';
import {Adventure} from './adventure.js?v=8';
import {captureAdventure,restoreAdventure,validateSave,saveToBrowser,readBrowserSave,latestBrowserSave,deleteBrowserSaves} from './save-state.js?v=8';
import {reveal,nearbyLandmark} from './overworld.js?v=7.5f-wilderness';
import {drawOverworld,drawFog,drawWorldMap} from './overworld-render.js?v=7.5f-wilderness';
import {createDungeon,nearbyInteraction,interactDungeon,trapActive} from './dungeon.js?v=7.5e-room-layout';
import {flipForAim} from './facing.js?v=7.0';
import {AssetManager} from './assets.js?v=7.5a-floorfix';
import {classes,art} from './data.js?v=7.5a-floorfix';
import {TILE,direction} from './world.js?v=7.0';
import {Combat,weapons,lineClear} from './combat.js?v=7.5f-wilderness';
import {Progression,xpNeeded,colors} from './progression.js?v=7.5f-danger';
import {openInventory} from './inventory.js?v=7.0';

const $=id=>document.getElementById(id),canvas=$('game'),g=canvas.getContext('2d');
const assets=new AssetManager(),keys=new Set(),debugSpeed=new DebugSpeed();
let world=createDungeon('Dunbarrow'),aimUntil=0,mapVisible=true;
let selected=0,mode='selection',debug=false,animation=0,last=0,accumulator=0,fps=60;
const player={...world.spawn,radius:8,flip:false};
let combat=new Combat(world,player,classes[0]),attacking=false,dodgeRequested=false;
let progression=new Progression(classes[0],player),toastTime=0,adventure=null,lastAutoSave=0;
function notifyLoot(message){$('toast').textContent=message;$('toast').hidden=false;toastTime=3.5;}
function showGear(character=false){if(!['playing','paused'].includes(mode))return;setMode('inventory');try{openInventory(progression,assets,character);}catch(error){setMode('paused');reportError(error);}}
function drinkPotion(){if(!['playing','paused'].includes(mode))return;if(progression.usePotion()){notifyLoot('Healed to '+player.hp+' / '+progression.stats.hp+' HP');}else notifyLoot(progression.potions?'Health is already full.':'No potions remaining.');syncVitals();}
function syncVitals(){$('healthText').textContent=player.hp+' / '+progression.stats.hp+' HP';document.querySelector('.health span').style.width=(player.hp/progression.stats.hp*100)+'%';}
function reportError(error){$('fatal').hidden=false;$('fatal').textContent='Game error: '+error.message;}
addEventListener('error',event=>reportError(event.error||new Error(event.message)));
function showStory(npc=null){if(!adventure)return;setMode('story');openStory(adventure,npc,()=>setMode('playing'));}
async function encounter(){
 if(mode!=='playing'||!adventure)return;const npc=nearbyNPC(adventure);if(npc){if(npc.id==='aldric'&&adventure.quests.heraldDefeated){adventure.quests.finished=true;presentEnding(adventure,$('completeSummary'));setMode('complete');return;}showStory(npc);return;}
 const destination=world.kind==='overworld'?nearbyLandmark(world,player):null;
 if((destination?.id==='chapel'||destination?.id==='threeWings'||(destination?.id==='underkeep'&&adventure.quests.ready))&&!['64','66','67','68','69','70'].every(id=>assets.atlases.has(id))){setMode('loading');notifyLoot('Loading dungeon artwork…');await assets.load(()=>{},['64','66','67','68','69','70']);if(!['64','66','67','68','69','70'].every(id=>assets.atlases.has(id))){setMode('playing');notifyLoot('Dungeon artwork missing. Check 64.png and 66–70.png in game/assets, then retry.');return;}setMode('playing');}
 if(destination?.id==='caravan'&&!world.expedition&&adventure.progression.gold>=(adventure.expeditionTrips?20:40)){
  const frontierSheets=['06','07','12','16','91','103','104','105','106','107','108','109','110','111'];
  if(frontierSheets.some(id=>!assets.atlases.has(id))){
   setMode('loading');await assets.load(()=>{},frontierSheets);
   if(frontierSheets.some(id=>!assets.atlases.has(id))){setMode('playing');notifyLoot('Expedition art is unavailable. Verify the biome PNG files in game/assets.');return;}
   setMode('playing');
  }
 }
 const oldWorld=world,message=adventure.interact();world=adventure.world;combat=adventure.combat;
 if(world!==oldWorld){Object.assign(camera,player);keys.clear();attacking=false;aimUntil=0;}
 notifyLoot(message);canvas.focus();
 if(world!==oldWorld&&player.hp>0)try{saveToBrowser(adventure,selected,'auto');lastAutoSave=adventure.elapsed;}catch(error){notifyLoot('Autosave unavailable: '+error.message);}
}
const pointer={x:innerWidth/2+100,y:innerHeight/2};
canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;aimUntil=performance.now()+300;});
canvas.addEventListener('pointerdown',e=>{if(e.button===0&&mode==='playing'){attacking=true;pointer.x=e.clientX;pointer.y=e.clientY;canvas.focus();}});
addEventListener('pointerup',()=>attacking=false);
const camera={x:player.x,y:player.y};
let viewWidth=640,viewHeight=360;
function resize(){const scale=innerWidth>=1000?2:1;canvas.width=Math.ceil(innerWidth/scale);canvas.height=Math.ceil(innerHeight/scale);viewWidth=canvas.width;viewHeight=canvas.height;g.imageSmoothingEnabled=false;}
addEventListener('resize',resize);resize();
function select(index){selected=index;document.querySelectorAll('.character').forEach((b,i)=>{b.classList.toggle('selected',i===index);b.setAttribute('aria-pressed',String(i===index));});const c=classes[index];$('chosenName').textContent=c.name;$('chosenStats').textContent=`${c.style} · ${c.hp} health · ${c.speed} speed · ${c.attack} power · ${c.defense} defense · ${weapons[index].special}`;}
function setMode(next){mode=next;keys.clear();attacking=false;dodgeRequested=false;accumulator=0;$('selection').hidden=next!=='selection';$('pause').hidden=next!=='paused';$('result').hidden=next!=='dead';$('complete').hidden=next!=='complete';$('hud').hidden=next==='selection';$('debug').hidden=!debug||next==='selection';if(next==='playing')canvas.focus();}
function reset(){Object.assign(player,world.spawn,{flip:false});Object.assign(camera,world.spawn);}
function begin(){debugSpeed.reset();adventure=new Adventure($('seed').value.trim()||'Dunbarrow',classes[selected],player,notifyLoot);world=adventure.world;combat=adventure.combat;progression=adventure.progression;Object.assign(camera,player);$('heroName').textContent=classes[selected].name;syncVitals();aimUntil=0;lastAutoSave=0;setMode('playing');notifyLoot('Welcome to Dunbarrow. Speak with Aldric northwest of the campfire. J opens your journal; E talks or interacts.');}
$('begin').onclick=begin;$('pauseButton').onclick=()=>setMode('paused');$('resume').onclick=()=>setMode('playing');$('reset').onclick=()=>{reset();setMode('playing');};$('change').onclick=()=>setMode('selection');
$('reset').textContent='Restart this seed';$('reset').onclick=begin;
$('retry').onclick=begin;$('resultChange').onclick=()=>setMode('selection');
$('encounter').onclick=encounter;
$('newSeed').onclick=()=>{$('seed').value='Descent-'+Math.floor(Math.random()*1000000);};
$('nextDungeon').onclick=()=>{$('seed').value='Descent-'+Math.floor(Math.random()*1000000);begin();};
$('completeMenu').onclick=()=>setMode('selection');
$('potionButton').onclick=drinkPotion;
$('inventoryButton').onclick=()=>showGear();$('characterButton').onclick=()=>showGear(true);
$('journalButton').onclick=()=>showStory();
$('story').addEventListener('close',()=>{if(mode==='story')setMode('playing');});
$('gear').addEventListener('close',()=>{if(mode==='inventory')setMode('playing');});
// Save/load is a separate UI module; no simulation advances while files load.
function refreshSaveButtons(){
 const saved=latestBrowserSave();$('continueRun').disabled=!saved;
 $('continueRun').textContent=saved?'Continue · '+classes[saved.save.heroId].name:'No saved adventure';
 $('loadManual').disabled=!readableSlot('manual');$('loadAuto').disabled=!readableSlot('auto');
 $('saveManual').disabled=!adventure||player.hp<=0||mode==='dead';
 $('exportSave').disabled=!adventure||player.hp<=0;
}
function readableSlot(slot){try{return !!readBrowserSave(slot);}catch{return false;}}
function manualSave(){
 if(!adventure||player.hp<=0){notifyLoot('Start a living adventure before saving.');return;}
 try{saveToBrowser(adventure,selected,'manual');refreshSaveButtons();notifyLoot('Adventure saved in this browser.');}
 catch(error){notifyLoot('Save failed: '+error.message);}
}
function openSavePanel(){
 if(mode==='playing')setMode('paused');
 $('saveStatus').textContent='Manual saves persist in this browser. Autosaves update every 90 seconds of play and on region changes.';
 refreshSaveButtons();$('savePanel').showModal();
}
async function loadSnapshot(snapshot){
 try{
  const data=validateSave(snapshot);
  const sheets=['64','66','67','68','69','70'];
  if(data.regions.some(r=>r.id==='expedition'||['grandhall','labyrinth','threeWings'].includes(r.id)))
   sheets.push('06','07','12','16','91','103','104','105','106','107','108','109','110','111');
  const needed=[...new Set(sheets)].filter(id=>!assets.atlases.has(id));
  if(needed.length){
   setMode('loading');await assets.load(()=>{},needed);
   if(needed.some(id=>!assets.atlases.has(id)))throw new Error('Required dungeon or biome artwork could not load.');
  }
  const restored=restoreAdventure(data,classes,player,notifyLoot);
  adventure=restored;world=adventure.world;combat=adventure.combat;progression=adventure.progression;
  select(data.heroId);$('seed').value=data.seed;$('heroName').textContent=classes[data.heroId].name;
  Object.assign(camera,player);lastAutoSave=adventure.elapsed;aimUntil=0;mapVisible=true;keys.clear();
  syncVitals();if($('savePanel').open)$('savePanel').close();setMode('playing');refreshSaveButtons();
  notifyLoot('Adventure restored · '+(world.name||world.seed)+'.');
 }catch(error){setMode(adventure?'paused':'selection');$('saveStatus').textContent='Could not load: '+error.message;notifyLoot('Load failed: '+error.message);}
}
function exportCurrentSave(){
 if(!adventure||player.hp<=0)return;
 try{
  const snapshot=captureAdventure(adventure,selected);
  const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='the-first-descent-save.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('saveStatus').textContent='Save file exported.';
 }catch(error){$('saveStatus').textContent='Export failed: '+error.message;}
}
$('saveMenu').onclick=openSavePanel;
$('closeSaves').onclick=()=>$('savePanel').close();
$('saveManual').onclick=()=>{manualSave();$('saveStatus').textContent=readableSlot('manual')?'Manual save available in this browser.':'Manual save could not be verified.';};
$('loadManual').onclick=()=>{try{const s=readBrowserSave('manual');if(s)loadSnapshot(s);}catch(error){$('saveStatus').textContent='Load failed: '+error.message;}};
$('loadAuto').onclick=()=>{try{const s=readBrowserSave('auto');if(s)loadSnapshot(s);}catch(error){$('saveStatus').textContent='Load failed: '+error.message;}};
$('continueRun').onclick=()=>{const entry=latestBrowserSave();if(entry)loadSnapshot(entry.save);};
$('exportSave').onclick=exportCurrentSave;
$('importSave').onclick=()=>$('saveFile').click();
$('saveFile').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{
  if(file.size>4_000_000)throw new Error('Save exceeds the 4 MB import limit.');
  await loadSnapshot(validateSave(JSON.parse(await file.text())));
 }catch(error){$('saveStatus').textContent='Import failed: '+error.message;}
};
$('deleteSaves').onclick=()=>{
 if(!confirm('Delete both local manual and automatic saves? Export a backup first if you want one.'))return;
 try{deleteBrowserSaves();refreshSaveButtons();$('saveStatus').textContent='Browser saves deleted.';}
 catch(error){$('saveStatus').textContent=error.message;}
};
addEventListener('pagehide',()=>{if(adventure&&player.hp>0)try{saveToBrowser(adventure,selected,'auto');}catch{}});
const movementCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
addEventListener('keydown',e=>{
  if($('info').open||$('gear').open||$('story').open||$('savePanel').open)return;
  if(e.code==='F5'&&!e.repeat&&['playing','paused'].includes(mode)){e.preventDefault();manualSave();return;}
  if(e.code==='F4'&&!e.repeat&&mode!=='selection'){e.preventDefault();if(e.shiftKey)debugSpeed.cycle();else debugSpeed.toggle();return;}
  if(e.code==='KeyJ'&&!e.repeat&&['playing','paused'].includes(mode)){showStory();return;}
  if(['playing','paused'].includes(mode)&&!e.repeat&&['KeyI','KeyC','Digit1','Numpad1'].includes(e.code)){e.preventDefault();if(['Digit1','Numpad1'].includes(e.code))drinkPotion();else showGear(e.code==='KeyC');return;}
  if(e.code==='F3'){e.preventDefault();if(!e.repeat){debug=!debug;$('debug').hidden=!debug||mode==='selection';}return;}
  if(e.code==='Escape'&&!e.repeat&&['playing','paused'].includes(mode)){e.preventDefault();setMode(mode==='playing'?'paused':'playing');return;}
  if(mode==='playing'&&e.code==='Space'){e.preventDefault();if(!e.repeat)dodgeRequested=true;return;}
  if(mode==='playing'&&e.code==='KeyM'&&!e.repeat){mapVisible=!mapVisible;return;}
  if(mode==='playing'&&e.code==='KeyE'&&!e.repeat){encounter();return;}
  if(mode==='playing'&&movementCodes.includes(e.code)){e.preventDefault();keys.add(e.code);}
});
addEventListener('keyup',e=>keys.delete(e.code));
function blur(){keys.clear();if(mode==='playing')setMode('paused');}
addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur();});
$('closeInfo').onclick=()=>$('info').close();
$('helpButton').onclick=()=>{$('infoBody').innerHTML='<h2>Explore Dunbarrow</h2><p>Start in a safe camp. Follow roads west to the Raider Cellar or east to the Bone Chapel. E at the campfire restores health and supplies at least two potions. M toggles the exploration map. Trees, rocks and water block travel; roads and bridges connect all landmarks. Unknown terrain is hidden by fog.</p><p>WASD / arrows: walk and face movement. Moving the mouse aims; hold left click to attack in that direction. Space: dodge. E: open a nearby door or chest, pick up the golden key, or use stairs. I: inventory. C: statistics. 1: potion. M: toggle map. Escape: pause.</p><p>Recover each dungeon’s gate key or complete its ritual, defeat its miniboss, then use the violet exit stairs. Optional rooms are not required. J opens the quest journal. Talk to camp NPCs with E. Brunna buys and sells gear. Developer controls: F4 toggles movement speed; Shift+F4 cycles 1× / 2× / 4× / 8×. The Black Stair opens after both artifacts. Its three floors retain their state when you backtrack. Cyan stairs ascend; violet stairs descend. Defeat the First Herald, take the exit home and speak to Aldric for the ending. Equipment, health, enemies, doors and opened chests persist when travelling between regions during this run. Spike traps pulse amber before firing. Chests give equipment and a potion. Enter a seed to replay its layout, or choose Random seed for another dungeon.</p>';$('info').showModal();};
$('assetsButton').onclick=()=>{
  $('infoBody').innerHTML='<h2>Supplied asset report</h2><p>All 111 numbered PNGs are registered. Only core and visited-region sheets are loaded. Every cell has a stable physical ID (for example 05.r1c1). The sprite catalog has been audited against all 111 numbered PNGs.</p><p>03.png = props · 04.png = walls · 05.png = floors. A/B character pairs share crop bounds and scale. Dimensions and alpha are inspected when loaded.</p><table><thead><tr><th>File</th><th>Actual dimensions</th><th>Transparency</th></tr></thead><tbody>'+[...assets.atlases].sort().map(([id,a])=>`<tr><td>${id}.png</td><td>${a.width} × ${a.height}</td><td>${a.transparent?'Present':'Absent'}</td></tr>`).join('')+'</tbody></table>';
  $('infoBody').innerHTML+='<h3>Verified cell uses (zero-based)</h3><p>'+spriteUsage.map(u=>`${u.sheet}.${u.cell}: ${u.use}`).join('<br>')+'</p>';
  for(const error of assets.errors){const p=document.createElement('p');p.textContent=error;$('infoBody').append(p);}$('info').showModal();
};
function simulate(dt){adventure.elapsed+=dt;
 if(player.hp>0&&adventure.elapsed-lastAutoSave>=90){lastAutoSave=adventure.elapsed;try{saveToBrowser(adventure,selected,'auto');refreshSaveButtons();}catch(error){notifyLoot('Autosave unavailable: '+error.message);}}const d=direction(keys);const mx=pointer.x*viewWidth/innerWidth-viewWidth/2+camera.x,my=pointer.y*viewHeight/innerHeight-viewHeight/2+camera.y;combat.update(dt,{...d,angle:Math.atan2(my-(player.y-13),mx-player.x),aiming:performance.now()<aimUntil,attack:attacking,dodge:dodgeRequested,moveMultiplier:debugSpeed.value});
 if(world.expedition){
  const tx=Math.floor(player.x/TILE),ty=Math.floor(player.y/TILE),terrain=world.terrain[ty*world.width+tx];
  if(terrain===5||terrain===7)player.slow=Math.max(player.slow||0,.16);
  if((terrain===6||terrain===7||terrain===8)&&adventure.elapsed-(world.lastHazardAt||0)>1.25){
   world.lastHazardAt=adventure.elapsed;combat.hurt(terrain===6?14:terrain===7?8:5,{x:player.x-1,y:player.y-1});
  }
 }
 dodgeRequested=false;if(world.kind==='overworld')reveal(world,player);else if(world.theme){world.explored??=new Set();const tx=Math.floor(player.x/32),ty=Math.floor(player.y/32);for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const x=tx+dx,y=ty+dy;if(x>=0&&y>=0&&x<world.width&&y<world.height)world.explored.add(y*world.width+x);}const plate=world.objects.find(o=>o.kind==='plate'&&Math.hypot(o.x-player.x,o.y-player.y)<20);if(plate&&!plate.active){plate.active=true;world.ritual.plate=true;notifyLoot('Pressure plate latched. Find the lever next.');}} for(const trap of world.traps)if(trapActive(trap,combat.time)&&Math.hypot(player.x-trap.x,player.y-trap.y)<17)combat.hurt(['grandHall','labyrinth','threeWings'].includes(world.layout)?19:16,trap);const blend=1-Math.exp(-9*dt);camera.x+=(player.x-camera.x)*blend;camera.y+=(player.y-camera.y)*blend;animation+=dt;
 if(world.layout==='grandHall')updateGrandHall(world,combat,player,dt,progression,notifyLoot);
  const picked=progression.collect(player,(a,b)=>lineClear(world,a,b));if(picked.length)notifyLoot(`Collected ${picked.map(i=>i.name).join(', ')} · I to equip${progression.points?' · C: improvement available':''}`);
 toastTime-=dt;if(toastTime<=0)$('toast').hidden=true;
 $('healthText').textContent=`${player.hp} / ${progression.stats.hp} HP`;document.querySelector('.health span').style.width=`${player.hp/progression.stats.hp*100}%`;
 $('xpText').textContent=`LEVEL ${progression.level} · ${progression.xp} / ${xpNeeded(progression.level)} XP`;$('xpFill').style.width=`${progression.xp/xpNeeded(progression.level)*100}%`;
 $('supplies').textContent=`Gold ${progression.gold} · Potions ${progression.potions} · 1 to heal${progression.points?' · C: '+progression.points+' improvement(s)':''}`;
 const outdoors=world.kind==='overworld',landmark=outdoors?nearbyLandmark(world,player):null,npc=nearbyNPC(adventure),action=npc?{kind:'npc'}:outdoors?(landmark?{kind:'landmark'}:null):world.depth?underkeepAction(world,player):world.layout==='grandHall'?grandHallAction(world,player):['labyrinth','threeWings'].includes(world.layout)?legendaryAction(world,player):world.theme?storyAction(world,player):nearbyInteraction(world,player);
 $('questObjective').textContent=['labyrinth','threeWings'].includes(world.layout)?legendaryObjective(world,combat):world.layout==='grandHall'?(world.hall.phase==='cleared'?'Grand Hall cleared · Exit or challenge the Hallbreaker':'Grand Hall · '+(world.hall.phase==='waiting'?'Reach the Great Hall through two chambers':`Survive wave ${Math.min(3,world.hall.wave+Number(world.hall.phase==='intermission'))} / 3`)):adventure.quests.objective;
 $('debugSpeed').hidden=!debugSpeed.enabled;$('debugSpeed').textContent=`DEV SPEED ${debugSpeed.value}× · F4 off · Shift+F4 change`;
 $('combatStatus').textContent=['labyrinth','threeWings'].includes(world.layout)?`${world.name} · ${combat.enemies.filter(e=>e.hp>0).length} enemies · ${world.hasKey?'Exit accessible':'Objectives remaining'}`:world.layout==='grandHall'?`Grand Hall · ${world.hall.phase==='cleared'?'Exit unlocked · Optional boss to the east':world.hall.phase==='waiting'?'Approach chambers · Great Hall ahead':`Wave ${world.hall.wave} / 3 · ${combat.enemies.filter(e=>e.hp>0&&e.grandHallWave).length} challengers remaining`}`:outdoors?world.expedition?`${landmark?.name||({volcanic:'Volcanic Wastes',jungle:'Deep Jungle',frozen:'Frozen Peaks',coast:'Drowned Coast',outpost:'Expedition Outpost'}[world.biomeAt(Math.floor(player.x/TILE),Math.floor(player.y/TILE))])} · Caravan: free return`:`${landmark?.name||'Dunbarrow wilderness'} · West: Cellar / East: Chapel`:`${world.name} · ${combat.enemies.filter(e=>e.hp>0).length} enemies · ${world.depth===3?(world.bossDefeated?'Heart recovered':'Seek the Herald'):'Gate: '+(world.hasKey?'unlocked':'sealed')}`;
 $('encounter').hidden=false;$('encounter').disabled=!action;$('encounter').textContent=action?({npc:'Talk to '+npc?.name,altar:'Awaken altar',plate:'Press plate',lever:'Raise lever',supply:'Search supplies',lore:'Read inscription',break:'Break barricade','locked door':'Unlock treasury',landmark:landmark?.id==='labyrinth'?'Enter the Labyrinth':landmark?.id==='threeWings'?'Enter the Three Wings':landmark?.id==='grandhall'?'Enter the Grand Hall':landmark?.id==='caravan'?(world.expedition?'Return to Dunbarrow · FREE':`Travel to frontier · ${adventure.expeditionTrips?20:40} gold`):landmark?.id==='camp'?'Rest at camp':landmark?.id==='raider'||landmark?.id==='chapel'||landmark?.id==='underkeep'?'Enter dungeon':'Read sign',door:world.layout==='grandHall'?'Open optional boss arena':'Open door',key:world.layout==='labyrinth'?'Take Wayfinder Sigil':'Take key',wingSeal:'Claim wing seal',chest:'Open chest',exit:['labyrinth','threeWings'].includes(world.layout)?'Complete legendary dungeon':world.layout==='grandHall'?'Leave Grand Hall':world.depth?(world.depth===3?'Return to camp':'Descend to floor '+(world.depth+1)):'Use exit',entrance:['labyrinth','threeWings'].includes(world.layout)?'Return to expedition':world.layout==='grandHall'?'Return to expedition':world.depth?(world.depth===1?'Return outdoors':'Ascend to floor '+(world.depth-1)):'Return outdoors'}[action.kind]+' · E'):'Explore · E to interact';
 if(player.hp<=0){$('resultSummary').textContent=`${classes[selected].name} · ${combat.kills} enemies defeated · ${player.xp} XP · ${Math.floor(combat.time)} seconds`;setMode('dead');}
}
function render(){
  g.fillStyle='#0e1216';g.fillRect(0,0,viewWidth,viewHeight);
  const ox=Math.round(viewWidth/2-camera.x),oy=Math.round(viewHeight/2-camera.y);
  const minX=Math.max(0,Math.floor(-ox/TILE)-1),maxX=Math.min(world.width,Math.ceil((viewWidth-ox)/TILE)+1);
  const minY=Math.max(0,Math.floor(-oy/TILE)-2),maxY=Math.min(world.height,Math.ceil((viewHeight-oy)/TILE)+2);
  const sprites=[],outdoors=world.kind==='overworld',bounds={minX,maxX,minY,maxY};
  if(outdoors)drawOverworld(g,assets,world,player,bounds,ox,oy,sprites);
  for(const drop of progression.drops)sprites.push({depth:drop.y-1,draw:()=>{
    const x=drop.x+ox,y=drop.y+oy;
    if(drop.item){
      const color=colors[drop.item.rarity],pulse=1+.12*Math.sin(animation*3+drop.x*.02);
      g.save();
      // Soft, unmistakable rarity-colored ground glow, with no rectangular item frame.
      const halo=g.createRadialGradient(x,y-6,3,x,y-6,25*pulse);
      halo.addColorStop(0,color+'bb');halo.addColorStop(.4,color+'66');halo.addColorStop(1,color+'00');
      g.fillStyle=halo;g.beginPath();g.ellipse(x,y-6,25*pulse,18*pulse,0,0,Math.PI*2);g.fill();
      g.strokeStyle=color;g.globalAlpha=.7+.2*Math.sin(animation*3);
      g.lineWidth=2;g.beginPath();g.ellipse(x,y+3,15,6,0,0,Math.PI*2);g.stroke();
      g.restore();
      assets.draw(g,drop.item.sheet,drop.item.cell,x-15,y-24,30,30);
    }
    if(drop.gold){
      const coinX=x+(drop.item?17:0),coinY=y+(drop.item?5:0);
      assets.draw(g,'88',8,coinX-10,coinY-9,20,20);
      g.font='bold 9px monospace';g.fillStyle='#ffdf85';g.fillText(String(drop.gold),coinX+9,coinY+4);
    }
    if(drop.potions)assets.draw(g,'88',0,x+(drop.item?12:-8),y+7,16,16);
  }});
  if(!outdoors)for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
    const px=x*TILE+ox,py=y*TILE+oy,isProp=world.props.some(p=>p.x===x&&p.y===y),wall=world.solid[y*world.width+x]&&!isProp&&!world.doors.some(d=>d.x===x&&d.y===y);
    // Choose a room palette first, then only subtle variation within that room.
    // Hallways share plain flagstone; themed floors never mix randomly tile-by-tile.
    const seed=(world.numericSeed||0)>>>0;
    const noise=(()=>{let h=(Math.imul(x+17,374761393)^Math.imul(y+29,668265263)^seed)>>>0;h=Math.imul(h^(h>>>13),1274126177);return (h>>>0)/4294967296;})();
    const room=world.rooms?.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
    const requestedFloor=world.floorSheet||(world.theme==='chapel'?'68':art.floor);
    const mainFloor=requestedFloor==='03'?'05':requestedFloor;
    let floorSheet=mainFloor,floorCell=noise>.96?1:0;
    if(mainFloor==='05'){
      const type=room?.floorType||'standard';
      if(type==='storage'){floorSheet='101';floorCell=8;}
      else if(type==='collapsed'){floorCell=noise<.85?4:1;}
      else if(type==='crypt'){floorCell=noise<.9?2:0;}
      else if(type==='ritual'){floorCell=noise<.96?0:1;}
      else if(type==='boss'){floorCell=noise<.98?0:1;}
      else floorCell=noise<.94?0:1;
    }
    assets.draw(g,floorSheet,floorCell,px,py,TILE,TILE);
    // Subtle ground shading keeps characters and collision silhouettes legible.
    g.fillStyle='#07101735';g.fillRect(px,py,TILE,TILE);
    if(wall)sprites.push({depth:(y+1)*TILE,draw:()=>{g.fillStyle='#070b0b88';g.fillRect(px+3,py+12,32,23);
      const wallSheet=world.wallSheet||(world.theme==='chapel'?'69':art.walls);
      const wallCell=noise>.96?2:noise>.86?1:0;
      assets.draw(g,wallSheet,wallCell,px,py-12,32,44);}});
    if(debug&&world.solid[y*world.width+x]){g.strokeStyle='#e79462';g.strokeRect(px+.5,py+.5,31,31);}
  }
  for(const p of world.props)sprites.push({depth:(p.y+1)*TILE,draw:()=>assets.draw(g,p.sheet||art.props,p.cell,p.x*TILE+ox,p.y*TILE+oy-6,32,38)});
  for(const trap of world.traps){const active=trapActive(trap,combat.time),warning=(combat.time+trap.phase)%3>1.3;g.fillStyle=active?'#df714477':warning?(Math.sin(combat.time*20)>0?'#ffd45899':'#ffd45833'):'#c9a45822';g.fillRect(trap.x+ox-15,trap.y+oy-15,30,30);assets.draw(g,'95',active?7:6,trap.x+ox-14,trap.y+oy-12,28,24);}
  if(!outdoors)for(const [p,color,label,cell] of [[world.spawn,'#80dcdb',world.depth?'ASCEND':'ENTRANCE',9],[world.exit,(world.layout==='grandHall'?world.hall.phase==='cleared':['labyrinth','threeWings'].includes(world.layout)?world.hasKey:world.theme?world.bossDefeated:world.hasKey&&combat.finished)?'#9cf4b1':'#c799ee',world.depth?(world.depth===3?'WAY HOME':'DESCEND'):'EXIT',10]]){
   assets.draw(g,'102',cell,p.x+ox-16,p.y+oy-20,32,32);
   g.fillStyle=color;g.font='7px monospace';g.fillText(label,p.x+ox-16,p.y+oy+23);
  }
  for(const d of world.doors)if(!d.open)sprites.push({depth:(d.y+1)*TILE,draw:()=>assets.draw(g,d.lock==='treasure'?'04':'102',d.lock==='treasure'?10:3,d.x*TILE+ox,d.y*TILE+oy-12,32,44)});
  for(const c of world.chests)sprites.push({depth:c.y+8,draw:()=>assets.draw(g,'03',c.open?5:4,c.x+ox-15,c.y+oy-22,30,30)});
  if(!outdoors&&!world.key.taken)sprites.push({depth:world.key.y,draw:()=>assets.draw(g,'98',4,world.key.x+ox-10,world.key.y+oy-16,20,24)});
  if(world.layout==='threeWings')for(const seal of world.legendary.wings){
   sprites.push({depth:seal.y+4,draw:()=>{
    const x=seal.x+ox,y=seal.y+oy,glow=['#91caf2','#e6bd79','#bf9de9'][seal.cell];
    if(!seal.claimed){
     const halo=g.createRadialGradient(x,y,2,x,y,25);
     halo.addColorStop(0,glow+'aa');halo.addColorStop(1,glow+'00');
     g.fillStyle=halo;g.fillRect(x-25,y-25,50,50);
     assets.draw(g,'98',seal.cell,x-13,y-20,26,29);
     g.font='8px monospace';g.fillStyle='#f0e5c7';g.textAlign='center';g.fillText('SEAL',x,y+19);g.textAlign='start';
    }else{g.fillStyle='#90c8a4';g.font='8px monospace';g.fillText('CLEARED',x-19,y+10);}
   }});
  }
  if(outdoors&&!world.expedition&&adventure)for(const n of adventure.npcs)sprites.push({depth:n.y+8,draw:()=>{assets.draw(g,n.sheet,n.frame+Math.floor(animation/.42)%2,n.x+ox-20,n.y+oy-34,40,42);g.fillStyle='#f4d992';g.font='8px monospace';g.fillText(n.name,n.x+ox-28,n.y+oy-43);}});
  for(const o of world.objects||[]){if(o.kind==='plate')assets.draw(g,'95',o.active?3:2,o.x+ox-15,o.y+oy-10,30,22);else if(o.kind==='lever')assets.draw(g,'95',o.active?1:0,o.x+ox-16,o.y+oy-28,32,36);else assets.draw(g,o.kind==='supply'?'03':'90',o.kind==='supply'?2:0,o.x+ox-12,o.y+oy-20,24,28);g.fillStyle=o.active?'#8fdfb1':'#e3ce9b';g.font='7px monospace';g.fillText(o.kind.toUpperCase(),o.x+ox-18,o.y+oy+18);}
  if(world.theme==='chapel'&&!world.key.taken)assets.draw(g,'90',0,world.key.x+ox-22,world.key.y+oy-40,44,50);
  sprites.push({depth:player.y+8,draw:()=>{g.fillStyle='#050b0bb0';g.beginPath();g.ellipse(Math.round(player.x+ox),Math.round(player.y+oy+5),12,5,0,0,Math.PI*2);g.fill();g.save();if(player.flash>0)g.globalAlpha=.5;assets.character(g,classes[selected].frames[Math.floor(animation/.42)%2],player.x+ox,player.y+oy+8,42,player.flip);g.restore();}});
  for(const e of combat.enemies){if(e.hp<=0||Math.abs(e.x-player.x)>viewWidth/2+100||Math.abs(e.y-player.y)>viewHeight/2+100)continue;sprites.push({depth:e.y+8,draw:()=>{
    const x=Math.round(e.x+ox),y=Math.round(e.y+oy),a=assets.atlases.get(e.sheet),b=a?.frames[e.frame].bounds,ratio=b?(b.right-b.left+1)/(b.bottom-b.top+1):1;
    const size=42*(e.scale||1);g.fillStyle='#050b0bb0';g.beginPath();g.ellipse(x,y+5,e.radius*1.4,5,0,0,Math.PI*2);g.fill();g.save();if(e.flash>0)g.globalAlpha=.45;if(e.role==='ambusher'&&!e.alert)g.globalAlpha=.4;assets.draw(g,e.sheet,e.frames[Math.floor(animation/.42)%2],x-size*ratio/2,y+8-size,size*ratio,size,e.wildlife?!flipForAim(e.angle):flipForAim(e.angle));g.restore();if(e.tier!=='normal'||e.ward>0){g.strokeStyle=e.ward>0?'#82e1e4':e.boss?'#e791f7':'#ffd877';g.beginPath();g.ellipse(x,y+5,e.radius*1.6,8,0,0,Math.PI*2);g.stroke();}if(e.tier!=='normal'){g.fillStyle='#ffe0a3';g.font='8px monospace';g.fillText(e.boss?e.name:'ELITE',x-25,y-size-5);}
    if(!e.wildlife||e.alert||e.hp<e.maxHp){
     const bar=e.colossal?112:34,top=e.colossal?y-size-15:y-43;
     g.fillStyle='#321b22';g.fillRect(x-bar/2,top,bar,5);
     g.fillStyle=e.colossal?'#f59d66':'#cd6958';g.fillRect(x-bar/2,top,bar*e.hp/e.maxHp,5);
    }
    if(e.telegraph){
     const t=e.telegraph,alpha=.25+.3*(1-t.time/t.total);
     g.fillStyle=e.attackColor||'#ffab65';g.strokeStyle=e.attackColor||'#ffab65';g.lineWidth=3;
     g.save();g.globalAlpha=alpha;
     g.beginPath();
     if(t.type==='line'){
      const ax=t.end.x-t.origin.x,ay=t.end.y-t.origin.y,len=Math.hypot(ax,ay)||1;
      const px=-ay/len*34,py=ax/len*34;
      g.moveTo(t.origin.x+ox+px,t.origin.y+oy+py);g.lineTo(t.end.x+ox+px,t.end.y+oy+py);
      g.lineTo(t.end.x+ox-px,t.end.y+oy-py);g.lineTo(t.origin.x+ox-px,t.origin.y+oy-py);g.closePath();
     }else g.arc(t.target.x+ox,t.target.y+oy,t.radius,0,Math.PI*2);
     g.fill();g.restore();g.stroke();
     g.fillStyle='#fff0d2';g.font='bold 10px monospace';g.fillText('DODGE!',x-23,y-size-26);
    }
    if(e.state==='attack'){g.strokeStyle='#ffb769';g.lineWidth=2;g.beginPath();if(e.kind==='melee')g.arc(x,y,e.range+9,e.angle-.95,e.angle+.95);else{g.moveTo(x,y);g.lineTo(x+Math.cos(e.angle)*80,y+Math.sin(e.angle)*80);}g.stroke();g.fillStyle='#ffe0a3';g.font='bold 13px monospace';g.fillText('!',x-3,y-size-8);}
    for(const r of e.runes||[]){g.fillStyle=r.fired?'#d09bff88':'#7d469733';g.strokeStyle='#e0b2ff';g.beginPath();g.arc(r.x+ox,r.y+oy,r.radius,0,Math.PI*2);g.fill();g.stroke();if(!r.fired){g.beginPath();g.arc(r.x+ox,r.y+oy,r.radius*Math.max(0,r.time/r.total),0,Math.PI*2);g.stroke();}}
    if(e.mark){g.strokeStyle='#d497ff';g.beginPath();g.arc(e.mark.x+ox,e.mark.y+oy,e.mark.radius,0,Math.PI*2);g.stroke();}if(e.action==='lunge'){g.strokeStyle='#ffb769';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(e.angle)*(96+e.range),y+Math.sin(e.angle)*(96+e.range));g.stroke();}if(e.action){g.fillStyle='#e5c6ff';g.font='8px monospace';g.fillText(e.action.toUpperCase(),x-20,y-size-18);}
    if(debug){g.strokeStyle='#ff9b74';g.strokeRect(x-14*e.scale,y+8-size,28*e.scale,size);g.font='8px monospace';g.fillText(e.state,x-15,y+19);}
  }});}
  sprites.sort((a,b)=>a.depth-b.depth).forEach(s=>s.draw());
  for(const q of combat.projectiles){const x=Math.round(q.x+ox),y=Math.round(q.y+oy);g.save();g.translate(x,y);g.rotate(q.angle);if(q.kind==='bomb')assets.draw(g,'88',7,-8,-8,16,16);else if(q.kind==='magic')assets.draw(g,'100',q.team==='enemy'?12:2,-9,-9,18,18);else{g.fillStyle=q.team==='enemy'?'#f58b62':'#e3d4a8';g.fillRect(-8,-1,14,2);g.fillRect(4,-3,3,6);}g.restore();}
  for(const e of combat.effects){g.save();g.translate(Math.round(e.x+ox),Math.round(e.y+oy));g.rotate(e.angle);g.globalAlpha=Math.min(1,e.ttl*8);assets.draw(g,e.sheet,e.cell+(e.ttl<e.duration/2?1:0),-e.size/2,-e.size/2,e.size,e.size);g.restore();}
  for(const n of combat.numbers){g.globalAlpha=Math.min(1,n.ttl*3);g.font='bold 11px monospace';g.textAlign='center';g.fillStyle='#101316';g.fillText(n.text,Math.round(n.x+ox)+1,Math.round(n.y+oy)+1);g.fillStyle=n.color;g.fillText(n.text,Math.round(n.x+ox),Math.round(n.y+oy));}g.globalAlpha=1;g.textAlign='start';
  if(outdoors)drawFog(g,world,player,bounds,ox,oy);
  if(debug){g.strokeStyle='#8effb4';g.strokeRect(Math.round(player.x-8+ox)+.5,Math.round(player.y-8+oy)+.5,16,16);$('debug').textContent=`COMBAT · fixed 60 Hz\nSeed: ${world.seed}\nRegion: ${outdoors?'Dunbarrow / chunks loaded: '+world.chunks.size:world.name}\nPosition: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}\nFPS: ${Math.round(fps)} · living enemies: ${combat.enemies.filter(e=>e.hp>0).length}\nCollision: 16 × 16 feet box\nQuest: ${adventure?.quests.objective||'selection'}\nIdle frame: ${Math.floor(animation/.42)%2?'B':'A'} (420 ms)`;}
  const boss=combat.enemies.find(e=>e.boss&&e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<400);if(boss){g.fillStyle='#17121ee8';g.fillRect(viewWidth/2-130,45,260,25);g.fillStyle='#ad6688';g.fillRect(viewWidth/2-126,62,252*boss.hp/boss.maxHp,4);g.fillStyle='#ffe0bd';g.font='10px monospace';g.fillText(boss.name+(boss.finalBoss?' · PHASE '+(boss.phase||1):''),viewWidth/2-110,57);}
  if(mapVisible&&outdoors)drawWorldMap(g,world,player,viewHeight);
  if(mapVisible&&!outdoors){const scale=2,mx=12,my=viewHeight-world.height*scale-32;g.fillStyle='#071014e8';g.fillRect(mx-4,my-4,world.width*scale+8,world.height*scale+8);for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(!world.solid[y*world.width+x]&&(!world.theme||world.explored?.has(y*world.width+x))){g.fillStyle='#65736b';g.fillRect(mx+x*scale,my+y*scale,scale,scale);}for(const d of world.doors){if(world.theme&&!world.explored?.has(d.y*world.width+d.x))continue;g.fillStyle=d.open?'#65736b':'#dbaf70';g.fillRect(mx+d.x*scale,my+d.y*scale,2,2);}for(const [p,color] of [[world.exit,'#d498ff'],[world.spawn,'#80dcdb'],...(!world.key.taken?[[world.key,'#ffd45b']]:[]),[player,'#ffffff']]){if(world.theme&&!world.explored?.has(Math.floor(p.y/32)*world.width+Math.floor(p.x/32)))continue;g.fillStyle=color;g.fillRect(mx+p.x/TILE*scale-2,my+p.y/TILE*scale-2,4,4);}g.fillStyle='#d9ddcf';g.font='8px monospace';g.fillText('M: MAP · gold key / violet exit',mx,my-9);}
}
function drawPreviews(time){document.querySelectorAll('.character canvas').forEach((c,i)=>{const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#080f1230';ctx.beginPath();ctx.ellipse(48,85,24,5,0,0,Math.PI*2);ctx.fill();assets.character(ctx,i*2+Math.floor(time/420)%2,48,86,70);});}
function frame(now){const elapsed=Math.min((now-last)/1000||0,0.1);last=now;fps+=(1/(elapsed||1/60)-fps)*.05;if(mode==='playing'){accumulator+=elapsed;while(accumulator>=1/60){simulate(1/60);accumulator-=1/60;}}else accumulator=0;render();if(mode==='selection')drawPreviews(now);requestAnimationFrame(frame);}
try {
  await assets.load((done,total)=>$('loading').textContent=`Loading supplied sheets · ${done} / ${total}`);
  for(const c of classes){const b=document.createElement('button');b.className='character';b.setAttribute('aria-label',c.name);b.innerHTML=`<span class="number">0${c.id+1}</span><canvas width="96" height="96"></canvas><span class="name">${c.name}</span>`;b.onclick=()=>select(c.id);$('characters').append(b);}
  select(0);
  refreshSaveButtons();
  const ready=coreSheets.every(id=>assets.atlases.has(id));$('begin').disabled=!ready;
  $('loading').textContent=assets.errors.length?`${assets.errors.length} sheet(s) unavailable — open Asset report${ready?'':'. Required combat art is missing.'}`:'Core artwork loaded · 111 sheets registered · Regions load on demand';
  requestAnimationFrame(frame);
}catch(error){$('fatal').hidden=false;$('fatal').textContent=`Unable to start: ${error.message}. Run the local server and open /game/.`;}
// Read-only inspection for acceptance tests and future development tools.
window.__descent={snapshot:()=>({mode,selected,player:{...player},camera:{...camera},loaded:assets.atlases.size,errors:[...assets.errors],frame:Math.floor(animation/.42)%2,debug,speed:debugSpeed.value,quest:adventure?.quests.objective}),assetReport:()=>[...assets.atlases].map(([id,a])=>({id,width:a.width,height:a.height,transparent:a.transparent,xLines:a.xLines,yLines:a.yLines}))};





