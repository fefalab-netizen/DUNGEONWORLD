import {monsters,spawnMonster,hashSeed} from './monsters.js?v=7.5a-audit';
import {canOccupy} from './world.js?v=7.0';
import {readOverrides} from './content-config.js?v=8';
export function encounterBudget(depth,progress,roomType,level){return Math.max(2,Math.min(20,4+Math.floor(depth/2)+Math.min(3,progress)+Math.min(2,Math.floor((level-1)/3))+(roomType==='treasure'?3:0)+readOverrides().encounters.budgetBonus));}
export function directEncounter(world,room,level=1,progress=0){
 const budget=encounterBudget(room.id,progress,room.type,level),pool=world.theme==='raider'?['grunt','archer','bandit','scavenger','tank']:['bone','cult','shaman','summoner'];
 let remaining=budget,roll=hashSeed(world.seed+':room:'+room.id),out=[];
 const points=[[room.cx-3,room.cy-2],[room.cx+3,room.cy-2],[room.cx,room.cy+3],[room.cx-3,room.cy+3],[room.cx+3,room.cy+3]];
 for(const [x,y]of points){const options=pool.filter(id=>monsters[id].cost<=remaining&&(!out.length||!['support','summoner','ranged','caster'].includes(monsters[id].role)||out.filter(s=>['support','summoner','ranged','caster'].includes(monsters[s[2]].role)).length<2));if(!options.length)break;
  roll=(Math.imul(roll,1664525)+1013904223)>>>0;const species=options[roll%options.length],tier=room.optional&&out.length===0?'elite':room.id>2&&out.length===0&&((roll>>>16)%100)<20+Math.round(readOverrides().encounters.eliteChanceBonus*100)?'elite':'normal';
  const e=spawnMonster(species,room.id*10+out.length,(x+.5)*32,(y+.5)*32,world.seed,tier);
  if(canOccupy(world,e.x,e.y,e.radius)){out.push([x,y,species,tier]);remaining-=monsters[species].cost*(tier==='elite'?1.5:1);}
 }return out;
}
