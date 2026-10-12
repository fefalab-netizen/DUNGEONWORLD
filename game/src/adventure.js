import {createStoryDungeon,interactStory} from './story-dungeon.js?v=6.0';
import {Quests,campNPCs} from './quests.js?v=6.0';
import {createOverworld,nearbyLandmark} from './overworld.js?v=6.0';
import {createDungeon,interactDungeon} from './dungeon.js?v=6.0';
import {Combat} from './combat.js?v=6.0';
import {Progression} from './progression.js?v=6.0';

// Region state survives travel: enemies, doors, loot and chests are not regenerated.
export class Adventure {
 constructor(seed,hero,player,onNotice=()=>{}){
  this.seed=seed;this.player=player;this.onNotice=onNotice;this.progression=new Progression(hero,player);this.regions=new Map();this.quests=new Quests();this.shop=['weapon','armor','trinket'].map(slot=>this.progression.makeItem(slot,true));
  this.overworld=createOverworld(seed);this.npcs=campNPCs(this.overworld);this.progression.seed=this.overworld.numericSeed;this.travel('overworld',this.overworld,this.overworld.spawn,true);
 }
 travel(id,world,position,first=false){
  const p=this.player,pr=this.progression,hp=p.hp,xp=p.xp||0;
  if(this.current)this.current.drops=pr.drops;
  let region=this.regions.get(id);
  if(!region){const combat=new Combat(world,p,pr.stats);combat.randomState=world.numericSeed||1;combat.start();region={world,combat,drops:[]};this.regions.set(id,region);
   combat.onDefeat=(enemy)=>{this.totalKills=(this.totalKills||0)+1;if(!enemy.noLoot)pr.drop(enemy,this.totalKills);if(enemy.boss){world.bossDefeated=true;const message=this.quests.claim(world.theme,pr);if(message)this.onNotice(message);}if(pr.gainXP(enemy.xp))this.onNotice(`Level ${pr.level}! Press C to improve your stats.`);};
  }
  this.current=region;this.regionId=id;pr.drops=region.drops;Object.assign(p,position,{hp:first?pr.stats.hp:hp,xp,angle:0,flip:true,flash:0,invulnerable:0,dodge:0,cooldown:0,dodgeCooldown:0});
  region.combat.projectiles=[];region.combat.effects=[];region.combat.numbers=[];
 }
 get world(){return this.current.world;}
 get combat(){return this.current.combat;}
 interact(){
  const p=this.player,w=this.world,pr=this.progression;
  if(w.kind==='overworld'){
   const l=nearbyLandmark(w,p);if(!l)return 'Follow the roads to explore Dunbarrow.';
   if(l.id==='camp'){p.hp=pr.stats.hp;pr.potions=Math.max(2,pr.potions);return 'Rested at camp. Health restored; at least two potions supplied. West: Raider Cellar. East: Bone Chapel.';}
   if(['raider','chapel'].includes(l.id)){this.returnPosition={x:l.x,y:l.y+64};const dungeon=this.regions.get(l.id)?.world||createStoryDungeon(this.seed+':'+l.id,l.id,pr.level,this.quests.artifacts.size);dungeon.name=l.name;this.travel(l.id,dungeon,dungeon.spawn);return `Entered ${l.name}. Use the entrance stairs to return anytime.`;}
   if(l.id==='underkeep'){if(!this.quests.ready)return 'The Black Stair is sealed. Recover the Iron Seal Key and Rune of Opening.';this.quests.stairOpen=true;return 'The iron seal turns; the rune ignites. The Black Stair is OPEN. Milestone 6 complete — the three-floor descent begins in milestone 7.';}
   return {bandit:'Bandit Road — the Raider Cellar lies northwest. Follow the roads.',ridge:'North Ridge — roads lead southwest to the Cellar and southeast to the Chapel.',grave:'Grave Path — the Bone Chapel lies northeast. Follow the roads.',approach:'Sealed Stair Approach — the Black Stair lies to the south.'}[l.id];
  }
  const result=w.theme?interactStory(w,p,pr,this.quests):interactDungeon(w,p,pr,this.combat.finished);
  if(result==='entrance'||result==='complete'){this.travel('overworld',this.overworld,this.returnPosition);return result==='complete'?`${w.name} cleared. Returned to Dunbarrow with your equipment and rewards.`:'Returned to Dunbarrow.';}
  return result;
 }
}
