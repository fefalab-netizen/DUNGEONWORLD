// Physical cells verified against supplied 02, 66 and 67 sheets (see sprite-usage.js).
const define=(id,name,frame,hp,speed,damage,xp,role,extra={})=>({id,name,sheet:'02',frame,frames:[frame,frame+1],hp,speed,damage,xp,role,kind:['ranged','caster','support','summoner'].includes(role)?'magic':'melee',armor:0,attackSpeed:1,range:role==='ranged'?210:['caster','support','summoner'].includes(role)?180:35,detection:260,faction:'raiders',biomes:['raider','overworld'],loot:{gold:1,rarity:0},rarity:'normal',abilities:[],statuses:[],cost:2,...extra});
export const monsters={
 grunt:define('grunt','Goblin Spearman',0,38,65,12,16,'grunt'),
 archer:define('archer','Goblin Archer',2,30,55,10,18,'ranged',{kind:'arrow',cost:3}),
 tank:define('tank','Orc Clubber',4,65,48,19,24,'tank',{armor:3,cost:4,resistance:.45}),
 scavenger:define('scavenger','Ratfolk Knife Fighter',6,28,85,9,14,'skirmisher',{abilities:['coward'],cost:2}),
 bandit:define('bandit','Bandit Swordsman',8,44,68,14,18,'ambusher'),
 cult:define('cult','Masked Fire Cultist',14,38,48,14,20,'caster',{faction:'chapel',biomes:['chapel'],cost:3,statuses:['slow']}),
 shaman:define('shaman','Jawbone Shaman',14,48,46,12,22,'support',{sheet:'66',frames:[10,11],faction:'chapel',biomes:['chapel'],abilities:['heal','ward'],cost:4}),
 summoner:define('summoner','Ossuary Caller',14,48,42,12,24,'summoner',{sheet:'66',frames:[14,15],faction:'chapel',biomes:['chapel'],abilities:['summon'],cost:4}),
 bone:define('bone','Bone Crawler',0,28,72,10,12,'skirmisher',{sheet:'67',faction:'chapel',biomes:['chapel'],cost:2}),
 quartermaster:define('quartermaster','Bandit Quartermaster',8,90,53,16,65,'miniboss',{boss:true,abilities:['lunge','reinforce'],cost:10}),
 keeper:define('keeper','Chapel Keeper',14,85,42,14,65,'miniboss',{boss:true,kind:'magic',range:180,faction:'chapel',biomes:['chapel'],abilities:['rune','summon'],cost:10}),
};
// Milestone 7.5C: region-specific roaming hostiles; colossal bosses remain reserved for 7.5D.
const expeditionMonster=(id,name,sheet,frame,hp,speed,damage,xp,role,biome,extra={})=>({
 ...monsters.grunt,id,name,sheet,frame,frames:[frame,frame+1],hp,speed,damage,xp,role,
 kind:role==='ranged'?'magic':'melee',faction:'frontier',biomes:[biome],
 detection:190,range:role==='ranged'?180:35,loot:{gold:1,rarity:0},cost:3,...extra
});
monsters.fireImp=expeditionMonster('fireImp','Cinder Imp','16',0,32,76,10,18,'skirmisher','volcanic');
monsters.hellhound=expeditionMonster('hellhound','Hellfire Hound','16',4,64,83,17,30,'hunter','volcanic');
monsters.magmaElemental=expeditionMonster('magmaElemental','Magma Elemental','16',6,105,43,24,43,'tank','volcanic',{armor:5,resistance:.3});
monsters.sporeling=expeditionMonster('sporeling','Sporeling','12',8,38,62,10,19,'skirmisher','jungle');
monsters.jungleStalker=expeditionMonster('jungleStalker','Redcap Stalker','12',0,72,66,16,31,'hunter','jungle');
monsters.fungalMage=expeditionMonster('fungalMage','Violetcap Spore Mage','12',4,54,48,15,32,'ranged','jungle');
monsters.frostStalker=expeditionMonster('frostStalker','Frostbound Hunter','06',6,74,69,18,33,'hunter','frozen');
monsters.iceWraith=expeditionMonster('iceWraith','Icebound Specter','07',6,61,54,16,32,'ranged','frozen');
monsters.coastRaider=expeditionMonster('coastRaider','Coast Marauder','02',8,76,67,17,32,'hunter','coast');
monsters.drownedWraith=expeditionMonster('drownedWraith','Drowned Wraith','06',8,64,55,16,34,'ranged','coast');
monsters.brute={...monsters.tank,id:'brute',name:'Orc Clubber Brute',hp:100,damage:24,armor:5,speed:43,cost:6,xp:36,abilities:['lunge']};
monsters.herald={...monsters.keeper,id:'herald',name:'The First Herald',finalBoss:true,hp:280,damage:24,armor:4,xp:180,abilities:['rune','summon'],loot:{gold:3,rarity:3}};
export const legacyMonsters=['grunt','archer','tank','scavenger','bandit','cult'].map(id=>monsters[id]);
export function hashSeed(value){let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export const variationCurves={hp:.85,damage:.35,reach:.45,speed:.18,reward:.8};
export function spawnMonster(species,id,x,y,seed,tier='normal'){
 const m=monsters[species];if(!m)throw new Error('Unknown monster '+species);
 if(tier==='boss'&&!m.boss)throw new Error('Boss tier requires an authorized boss encounter');
 const roll=hashSeed(`${seed}:${id}:${species}`)/4294967296,scale=tier==='boss'?2:tier==='elite'?1.4+roll*.3:.9+roll*.4;
 const delta=scale-1,c=variationCurves,mult=tier==='boss'?1.35:tier==='elite'?1.15:1;
 const hp=Math.round(m.hp*(1+delta*c.hp)*mult);
 return {...m,abilities:tier==='elite'&&m.kind==='melee'?[...m.abilities,'lunge']:m.abilities,attackSpeed:tier==='elite'?1.15:m.attackSpeed,species,scale,tier,hp,maxHp:hp,damage:Math.round(m.damage*(1+delta*c.damage)),speed:m.speed*Math.max(.75,1-delta*c.speed),range:m.range*(m.kind==='melee'?1+delta*c.reach:1),xp:Math.round(m.xp*(1+delta*c.reward)),reward:1+delta*c.reward,resistance:Math.min(.8,(m.resistance||0)+Math.max(0,delta)*.4),radius:Math.min(14,8*scale),id,x,y,post:{x,y},state:'idle',timer:0,cooldown:1,flash:0,slow:0,alert:false,angle:0,pathTimer:0,tacticalTimer:0,waypoint:null,abilityCooldown:3,stuck:0,ward:0};
}
