import {monsters} from './monsters.js?v=6.0';
// Zero-based cells. New character pairs checked against the attached source sheets.
export const spriteUsage=[
 ...Object.values(monsters).flatMap(m=>m.frames.map(cell=>({sheet:m.sheet,cell,use:m.name,pair:true}))),
 ...[['53',10,'Aldric: elder noble'],['51',4,'Brunna: smith'],['53',6,'Pell: scholar'],['51',12,'Merrin: scout']].flatMap(([sheet,cell,use])=>[cell,cell+1].map(cell=>({sheet,cell,use,pair:true}))),
 {sheet:'68',cell:0,use:'Chapel bone floor'},{sheet:'69',cell:0,use:'Chapel rib wall'},{sheet:'70',cell:9,use:'Chapel ossuary urns'},
 {sheet:'70',cell:3,use:'Ritual altar'},{sheet:'64',cell:5,use:'Ritual lever'},{sheet:'68',cell:4,use:'Pressure plate'},
];
export const coreSheets=['01','02','03','04','05','51','53','81','82','83','84','85','86','87','88','89','95','96','98','99','100'];
