export const rarities=['Common','Uncommon','Rare','Epic'];
export const colors=['#c7c9bd','#8bdd9d','#82bcff','#d69aff'];
const weaponNames=['Axe','Sword','Frost Staff','Sacred Staff','Bow','Dagger','Great Axe','Bomb Focus'];
const weaponIcons=[4,0,14,12,8,2,6,13];
export const xpNeeded=level=>80+(level-1)*50;
export class Progression {
 constructor(base,player){this.base=base;this.player=player;this.level=1;this.xp=0;this.gold=0;this.goldEarned=0;this.soldCount=0;this.points=0;this.potions=2;this.bonus={attack:0,defense:0,hp:0};this.items=[];this.equipment={weapon:null,armor:null,trinket:null};this.drops=[];this.serial=0;this.seed=491;this.wave=1;this.stats={...base};}
 addGold(amount){this.gold+=amount;this.goldEarned+=amount;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 recalculate(){const b=this.base,s={...b,hp:b.hp+(this.level-1)*8+this.bonus.hp,attack:b.attack+(this.level-1)*2+this.bonus.attack,defense:b.defense+(this.level-1)+this.bonus.defense,crit:b.id===5?.25:.08,haste:0};for(const item of Object.values(this.equipment))if(item)for(const [key,value]of Object.entries(item.stats))s[key]+=value;s.crit=Math.min(.65,s.crit);s.haste=Math.min(.6,s.haste);Object.assign(this.stats,s);this.player.hp=Math.min(this.player.hp,s.hp);return s;}
 equip(id){const item=this.items.find(i=>i.id===id);if(!item)return false;this.equipment[item.slot]=item;this.recalculate();return true;}
 unequip(slot){this.equipment[slot]=null;this.recalculate();}
 gainXP(amount){this.xp+=amount;let levels=0;while(this.xp>=xpNeeded(this.level)){this.xp-=xpNeeded(this.level);this.level++;this.points++;levels++;this.recalculate();if(this.player.hp>0)this.player.hp=Math.min(this.stats.hp,this.player.hp+Math.round(this.stats.hp*.25));}return levels;}
 improve(stat){if(!this.points||!['attack','defense','hp'].includes(stat))return false;this.points--;this.bonus[stat]+=stat==='hp'?12:stat==='attack'?3:2;this.recalculate();return true;}
 usePotion(){if(!this.potions||this.player.hp<=0||this.player.hp>=this.stats.hp)return false;this.potions--;this.player.hp=Math.min(this.stats.hp,this.player.hp+Math.round(this.stats.hp*.4));return true;}
 makeItem(slot,guaranteed=false){const roll=this.random(),rarity=guaranteed?1:roll<.5?0:roll<.8?1:roll<.96?2:3,power=1+rarity+Math.floor((this.wave-1)/2);const stats=slot==='weapon'?{attack:4*power}:slot==='armor'?{defense:2*power,hp:6*power}:{crit:.02*power,haste:.04*power};return {id:++this.serial,slot,rarity,stats,name:`${rarities[rarity]} ${slot==='weapon'?weaponNames[this.base.id]:slot==='armor'?'Armor':'Sun Charm'}`,sheet:slot==='weapon'?'86':slot==='armor'?'87':'98',cell:slot==='weapon'?weaponIcons[this.base.id]:slot==='armor'?8:3};}
 drop(enemy,kill){const slot=kill===1?'weapon':['weapon','armor','trinket'][(kill-1)%3];this.drops.push({x:enemy.x,y:enemy.y,item:this.makeItem(slot,kill===1||enemy.tier==='elite'),gold:Math.round((5+Math.floor(this.random()*9))*(enemy.reward||1)*(enemy.loot?.gold||1)),potions:kill%2===1?1:0});}
 collect(player,clear){const found=[];this.drops=this.drops.filter(d=>{if(Math.hypot(d.x-player.x,d.y-player.y)>30||!clear(player,d))return true;this.items.push(d.item);this.addGold(d.gold);this.potions+=d.potions;found.push(d.item);return false;});return found;}
}

