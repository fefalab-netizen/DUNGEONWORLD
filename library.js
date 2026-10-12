// Multiple sheets are kept in IndexedDB; placements reference a stable sheet ID.
const library = new Map();
const sheetTypes = ['terrain', 'assets', 'mobs'];
const activeSheets = { terrain: 'builtin-terrain', assets: null, mobs: 'builtin-mobs' };
const uploadIds = { terrain: 'terrainUpload', assets: 'assetUpload', mobs: 'mobUpload' };
const sourceIds = { terrain: 'terrainSource', assets: 'assetSource', mobs: 'mobSource' };
let sheetSerial = 0, libraryDatabase;
function newSheetId() { return `sheet-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++sheetSerial}`}`; }
function openLibraryDatabase() {
  if (!libraryDatabase) libraryDatabase = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Browser storage unavailable'));
    const request = indexedDB.open('sprite-foundry-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sheets', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Sprite Foundry tabs to enable storage'));
  });
  return libraryDatabase;
}
async function storedSheets() {
  try { const db = await openLibraryDatabase(); return await new Promise((resolve, reject) => { const request = db.transaction('sheets').objectStore('sheets').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  catch { return []; }
}
const defaultCut = { columns: 4, rows: 4, left: 0, top: 0, right: 0, bottom: 0, gapX: 0, gapY: 0, insetX: 0, insetY: 0 };
function cutSettings(value = {}, type) {
  const cut = { ...defaultCut, ...value };
  for (const key of Object.keys(defaultCut)) if (!Number.isInteger(cut[key]) || cut[key] < (key === 'columns' || key === 'rows' ? 1 : 0) || cut[key] > (key === 'columns' || key === 'rows' ? 16 : 8192)) throw new Error('Invalid sheet cut settings');
  if (type === 'mobs' && cut.columns % 2) throw new Error('Mob sheets need an even number of columns for frame pairs');
  const out=Object.fromEntries(Object.keys(defaultCut).map(key => [key, cut[key]]));
  for(const [key,count] of [['xLines',cut.columns],['yLines',cut.rows]]){const lines=value?.[key];if(lines!==undefined&&lines!==null){if(!Array.isArray(lines)||lines.length!==count+1||!lines.every((n,i)=>Number.isFinite(n)&&n>=0&&n<=8192&&(i===0||n>lines[i-1])))throw new Error('Invalid draggable cut boundaries');out[key]=[...lines];}}
  return out;
}
function cutGeometry(image, cut, type) {
  cut = cutSettings(cut, type);
  const cellW = (image.width - cut.left - cut.right - cut.gapX * (cut.columns - 1)) / cut.columns;
  const cellH = (image.height - cut.top - cut.bottom - cut.gapY * (cut.rows - 1)) / cut.rows;
  const xLines=cut.xLines||Array.from({length:cut.columns+1},(_,i)=>i===0?cut.left:i===cut.columns?image.width-cut.right:cut.left+i*(cellW+cut.gapX)-cut.gapX/2);
  const yLines=cut.yLines||Array.from({length:cut.rows+1},(_,i)=>i===0?cut.top:i===cut.rows?image.height-cut.bottom:cut.top+i*(cellH+cut.gapY)-cut.gapY/2);
  if(xLines[0]!==cut.left||xLines.at(-1)!==image.width-cut.right||yLines[0]!==cut.top||yLines.at(-1)!==image.height-cut.bottom)throw new Error('Cut boundaries do not match the sheet margins');
  const rects=[];for(let row=0;row<cut.rows;row++)for(let col=0;col<cut.columns;col++){const x=xLines[col]+(col?cut.gapX/2:0)+cut.insetX,y=yLines[row]+(row?cut.gapY/2:0)+cut.insetY,width=xLines[col+1]-(col<cut.columns-1?cut.gapX/2:0)-cut.insetX-x,height=yLines[row+1]-(row<cut.rows-1?cut.gapY/2:0)-cut.insetY-y;if(width<1||height<1||x<0||y<0||x+width>image.width||y+height>image.height)throw new Error('Margins, gaps, or insets leave no sprite pixels');rects.push({x,y,width,height});}
  return { cut, cellW, cellH, width: rects[0].width, height: rects[0].height, xLines, yLines, rects };
}
function sheetCount(entry) { if (!entry) return 0; const cut = cutSettings(entry.cut, entry.type); return cut.columns * cut.rows / (entry.type === 'mobs' ? 2 : 1); }
function builtinCutRecords() { return Object.fromEntries([...library.values()].filter(entry => entry.builtin).map(entry => [entry.id, cutSettings(entry.cut, entry.type)])); }
function sheetRecord(entry) { return { id: entry.id, type: entry.type, name: entry.name, data: entry.data, cut: cutSettings(entry.cut, entry.type) }; }
async function storeSheets(entries) {
  try { const db = await openLibraryDatabase(); await new Promise((resolve, reject) => { const tx = db.transaction('sheets', 'readwrite'); entries.forEach(entry => tx.objectStore('sheets').put(sheetRecord(entry))); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); return true; }
  catch { return false; }
}
function validSheetRecord(entry) {
  if (!entry || typeof entry.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(entry.id) || entry.id.startsWith('builtin-') || !sheetTypes.includes(entry.type) || typeof entry.name !== 'string' || entry.name.length > 255 || typeof entry.data !== 'string' || entry.data.length > 28 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp);base64,/.test(entry.data)) throw new Error('Invalid uploaded sheet in project');
  return sheetRecord(entry);
}
async function decodeSheetRecord(record) {
  const entry = validSheetRecord(record), image = await loadImage(entry.data);
  if (image.width < 16 || image.height < 16 || image.width > 8192 || image.height > 8192) throw new Error('Sheet dimensions must be 16–8192 pixels per side');
  return { ...entry, image, sprite: sliceSheet(image, entry.type, entry.cut), saved: false };
}
function selectSheet(type, id, refresh = true) {
  const entry = library.get(id); if (!entry || entry.type !== type) return;
  activeSheets[type] = id; sheets[type] = entry.sprite; sheetNames[type] = entry.builtin ? null : entry.name;
  $(sourceIds[type]).textContent = entry.name;
  try { localStorage.setItem('foundry-active-sheets', JSON.stringify(activeSheets)); } catch {}
  if (refresh) { layer = type; selected = 0; setTool('paint'); buildPalette(); }
}
function renderSheetLibrary() {
  $('sheetList').replaceChildren(); const entries = [...library.values()].filter(entry => entry.type === layer);
  $('libraryCount').textContent = `${entries.length} sheets`;
  entries.forEach(entry => {
    const button = document.createElement('button'), image = document.createElement('img'), text = document.createElement('span'), name = document.createElement('strong'), info = document.createElement('small');
    button.className = 'sheet-option'; button.classList.toggle('active', entry.id === activeSheets[layer]); button.setAttribute('aria-pressed', String(entry.id === activeSheets[layer]));
    image.src = entry.data || (entry.type === 'terrain' ? 'terrain5.png' : 'Mobs5.png'); image.alt = ''; name.textContent = entry.name; info.textContent = `${sheetCount(entry)} ${entry.type === 'terrain' ? 'tiles' : entry.type === 'assets' ? 'assets' : 'characters'} · ${entry.builtin ? 'Included' : entry.saved ? 'Saved' : 'Session only'}`;
    text.append(name, info); button.append(image, text); button.onclick = () => selectSheet(entry.type, entry.id); $('sheetList').append(button);
  });
  $('sheetStatus').textContent = `${library.size} sheets · mix assets freely`;
  showCutSettings();
}
function brushRef() { return { sheet: activeSheets[layer], index: selected }; }
function normalizeRef(value, type) { return Number.isInteger(value) ? { sheet: `builtin-${type}`, index: value } : value; }
function sameRef(a, b, type = 'terrain') { if (a === null || b === null) return a === b; a = normalizeRef(a, type); b = normalizeRef(b, type); return a.sheet === b.sheet && a.index === b.index; }
function projectData() { return { format: 'sprite-foundry', version: 7, ...map, campaign: campaignData(), builtinCuts: builtinCutRecords(), sheets: [...library.values()].filter(entry => !entry.builtin).map(sheetRecord), activeSheets: { ...activeSheets } }; }
async function openProject(value) {
  // Stage and validate everything before changing the live map or library.
  if (value.sheets !== undefined && !Array.isArray(value.sheets)) throw new Error('Invalid project sheet library');
  const staged = [], ids = new Set();
  for (const record of value.sheets || []) { if (ids.has(record.id)) throw new Error('Duplicate sheet ID in project'); ids.add(record.id); staged.push(await decodeSheetRecord(record)); }
  const available = new Map(library);
  const remap = new Map();
  for (const entry of staged) {
    const existing = library.get(entry.id);
    if (existing && (existing.type !== entry.type || existing.data !== entry.data || JSON.stringify(cutSettings(existing.cut,existing.type)) !== JSON.stringify(entry.cut))) { const original = entry.id; entry.id = newSheetId(); remap.set(original, entry.id); }
    available.set(entry.id, entry);
  }
  const copy = clone(value);
  function remapMap(sceneMap) { for (const type of ['terrain', 'assets']) if (Array.isArray(sceneMap[type])) sceneMap[type].forEach(ref => { if (ref && typeof ref === 'object' && remap.has(ref.sheet)) ref.sheet = remap.get(ref.sheet); }); if (Array.isArray(sceneMap.mobs)) sceneMap.mobs.forEach(mob => { if (mob && remap.has(mob.sheet)) mob.sheet = remap.get(mob.sheet); }); }
  remapMap(copy); if (Array.isArray(copy.campaign?.scenes)) copy.campaign.scenes.forEach(scene => { if (scene?.map) remapMap(scene.map); });
  const builtinChanges = [];
  if (copy.builtinCuts) for (const [id, value] of Object.entries(copy.builtinCuts)) { const entry = library.get(id); if (!entry?.builtin) throw new Error('Invalid included sheet cut'); const cut = cutSettings(value,entry.type); const image = entry.image || await loadImage(entry.type === 'terrain' ? 'terrain5.png' : 'Mobs5.png'); const next = { ...entry, image, cut, sprite: sliceSheet(image,entry.type,cut) }; available.set(id,next); builtinChanges.push(next); }
  const currentSettings=copy.campaign?.scenes?.find(scene=>scene.id===copy.campaign.active)?.settings;
  const next = validateMap(copy, available,sceneSettings(currentSettings).mobSize,sceneSettings(currentSettings).assetSize);
  const nextCampaign = copy.campaign ? validateCampaign(copy.campaign, available) : { name: 'Imported map', active: 'scene-imported', scenes: [{ id:'scene-imported',name:'Imported map',kind:'area',group:'',floor:0,settings:sceneSettings(),map:next }] };
  // The root map is the active-map snapshot, retained for map-only compatibility.
  nextCampaign.scenes.find(scene => scene.id === nextCampaign.active).map = next;
  const saved = staged.length ? await storeSheets(staged) : true;
  staged.forEach(entry => { entry.saved = saved; library.set(entry.id, entry); });
  builtinChanges.forEach(entry => library.set(entry.id,entry)); saveBuiltinCuts(); installCampaign(nextCampaign); runtime.clear();
  for (const type of sheetTypes) { let id = value.activeSheets?.[type]; id = remap.get(id) || id; if (library.get(id)?.type === type) selectSheet(type, id, false); }
  buildPalette(); toast(saved ? 'Project and image library loaded' : 'Project loaded for this session · save a backup');
}
const cutIds = { columns:'cutColumns', rows:'cutRows', left:'cutLeft', top:'cutTop', right:'cutRight', bottom:'cutBottom', gapX:'cutGapX', gapY:'cutGapY', insetX:'cutInsetX', insetY:'cutInsetY' };
let cutDraft={},cutDrag=null,cutPreviewLayout=null;
function showCutSettings() { const entry=library.get(activeSheets[layer]); $('cutSheetName').textContent=entry?.name || 'Upload a sheet first'; $('applyCut').disabled=!entry; $('resetCut').disabled=!entry;$('openCutEditor').disabled=!entry;cutDraft=cutSettings(entry?.cut,layer);cutDrag=null; for(const [key,id] of Object.entries(cutIds))$(id).value=cutDraft[key]; drawCutPreview(); }
function readCutInputs() { const out=Object.fromEntries(Object.entries(cutIds).map(([key,id])=>[key,+$(id).value]));if(cutDraft.xLines)out.xLines=[...cutDraft.xLines];if(cutDraft.yLines)out.yLines=[...cutDraft.yLines];return out; }
function drawCutPreview() {
  const c=$('cutPreview'),g=c.getContext('2d');cutPreviewLayout=null;if(!g?.clearRect)return;g.clearRect(0,0,c.width,c.height);
  const entry=library.get(activeSheets[layer]);if(!entry?.image)return;
  try { const geometry=cutGeometry(entry.image,readCutInputs(),entry.type),k=Math.min((c.width-20)/entry.image.width,(c.height-20)/entry.image.height),x=(c.width-entry.image.width*k)/2,y=(c.height-entry.image.height*k)/2;cutPreviewLayout={...geometry,k,x,y,entry};g.imageSmoothingEnabled=false;g.drawImage(entry.image,x,y,entry.image.width*k,entry.image.height*k);g.strokeStyle='#8bc5df';g.lineWidth=1;g.setLineDash([3,3]);for(const r of geometry.rects)g.strokeRect(x+r.x*k,y+r.y*k,r.width*k,r.height*k);g.setLineDash([]);g.strokeStyle='#c6ed88';g.lineWidth=2;g.beginPath();for(const p of geometry.xLines){g.moveTo(x+p*k,y+geometry.yLines[0]*k);g.lineTo(x+p*k,y+geometry.yLines.at(-1)*k);}for(const p of geometry.yLines){g.moveTo(x+geometry.xLines[0]*k,y+p*k);g.lineTo(x+geometry.xLines.at(-1)*k,y+p*k);}g.stroke();for(const p of geometry.xLines){g.fillStyle='#c6ed88';g.fillRect(x+p*k-3,y+geometry.yLines[0]*k-4,6,8);}for(const p of geometry.yLines){g.fillStyle='#c6ed88';g.fillRect(x+geometry.xLines[0]*k-4,y+p*k-3,8,6);} }
  catch { g.fillStyle='#e7a29d';g.font='12px sans-serif';g.fillText('Invalid cut: check margins and gaps',5,25); }
}
function usedSheetIndices(id,type) {
  const values=[];const maps=[map,...campaign.scenes.map(scene=>scene.map),...undoStack,...redoStack];for(const history of sceneHistory.values())maps.push(...history.undo,...history.redo);
  for(const m of maps){if(type==='mobs'){for(const mob of m.mobs)if((mob.sheet||'builtin-mobs')===id)values.push(mob.type);}else for(const value of m[type]||[]){if(value){const ref=normalizeRef(value,type);if(ref.sheet===id)values.push(ref.index);}}}return values;
}
function saveBuiltinCuts() { try{localStorage.setItem('foundry-builtin-cuts',JSON.stringify(builtinCutRecords()));}catch{} }
async function applySheetCut(value) {
  const entry=library.get(activeSheets[layer]);if(!entry)return false;
  $('applyCut').disabled=true;
  try{const cut=cutSettings(value,entry.type),count=cut.columns*cut.rows/(entry.type==='mobs'?2:1);if(usedSheetIndices(entry.id,entry.type).some(index=>index>=count))throw new Error('This grid removes a cell used by a map or undo history. Keep more cells or upload a separate copy.');const image=entry.image||await loadImage(entry.data||(entry.type==='terrain'?'terrain5.png':'Mobs5.png'));const next={...entry,image,cut,sprite:sliceSheet(image,entry.type,cut)};next.saved=next.builtin?true:await storeSheets([next]);library.set(next.id,next);if(next.builtin)saveBuiltinCuts();selected=Math.min(selected,count-1);selectSheet(next.type,next.id,false);buildPalette();const message=next.saved?'Sheet cut updated and saved':'Cut updated for this session · save project';$('cutFeedback').textContent=message;toast(message);return true;}catch(error){$('cutFeedback').textContent=error.message;toast(error.message);return false;}finally{$('applyCut').disabled=false;}
}
function movedCutBoundary(image,value,type,axis,index,position){const g=cutGeometry(image,value,type),lines=[...(axis==='x'?g.xLines:g.yLines)],key=axis==='x'?'xLines':'yLines',gap=axis==='x'?g.cut.gapX:g.cut.gapY,inset=axis==='x'?g.cut.insetX:g.cut.insetY,extent=axis==='x'?image.width:image.height;const span=gap+inset*2+1,min=index?lines[index-1]+span:0,max=index<lines.length-1?lines[index+1]-span:extent;if(Math.ceil(min)>Math.floor(max))return g.cut;lines[index]=Math.max(Math.ceil(min),Math.min(Math.floor(max),Math.round(position)));const cut={...g.cut,[key]:lines};if(axis==='x'){cut.left=lines[0];cut.right=image.width-lines.at(-1);}else{cut.top=lines[0];cut.bottom=image.height-lines.at(-1);}cutGeometry(image,cut,type);return cut;}
function cutPointer(e){const c=$('cutPreview'),r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height,cssScale:c.width/r.width};}
function hitCutLine(e){if(!cutPreviewLayout)return null;const p=cutPointer(e),g=cutPreviewLayout,threshold=8*p.cssScale,candidates=[];if(p.y>=g.y+g.yLines[0]*g.k-threshold&&p.y<=g.y+g.yLines.at(-1)*g.k+threshold)g.xLines.forEach((v,index)=>candidates.push({axis:'x',index,d:Math.abs(p.x-(g.x+v*g.k))}));if(p.x>=g.x+g.xLines[0]*g.k-threshold&&p.x<=g.x+g.xLines.at(-1)*g.k+threshold)g.yLines.forEach((v,index)=>candidates.push({axis:'y',index,d:Math.abs(p.y-(g.y+v*g.k))}));candidates.sort((a,b)=>a.d-b.d);return candidates[0]?.d<=threshold?candidates[0]:null;}
function bindCutControls() {
 for(const [key,id] of Object.entries(cutIds))$(id).oninput=()=>{if(['columns','left','right'].includes(key))delete cutDraft.xLines;if(['rows','top','bottom'].includes(key))delete cutDraft.yLines;drawCutPreview();};
 $('applyCut').onclick=()=>applySheetCut(readCutInputs());$('resetCut').onclick=()=>applySheetCut(defaultCut);
 const c=$('cutPreview');c.addEventListener('pointerdown',e=>{if(e.button!==0)return;const hit=hitCutLine(e);if(!hit)return;e.preventDefault();const p=cutPointer(e),g=cutPreviewLayout;cutDrag={...hit,offset:(hit.axis==='x'?(p.x-g.x)/g.k-g.xLines[hit.index]:(p.y-g.y)/g.k-g.yLines[hit.index]),id:e.pointerId};c.setPointerCapture(e.pointerId);});
 c.addEventListener('pointermove',e=>{if(!cutDrag){const hit=hitCutLine(e);c.style.cursor=hit?(hit.axis==='x'?'ew-resize':'ns-resize'):'default';return;}if(!cutPreviewLayout)return;const p=cutPointer(e),g=cutPreviewLayout;try{cutDraft=movedCutBoundary(g.entry.image,readCutInputs(),g.entry.type,cutDrag.axis,cutDrag.index,(cutDrag.axis==='x'?(p.x-g.x)/g.k:(p.y-g.y)/g.k)-cutDrag.offset);for(const [key,id]of Object.entries(cutIds))$(id).value=cutDraft[key];drawCutPreview();}catch{}e.preventDefault();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(name,()=>{cutDrag=null;c.style.cursor='default';});
}
