import {monsters} from './monsters.js?v=7.5d';
// Zero-based cells, based on the user-reviewed 111-sheet visual audit.
export const spriteUsage=[
 ...Object.values(monsters).flatMap(m=>m.frames.map(cell=>({sheet:m.sheet,cell,use:m.name,pair:true}))),
 ...[['53',10,'Aldric: elder noble'],['51',4,'Brunna: smith'],['53',6,'Pell: scholar'],['51',12,'Merrin: scout']].flatMap(([sheet,cell,use])=>[cell,cell+1].map(cell=>({sheet,cell,use,pair:true}))),
 {sheet:'68',cell:0,use:'Chapel bone floor'},{sheet:'69',cell:0,use:'Chapel rib wall'},{sheet:'70',cell:9,use:'Chapel ossuary urns'},
 {sheet:'90',cell:0,use:'Stone ritual altar'},{sheet:'95',cell:0,use:'Ritual lever (down)'},{sheet:'95',cell:1,use:'Ritual lever (up)'},{sheet:'95',cell:2,use:'Pressure plate (up)'},{sheet:'95',cell:3,use:'Pressure plate (down)'},
 {sheet:'03',cell:4,use:'Closed chest'},{sheet:'03',cell:5,use:'Open chest'},{sheet:'03',cell:2,use:'Wooden barrel'},{sheet:'05',cell:0,use:'Stone dungeon floor'},
];
// Keep common exterior transitions and authored masonry/ground loaded during normal play.
// Biome wildlife and other extended sheets remain on-demand.
export const coreSheets=['01','02','03','04','05','51','53','81','82','83','84','85','86','87','88','89','90','93','95','96','98','99','100','101','102'];
