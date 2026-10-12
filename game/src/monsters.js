// Physical cells verified against supplied 02, 66 and 67 sheets (see sprite-usage.js).
const define=(id,name,frame,hp,speed,damage,xp,role,extra={})=>({id,name,sheet:'02',frame,frames:[frame,frame+1],hp,speed,damage,xp,role,kind:['ranged','caster','support','summoner'].includes(role)?'magic':'melee',armor:0,attackSpeed:1,range:role==='ranged'?210:['caster','support','summoner'].includes(role)?180:35,detection:260,faction:'raiders',biomes:['raider','overworld'],loot:{gold:1,rarity:0},rarity:'normal',abilities:[],statuses:[],cost:2,...extra});
export const monsters={
 grunt:define('grunt','Goblin Grunt',0,38,65,12,16,'grunt'),
 archer:define('archer','Goblin Archer',2,30,55,10,18,'ranged',{kind:'arrow',cost:3}),
 tank:define('tank','Orc Raider',4,65,48,19,24,'tank',{armor:3,cost:4,resistance:.45}),
 scavenger:define('scavenger','Ratfolk Scavenger',6,28,85,9,14,'skirmisher',{abilities:['coward'],cost:2}),
 bandit:define('bandit','Masked Bandit',8,44,68,14,18,'ambusher'),
 cult:define('cult','Cult Initiate',14,38,48,14,20,'caster',{faction:'chapel',biomes:['chapel'],cost:3,statuses:['slow']}),
 shaman:define('shaman','Bone Shaman',10,48,46,12,22,'support',{sheet:'66',frames:[10,11],faction:'chapel',biomes:['chapel'],abilities:['heal','ward'],cost:4}),
 summoner:define('summoner','Ossuary Caller',14,48,42,12,24,'summoner',{sheet:'66',frames:[14,15],faction:'chapel',biomes:['chapel'],abilities:['summon'],cost:4}),
 bone:define('bone','Bone Crawler',0,28,72,10,12,'skirmisher',{sheet:'67',faction:'chapel',biomes:['chapel'],cost:2}),
 quartermaster:define('quartermaster','Bandit Quartermaster',8,90,53,16,65,'miniboss',{boss:true,abilities:['lunge','reinforce'],cost:10}),
 keeper:define('keeper','Chapel Keeper',14,85,42,14,65,'miniboss',{boss:true,kind:'magic',range:180,faction:'chapel',biomes:['chapel'],abilities:['rune','summon'],cost:10}),
};
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
