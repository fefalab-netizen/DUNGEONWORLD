export function presentEnding(a,panel){
 panel.replaceChildren();
 const add=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;panel.append(e);};
 add('h2','The first dawn');
 add('p','The Heart grows quiet in your hands. Beneath Dunbarrow, the singing stops. By morning the well runs clear, and the camp’s last lantern finally goes out. No one needs it now.');
 add('p','Aldric calls it a victory. Brunna charges him for the celebration. Merrin sleeps through the speeches.');
 add('p','Brother Pell turns the Heart toward the sunlight. Inside it, points of darkness answer one another across a map no one remembers drawing. The Underkeep was one prison among many. Somewhere far away, another door is opening.');
 const pr=a.progression,seconds=Math.floor(a.elapsed||0),stats=[
  ['Adventurer',pr.base.name],['Final level',pr.level],['Enemies defeated',a.totalKills||0],
  ['Dungeons completed',[...a.regions].filter(([id,r])=>['raider','chapel'].includes(id)&&r.world.bossDefeated).length+(a.quests.heraldDefeated?1:0)],
  ['Underkeep floors cleared',[...a.regions.values()].filter(r=>r.world.depth&&r.world.completed).length+' / 3'],
  ['Gold collected',pr.goldEarned||0],['Equipment acquired',pr.items.length+(pr.soldCount||0)],
  ['Time played',`${Math.floor(seconds/60)}m ${seconds%60}s`],['Secrets discovered',a.quests.secrets?.size||0],['Adventure seed',a.seed],
 ];
 const list=document.createElement('dl');list.className='run-summary';for(const [label,value]of stats){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);list.append(dt,dd);}panel.append(list);
 add('p','THE FIRST DESCENT · Heart recovered · Dunbarrow saved');
}
