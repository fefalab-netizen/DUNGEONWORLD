import {createUnderkeep,interactUnderkeep} from './underkeep.js?v=7.0';
import {createStoryDungeon,interactStory} from './story-dungeon.js?v=7.0';
import {Quests,campNPCs} from './quests.js?v=7.0';
import {createOverworld,nearbyLandmark} from './overworld.js?v=7.0';
import {createDungeon,interactDungeon} from './dungeon.js?v=7.0';
import {Combat} from './combat.js?v=7.0';
import {Progression} from './progression.js?v=7.0';

// Region state survives travel: enemies, doors, loot and chests are not regenerated.
export class Adventure {
 constructor(seed,hero,player,onNotice=()=>{}){
  this.elapsed=0;this.seed=seed;this.player=player;this.onNotice=onNotice;this.progression=new Progression(hero,player);this.regions=new Map();this.quests=new Quests();this.shop=['weapon','armor','trinket'].map(slot=>this.progression.makeItem(slot,true));
  this.overworld=createOverworld(seed);this.npcs=campNPCs(this.overworld);this.progression.seed=this.overworld.numericSeed;this.travel('overworld',this.overworld,this.overworld.spawn,true);
 }
 travel(id,world,position,first=false){
  const p=this.player,pr=this.progression,hp=p.hp,xp=p.xp||0;
  if(this.current)this.current.drops=pr.drops;
  let region=this.regions.get(id);
  if(!region){const combat=new Combat(world,p,pr.stats);combat.randomState=world.numericSeed||1;combat.start();combat.onNotice=this.onNotice;if(world.depth===2)for(const e of combat.enemies)e.faction='underkeep';region={world,combat,drops:[]};this.regions.set(id,region);
   combat.onDefeat=(enemy)=>{this.totalKills=(this.totalKills||0)+1;if(!enemy.noLoot)pr.drop(enemy,this.totalKills);if(enemy.finalBoss){
    world.bossDefeated=true;this.quests.heraldDefeated=true;this.quests.artifacts.add('Heart of the Underkeep');
    for(const e of combat.enemies)if(e.summoner===enemy.id){e.hp=0;e.state='dead';}enemy.runes=[];combat.projectiles=[];world.traps=[];
    const reward=pr.makeItem('trinket',true);Object.assign(reward,{name:'Heartward Seal',rarity:3,stats:{crit:.12,haste:.2,hp:30}});pr.items.push(reward);pr.addGold(150);pr.potions+=3;
    this.onNotice('The First Herald falls. The Heart of the Underkeep is yours. Use the exit to return to Dunbarrow, then speak with Aldric.');
   }else if(enemy.boss){world.bossDefeated=true;const message=this.quests.claim(world.theme,pr);if(message)this.onNotice(message);}if(pr.gainXP(enemy.xp))this.onNotice(`Level ${pr.level}! Press C to improve your stats.`);};
  }
  this.current=region;this.regionId=id;pr.drops=region.drops;Object.assign(p,position,{hp:first?pr.stats.hp:hp,xp,angle:0,flip:true,flash:0,invulnerable:0,dodge:0,cooldown:0,dodgeCooldown:0});
  region.combat.projectiles=[];region.combat.effects=[];region.combat.numbers=[];pr.wave=world.depth?world.depth*2+1:1;
 }
 enterUnderkeep(depth,fromBelow=false){
  const id='underkeep-'+depth,w=this.regions.get(id)?.world||createUnderkeep(this.seed,depth);
  this.quests.stairOpen=true;this.quests.depth=depth;this.travel(id,w,fromBelow?w.exit:w.spawn);
  return 'Entered '+w.name+'. Cyan stairs ascend; violet stairs descend.';
 }
 get world(){return this.current.world;}
 get combat(){return this.current.combat;}
 interact(){
  const p=this.player,w=this.world,pr=this.progression;
  if(w.kind==='overworld'){
   const l=nearbyLandmark(w,p);if(!l)return 'Follow the roads to explore Dunbarrow.';
   if(l.id==='camp'){p.hp=pr.stats.hp;pr.potions=Math.max(2,pr.potions);return 'Rested at camp. Health restored; at least two potions supplied. West: Raider Cellar. East: Bone Chapel.';}
   if(['raider','chapel'].includes(l.id)){this.returnPosition={x:l.x,y:l.y+64};const dungeon=this.regions.get(l.id)?.world||createStoryDungeon(this.seed+':'+l.id,l.id,pr.level,this.quests.artifacts.size);dungeon.name=l.name;this.travel(l.id,dungeon,dungeon.spawn);return `Entered ${l.name}. Use the entrance stairs to return anytime.`;}
   if(l.id==='underkeep'){if(!this.quests.ready)return 'The Black Stair is sealed. Recover the Iron Seal Key and Rune of Opening.';this.underkeepReturn={x:l.x,y:l.y+64};return this.enterUnderkeep(1);}
   return {bandit:'Bandit Road — the Raider Cellar lies northwest. Follow the roads.',ridge:'North Ridge — roads lead southwest to the Cellar and southeast to the Chapel.',grave:'Grave Path — the Bone Chapel lies northeast. Follow the roads.',approach:'Sealed Stair Approach — the Black Stair lies to the south.'}[l.id];
  }
  if(w.depth){
   const result=interactUnderkeep(w,p,pr,this.quests);
   if(result==='descend')return this.enterUnderkeep(w.depth+1);
   if(result==='ascend'&&w.depth>1)return this.enterUnderkeep(w.depth-1,true);
   if(result==='ascend'||result==='escape'){
    const camp=result==='escape';this.travel('overworld',this.overworld,camp?this.overworld.spawn:this.underkeepReturn);
    return camp?'The Heart is silent. You emerge into the dawn at Dunbarrow. Speak with Aldric Venn to finish the adventure.':'Returned to the Black Stair entrance.';
   }return result;
  }
  const result=w.theme?interactStory(w,p,pr,this.quests):interactDungeon(w,p,pr,this.combat.finished);
  if(result==='entrance'||result==='complete'){this.travel('overworld',this.overworld,this.returnPosition);return result==='complete'?`${w.name} cleared. Returned to Dunbarrow with your equipment and rewards.`:'Returned to Dunbarrow.';}
  return result;
 }
}
