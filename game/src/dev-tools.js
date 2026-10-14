// User-triggered content editors and generator checks — never runs checks on page load.
import {monsters} from './monsters.js?v=8';
import {readOverrides,writeOverrides,clearOverrides,editableStats,normalizeOverrides} from './content-config.js?v=8';
import {createDungeon,validateDungeon} from './dungeon.js?v=7.5e-room-layout';
import {createStoryDungeon,validateStoryDungeon} from './story-dungeon.js?v=8';
import {createUnderkeep} from './underkeep.js?v=8';
import {createGrandHall} from './grand-hall.js?v=8';
import {createLegendaryDungeon,validateLegendaryDungeon} from './legendary-dungeons.js?v=8';
import {createOverworld,validateOverworld} from './overworld.js?v=8';

const $=id=>document.getElementById(id);
let profile=readOverrides();
const status=message=>{$('toolStatus').textContent=message;};
const download=(name,body)=>{
 const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b===button));
 document.querySelectorAll('.tool-module').forEach(panel=>panel.hidden=panel.id!==button.dataset.tab);
});
for(const m of Object.values(monsters)){
 const option=document.createElement('option');option.value=m.id;option.textContent=m.name+' ('+m.id+')';$('monsterSelect').append(option);
}
function showMonster(){
 const id=$('monsterSelect').value,base=monsters[id],saved=profile.monsters[id]||{};
 const grid=$('monsterFields');grid.replaceChildren();
 for(const stat of editableStats){
  const field=document.createElement('label');field.textContent=stat+' · current '+base[stat];
  const input=document.createElement('input');input.type='number';input.min=0;input.max=10000;
  input.step=stat==='attackSpeed'?'0.05':'1';input.dataset.stat=stat;
  input.placeholder='Default ('+base[stat]+')';
  input.value=saved[stat]??'';
  field.append(input);grid.append(field);
 }
}
$('monsterSelect').onchange=showMonster;
$('monsterSave').onclick=()=>{
 try{
  const id=$('monsterSelect').value,next={};
  for(const input of $('monsterFields').querySelectorAll('input')){
   if(input.value.trim()==='')continue;
   const n=Number(input.value);if(!Number.isFinite(n)||n<0||n>10000)throw new Error('Value out of range: '+input.dataset.stat);
   next[input.dataset.stat]=n;
  }
  if(Object.keys(next).length)profile.monsters[id]=next;else delete profile.monsters[id];
  profile=writeOverrides(profile);status('Saved '+id+'. Refresh the game to apply the new profile.');
 }catch(error){status(error.message);}
};
$('monsterReset').onclick=()=>{delete profile.monsters[$('monsterSelect').value];profile=writeOverrides(profile);showMonster();status('Creature override cleared. Refresh the game.');};
function showEncounters(){
 $('budgetBonus').value=profile.encounters.budgetBonus;
 $('eliteChance').value=Math.round(profile.encounters.eliteChanceBonus*100);
}
$('encountersSave').onclick=()=>{
 try{
  profile.encounters.budgetBonus=Number($('budgetBonus').value);
  profile.encounters.eliteChanceBonus=Number($('eliteChance').value)/100;
  profile=writeOverrides(profile);showEncounters();status('Encounter balance saved. Start a new run to regenerate encounters.');
 }catch(error){status(error.message);}
};
const doorReachable=(world,target)=>{
 const w=world.width,h=world.height,seen=new Uint8Array(w*h);
 const sx=Math.floor(world.spawn.x/32),sy=Math.floor(world.spawn.y/32),start=sy*w+sx,goal=Math.floor(target.y/32)*w+Math.floor(target.x/32);
 const doors=new Set((world.doors||[]).map(d=>d.y*w+d.x));
 const queue=[start];seen[start]=1;
 for(let i=0;i<queue.length;i++){
  const n=queue[i];if(n===goal)return true;
  const x=n%w,y=Math.floor(n/w);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const nx=x+dx,ny=y+dy,k=ny*w+nx;
   if(nx<0||ny<0||nx>=w||ny>=h||seen[k]||(world.solid[k]&&!doors.has(k)))continue;
   seen[k]=1;queue.push(k);
  }
 }
 return false;
};
function oneCheck(type,seed){
 let w,report;
 if(type==='classic'){w=createDungeon(seed);report=validateDungeon(w);}
 else if(type==='raider'||type==='chapel'){w=createStoryDungeon(seed+':'+type,type,1,0);report=validateStoryDungeon(w);}
 else if(type.startsWith('underkeep')){w=createUnderkeep(seed,Number(type.at(-1)));report=validateStoryDungeon(w);}
 else if(type==='grandhall'){
  w=createGrandHall(seed);
  const ok=doorReachable(w,w.exit)&&w.rooms.length===5&&w.edges.every(([a,b])=>b===a+1);
  report={valid:ok,errors:ok?[]:['Grand Hall mandatory chamber or exit route invalid']};
 }
 else if(type==='labyrinth'||type==='threeWings'){
  w=createLegendaryDungeon(type,seed);const ok=validateLegendaryDungeon(w);
  report={valid:ok,errors:ok?[]:['Legendary dungeon objectives are unreachable']};
 }
 else if(type==='dunwood'||type==='expedition'){
  w=createOverworld(seed,type==='expedition');report=validateOverworld(w);
 }else throw new Error('Unknown generation type');
 return {report,rooms:w.rooms?.length??0,enemies:w.enemySpawns?.length??0,width:w.width,height:w.height};
}
$('runGeneration').onclick=()=>{
 const type=$('generationType').value,seed=$('generationSeed').value.trim()||'Dunbarrow';
 const count=Math.min(25,Math.max(1,Math.floor(Number($('generationRuns').value)||1)));
 const lines=[];let passed=0;
 // Checks are intentionally synchronous and run only in this button handler.
 for(let i=0;i<count;i++){
  const sample=i?seed+'-'+i:seed;
  try{
   const {report,rooms,enemies,width,height}=oneCheck(type,sample);
   if(report.valid)passed++;
   lines.push((report.valid?'PASS':'FAIL')+' · '+sample+' · '+width+'×'+height+' · rooms '+rooms+' · enemies '+enemies+
    (report.errors?.length?' · '+report.errors.slice(0,4).join('; '):''));
  }catch(error){lines.push('ERROR · '+sample+' · '+error.message);}
 }
 $('generationResults').textContent=passed+' / '+count+' checks passed\n'+lines.join('\n');
 status('Generation checks finished. No active-game state was changed.');
};
$('exportContent').onclick=()=>{download('the-first-descent-content-profile.json',JSON.stringify(profile,null,2));status('Content profile exported.');};
$('importContent').onclick=()=>$('contentFile').click();
$('contentFile').onchange=async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{if(file.size>100000)throw new Error('Profile exceeds 100 KB.');
  const raw=await file.text();profile=writeOverrides(normalizeOverrides(JSON.parse(raw)));
  showMonster();showEncounters();status('Profile imported. Refresh the game to apply it.');
 }catch(error){status('Import failed: '+error.message);}
};
$('resetContent').onclick=()=>{
 if(!confirm('Clear all locally saved developer content overrides?'))return;
 clearOverrides();profile=readOverrides();showMonster();showEncounters();
 status('All editor overrides cleared. Refresh the game.');
};
showMonster();showEncounters();
