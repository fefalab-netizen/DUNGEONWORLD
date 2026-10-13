import {dialogue,buy,sell} from './quests.js?v=7.0';
export function openStory(a,npc,close){
 const panel=document.getElementById('story');panel.replaceChildren();const heading=document.createElement('h2');heading.textContent=npc?`${npc.name} · ${npc.role}`:'Journal · The Black Stair';panel.append(heading);
 const text=value=>{const p=document.createElement('p');p.textContent=value;panel.append(p);};
 const button=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;panel.append(b);return b;};
 if(npc){text(dialogue(a,npc));if(npc.id==='brunna'){
  text(`Gold: ${a.progression.gold}`);a.shop.forEach((item,i)=>{if(item)button(`Buy ${item.name} · ${[35,30,40][i]} gold`,()=>{buy(a,i);openStory(a,npc,close);}).disabled=a.progression.gold<[35,30,40][i];});
  for(const item of a.progression.items)button(`Sell ${item.name}${a.progression.equipment[item.slot]?.id===item.id?' (equipped)':''} · ${8+item.rarity*8} gold`,()=>{sell(a,item.id);openStory(a,npc,close);});
 }}else{ text(a.quests.objective);for(const [name,place]of [['Iron Seal Key','Raider Cellar · northwest'],['Rune of Opening','Bone Chapel · northeast']])text(`${a.quests.artifacts.has(name)?'✓ Recovered':'○ Recover'} ${name} — ${place}`);if(a.quests.stairOpen)text('The First Descent: '+(a.quests.heraldDefeated?'Herald defeated · Heart recovered':'Underkeep floor '+(a.quests.depth||1)+' / 3'));text('Optional discoveries');for(const entry of a.quests.lore)text(entry);text('Progress is retained during this adventure. Disk save/load arrives in milestone 8.');}
 button('Return to adventure',()=>{panel.close();close();});if(!panel.open)panel.showModal();
}
