// Milestone 8 — optional developer balancing profiles. No gameplay edits until explicitly saved.
export const CONTENT_KEY='first-descent.m8.content';
export const editableStats=['hp','speed','damage','detection','attackSpeed','armor'];
export const defaultEncounters={budgetBonus:0,eliteChanceBonus:0};
export function readOverrides(){
 try{
  const raw=localStorage.getItem(CONTENT_KEY);
  if(!raw)return {monsters:{},encounters:{...defaultEncounters}};
  const parsed=JSON.parse(raw);
  return normalizeOverrides(parsed);
 }catch{return {monsters:{},encounters:{...defaultEncounters}};}
}
export function normalizeOverrides(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Content must be a JSON object.');
 const monsters={};
 for(const [id,stats] of Object.entries(value.monsters||{})){
  if(!/^[a-zA-Z][a-zA-Z0-9]*$/.test(id)||!stats||typeof stats!=='object')throw new Error('Invalid monster entry: '+id);
  const clean={};
  for(const [key,number] of Object.entries(stats)){
   if(!editableStats.includes(key)||!Number.isFinite(number)||number<0||number>10000)
    throw new Error('Invalid '+id+'.'+key+' value');
   clean[key]=number;
  }
  monsters[id]=clean;
 }
 const encounters={
  budgetBonus:Math.max(-2,Math.min(5,Math.round(Number(value.encounters?.budgetBonus)||0))),
  eliteChanceBonus:Math.max(0,Math.min(.25,Number(value.encounters?.eliteChanceBonus)||0))
 };
 return {monsters,encounters};
}
export function writeOverrides(value){
 const clean=normalizeOverrides(value);
 localStorage.setItem(CONTENT_KEY,JSON.stringify(clean));
 return clean;
}
export function clearOverrides(){localStorage.removeItem(CONTENT_KEY);}
