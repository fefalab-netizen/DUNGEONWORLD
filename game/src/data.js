export const classes = [
  ['Dwarf Axeman','The stone oath','Durable axe fighter',130,112,16,8],
  ['Silver Knight','The last watch','Balanced sword fighter',120,120,14,10],
  ['Blue Wizard','The candle keeper','Powerful, fragile spellcaster',75,120,22,2],
  ['Green Cleric','The quiet mercy','Magic and sustain',100,116,13,6],
  ['Elf Ranger','The far wanderer','Precision and mobility',90,140,16,3],
  ['Hooded Rogue','The unseen blade','Speed and critical strikes',85,148,15,3],
  ['Barbarian','The broken crown','Heavy strikes, high health',145,108,21,4],
  ['Alchemist','The last experiment','Bombs and utility',95,124,16,4],
].map(([name,title,style,hp,speed,attack,defense],index)=>({id:index,name,title,style,hp,speed,attack,defense,frames:[index*2,index*2+1]}));

// Physical file IDs are deliberately independent of the planned semantic set numbers.
export const sheets = Array.from({length:100},(_,i)=>i+1).map(n=>({id:String(n).padStart(2,'0'),path:`assets/${String(n).padStart(2,'0')}.png`,character:[1,2,6,7,11,12,16,17,51,53,66,67,89,91,97,99,100].includes(n)}));
export const spriteRegistry = Object.fromEntries(sheets.flatMap(s=>Array.from({length:16},(_,cell)=>[
  `${s.id}.r${Math.floor(cell/4)+1}c${cell%4+1}`,{sheet:s.id,cell}
])));
export const art = {adventurers:'01',floor:'05',walls:'04',props:'03'};

