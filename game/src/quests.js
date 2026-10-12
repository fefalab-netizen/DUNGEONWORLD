export class Quests {
 constructor(){this.accepted=false;this.artifacts=new Set();this.lore=new Set();this.spoken=new Set();this.stairOpen=false;}
 get ready(){return this.artifacts.has('Iron Seal Key')&&this.artifacts.has('Rune of Opening');}
 get objective(){return this.stairOpen?'Black Stair unlocked — descent continues in milestone 7':this.ready?'Take both artifacts to the Black Stair, south of camp':!this.accepted?'Speak with Aldric Venn at camp':`Recover ${['Iron Seal Key','Rune of Opening'].filter(x=>!this.artifacts.has(x)).join(' and ')}`;}
 claim(theme,pr){const artifact=theme==='raider'?'Iron Seal Key':'Rune of Opening';if(this.artifacts.has(artifact))return null;this.artifacts.add(artifact);this.accepted=true;pr.gainXP(40);pr.gold+=50;pr.potions+=2;
  const item=pr.makeItem(theme==='raider'?'weapon':'armor',true);item.rarity=2;item.name=theme==='raider'?'Quartermaster’s Requisition':'Keeper’s Vestment';
  // Guaranteed upgrade even when the player arrived with unusually good equipment.
  const slot=item.slot,current=pr.equipment[slot];if(slot==='weapon')item.stats.attack=Math.max(12,(current?.stats.attack||0)+4);else{item.stats.defense=Math.max(6,(current?.stats.defense||0)+2);item.stats.hp=Math.max(18,(current?.stats.hp||0)+6);}pr.items.push(item);
  return `${artifact} secured! ${item.name}, 50 gold, two potions and 40 quest XP. J: journal.`;
 }
}
export function campNPCs(w){const {x,y}=w.spawn;return [
 {id:'aldric',name:'Aldric Venn',role:'Camp Warden',sheet:'53',frame:10,x:x-80,y:y-50},
 {id:'brunna',name:'Brunna',role:'Quartermaster',sheet:'51',frame:4,x:x+88,y:y-50},
 {id:'pell',name:'Brother Pell',role:'Scholar',sheet:'53',frame:6,x:x-80,y:y+80},
 {id:'merrin',name:'Merrin',role:'Wounded Scout',sheet:'51',frame:12,x:x+88,y:y+80},
 ];}
export function nearbyNPC(a){return a.world.kind==='overworld'?a.npcs.find(n=>Math.hypot(n.x-a.player.x,n.y-a.player.y)<44):null;}
export function dialogue(a,n){const q=a.quests;q.spoken.add(n.id);
 if(n.id==='aldric'){q.accepted=true;return q.stairOpen?'The stair is open. Enjoy the daylight while it lasts.':q.ready?'Both seals. You have done what my last three expeditions could not. Follow the southern road and open the Black Stair.':'Welcome to Dunbarrow. We have beds, soup, and increasingly unreasonable neighbors. Recover the Iron Seal Key from the Raider Cellar northwest, and the Rune of Opening from the Bone Chapel northeast. Either road comes first.';}
 if(n.id==='pell')return q.ready?'Iron binds the door; the rune tells it to remember. Take both to the Black Stair. Neither artifact can be sold.':'The chapel rite is simple: stand on the pressure plate, raise the lever, touch the altar. Its Keeper holds the Rune of Opening. The iron seal lies with the bandit Quartermaster. You need both to wake the Black Stair.';
 if(n.id==='merrin'){for(const l of a.overworld.landmarks.filter(l=>['raider','chapel'].includes(l.id)))for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)a.overworld.explored[(l.ty+dy)*256+l.tx+dx]=1;a.overworld.revealX=-1;return 'I marked both entrances on your map. Goblin archers hide behind their friends. Kill the friends. The Quartermaster lunges; step aside when he draws the long amber line. At the chapel, leave the violet circle before it burns. The cracked side passage is worth a look.';}
 return 'Supplies at honest prices. Mostly honest. Rest at the campfire for emergency potions; bring spare gear here to sell.';
}
export function buy(a,index){const item=a.shop[index],price=[35,30,40][index];if(!item||a.progression.gold<price)return false;a.progression.gold-=price;a.progression.items.push(item);a.shop[index]=null;return true;}
export function sell(a,id){const p=a.progression,item=p.items.find(i=>i.id===id);if(!item)return false;if(p.equipment[item.slot]?.id===id)p.unequip(item.slot);p.items=p.items.filter(i=>i.id!==id);p.gold+=8+item.rarity*8;return true;}
