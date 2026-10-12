import {rarities,colors,xpNeeded} from './progression.js?v=6.0';
const labels={hp:'Max HP',attack:'Power',defense:'Defense',speed:'Speed',crit:'Critical chance',haste:'Attack speed'};
const value=(key,n)=>['crit','haste'].includes(key)?`${Math.round(n*100)}%`:n;
export function openInventory(progression,assets,characterOnly=false){
 const dialog=document.getElementById('gear');let selected=progression.items[0]?.id;
 function draw(){const p=progression,s=p.recalculate();dialog.innerHTML=`<button class="close" id="closeGear">Return · Esc</button><h2>${p.base.name} · Level ${p.level}</h2><p>${p.xp} / ${xpNeeded(p.level)} XP · ${p.gold} gold · ${p.potions} healing potions</p><div class="gear-stats">${Object.entries(labels).map(([k,label])=>`<span>${label}: <b>${value(k,s[k])}</b></span>`).join('')}</div><p>Unspent improvements: ${p.points}</p><div id="improvements"></div><h3>Equipment</h3><div id="slots"></div>${characterOnly?'':'<h3>Inventory</h3><div class="gear-layout"><div id="itemList"></div><div id="itemDetails">Collect gear by walking over drops.</div></div>'}<p>Healing potion: restore 40% max HP. No potion is consumed at full health.</p><button id="drink">Drink potion · 1</button><p class="muted">The chamber pauses while this panel is open. Progress lasts until you restart or choose another character; save/load comes in Milestone 8.</p>`;
 document.getElementById('closeGear').onclick=()=>dialog.close();
 for(const stat of ['attack','defense','hp']){const b=document.createElement('button');b.textContent=`+${stat==='hp'?12:stat==='attack'?3:2} ${labels[stat]}`;b.disabled=!p.points;b.onclick=()=>{p.improve(stat);draw();};document.getElementById('improvements').append(b);}
 for(const [slot,item]of Object.entries(p.equipment)){const b=document.createElement('button');b.textContent=`${slot}: ${item?.name||'Base gear'}${item?' · Unequip':''}`;b.disabled=!item;b.onclick=()=>{p.unequip(slot);draw();};document.getElementById('slots').append(b);}
 document.getElementById('drink').disabled=!p.potions||p.player.hp>=s.hp;document.getElementById('drink').onclick=()=>{p.usePotion();draw();};
 if(characterOnly)return;
 for(const item of p.items){const b=document.createElement('button');b.className='gear-item';b.style.borderColor=colors[item.rarity];const c=document.createElement('canvas');c.width=40;c.height=40;assets.draw(c.getContext('2d'),item.sheet,item.cell,2,2,36,36);const span=document.createElement('span');span.textContent=`${item.name}${p.equipment[item.slot]?.id===item.id?' · equipped':''}`;b.append(c,span);b.onclick=()=>{selected=item.id;details();};document.getElementById('itemList').append(b);}
 details();
 }
 function details(){const p=progression,item=p.items.find(i=>i.id===selected);if(!item)return;const current=p.equipment[item.slot],keys=new Set([...Object.keys(item.stats),...Object.keys(current?.stats||{})]);const el=document.getElementById('itemDetails');el.innerHTML=`<h3 style="color:${colors[item.rarity]}">${item.name}</h3><p>${rarities[item.rarity]} · ${item.slot} · Compatible with your class</p><p>Compared with ${current?.name||'base gear'}:</p>${[...keys].map(k=>{const delta=(item.stats[k]||0)-(current?.stats[k]||0);return `<p>${labels[k]}: +${value(k,item.stats[k]||0)} <b style="color:${delta>=0?'#8bdd9d':'#ff9786'}">(${delta>=0?'+':''}${value(k,delta)})</b></p>`;}).join('')}<button id="equipItem">Equip</button>`;document.getElementById('equipItem').disabled=current?.id===item.id;document.getElementById('equipItem').onclick=()=>{p.equip(item.id);draw();};}
 draw();dialog.showModal();
}

