// A project contains named world maps, dungeon floors, and areas with separate histories.
let campaign = { name: 'My dungeon', active: 'scene-first', scenes: [] };
const sceneHistory = new Map();
const sizeDefaults = { mobSize: 90, assetSize: 100 };
let previousProject = null;
function newBlankProject() {
  previousProject = campaignData();
  try { localStorage.setItem('foundry-previous-campaign',JSON.stringify(previousProject)); } catch {}
  const width=20,height=14,id=`map-${newSheetId()}`;
  const empty=validateMap({width,height,terrain:Array(width*height).fill(null),assets:Array(width*height).fill(null),background:Array(width*height).fill(null),baseColor:'#171e29',mobs:[]});
  runtime.clear();hover=null;drag=null;space=false;
  installCampaign({name:'Untitled project',active:id,scenes:[{id,name:'Blank map',kind:'area',group:'',floor:0,settings:sceneSettings(),map:empty}]});
  setLayer('terrain');$('restorePreviousProject').disabled=false;
  toast('Blank project started · your sprite library is ready');
}
function restorePreviousProject() {
  try { const previous=previousProject||JSON.parse(localStorage.getItem('foundry-previous-campaign')||'null');if(!previous)return;const validated=validateCampaign(previous);runtime.clear();hover=null;drag=null;installCampaign(validated);toast('Previous project restored'); }
  catch { toast('Previous project could not load. Open a saved project backup.'); }
}
function sceneSettings(value = {}) {
  const out = {};
  for (const key of ['mobSize', 'assetSize']) { const n = value[key] ?? sizeDefaults[key]; if (!Number.isFinite(n) || n < 10 || n > 350) throw new Error('Sprite sizes must be 10–350%'); out[key] = n; }
  return out;
}
function currentScene() { return campaign.scenes.find(scene => scene.id === campaign.active); }
function readSizeSettings() { return { mobSize: +$('mobSize').value || 90, assetSize: +$('assetSize').value || 100 }; }
function showSizeSettings(value) { const settings = sceneSettings(value); $('mobSize').value = settings.mobSize; $('assetSize').value = settings.assetSize; $('sizeValue').textContent = `${settings.mobSize}%`; $('assetSizeValue').textContent = `${settings.assetSize}%`; }
function commitScene() { const scene = currentScene(); if (scene) { scene.map = clone(map); scene.settings = readSizeSettings(); } }
function campaignData() { commitScene(); return clone(campaign); }
function persistCampaign() {
  commitScene();
  try { localStorage.setItem('foundry-campaign', JSON.stringify(campaign)); localStorage.setItem('foundry-map', JSON.stringify(map)); $('saveStatus').textContent = `${campaign.scenes.length} maps saved in this browser`; }
  catch { $('saveStatus').textContent = 'Save project to keep your maps'; }
}
function validateCampaign(value, available = library) {
  if (!value || !Array.isArray(value.scenes) || !value.scenes.length || value.scenes.length > 200 || typeof value.name !== 'string' || value.name.length > 80) throw new Error('Invalid world / dungeon project');
  const ids = new Set();
  const scenes = value.scenes.map(scene => {
    if (!scene || typeof scene.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(scene.id) || ids.has(scene.id) || !['world', 'floor', 'area'].includes(scene.kind) || typeof scene.name !== 'string' || !scene.name.trim() || scene.name.length > 80 || typeof scene.group !== 'string' || scene.group.length > 80 || !Number.isInteger(scene.floor) || scene.floor < -99 || scene.floor > 999) throw new Error('Invalid map details');
    ids.add(scene.id); const settings=sceneSettings(scene.settings);return { id: scene.id, kind: scene.kind, name: scene.name, group: scene.group, floor: scene.floor, settings, map: validateMap(scene.map, available,settings.mobSize,settings.assetSize) };
  });
  if (!ids.has(value.active)) throw new Error('Project current map is missing');
  return { name: value.name, active: value.active, scenes };
}
function renderScenes() {
  $('projectName').value = campaign.name; $('sceneSelect').replaceChildren();
  for (const scene of campaign.scenes) { const option = document.createElement('option'); option.value = scene.id; option.textContent = scene.kind === 'floor' ? `${scene.group || 'Dungeon'} · F${scene.floor}: ${scene.name}` : `${scene.kind === 'world' ? 'World' : 'Area'}: ${scene.name}`; $('sceneSelect').append(option); }
  $('sceneSelect').value = campaign.active;
  const scene = currentScene(); if (!scene) return;
  $('sceneKind').value = scene.kind; $('sceneName').value = scene.name; $('sceneGroup').value = scene.group; $('sceneFloor').value = scene.floor; $('sceneFloor').disabled = scene.kind !== 'floor';
}
function switchScene(id) {
  const target = campaign.scenes.find(scene => scene.id === id); if (!target) return;
  commitScene(); sceneHistory.set(campaign.active, { undo: undoStack, redo: redoStack });
  campaign.active = id; map = clone(target.map); const history = sceneHistory.get(id); undoStack = history?.undo || []; redoStack = history?.redo || [];
  runtime.clear(); hover = null; drag = null; showSizeSettings(target.settings); stats(); historyState(); fit(); renderScenes(); persistCampaign();
}
function addScene(kind, duplicate = false) {
  if (campaign.scenes.length >= 200) return toast('A project can hold up to 200 maps');
  commitScene(); const source = currentScene(); const group = ($('sceneGroup').value || source?.group || 'Main dungeon').trim().slice(0, 80);
  const floor = Math.min(999, Math.max(0, ...campaign.scenes.filter(scene => scene.kind === 'floor' && scene.group === group).map(scene => scene.floor)) + 1);
  const scene = { id: `map-${newSheetId()}`, kind, name: duplicate ? `${source?.name || 'Map'} copy`.slice(0,80) : kind === 'floor' ? `Floor ${floor}` : kind === 'world' ? 'World map' : 'New area', group, floor: kind === 'floor' ? floor : 0, settings: readSizeSettings(), map: duplicate ? clone(map) : { width: map.width, height: map.height, terrain: Array(map.width * map.height).fill(null), assets: Array(map.width * map.height).fill(null), background:Array(map.width*map.height).fill(null),baseColor:map.baseColor,mobs: [],...physicsMap({width:map.width,height:map.height,physics:map.physics}) } };
  campaign.scenes.push(scene); switchScene(scene.id); toast(`${scene.name} added`);
}
function initializeCampaign() {
  let saved = null; try { saved = localStorage.getItem('foundry-campaign'); } catch {}
  if (saved) { try { campaign = validateCampaign(JSON.parse(saved)); map = clone(currentScene().map); showSizeSettings(currentScene().settings); stats(); fit(); renderScenes(); return; } catch { toast('Stored project could not load; open a project backup'); } }
  campaign = { name: 'My dungeon', active: 'scene-first', scenes: [{ id: 'scene-first', kind: 'floor', name: 'Floor 1', group: 'Main dungeon', floor: 1, settings: readSizeSettings(), map: clone(map) }] }; renderScenes();
}
function installCampaign(value) {
  campaign = value; sceneHistory.clear(); undoStack = []; redoStack = []; map = clone(currentScene().map); showSizeSettings(currentScene().settings); stats(); historyState(); fit(); renderScenes(); persistCampaign();
}
function referencedSheetIds(sceneMap) { return new Set([...sceneMap.terrain.filter(Boolean).map(ref => normalizeRef(ref,'terrain').sheet), ...sceneMap.assets.filter(Boolean).map(ref => ref.sheet), ...sceneMap.mobs.map(mob => mob.sheet || 'builtin-mobs')]); }
function exportCurrentScene() {
  commitScene(); const scene = clone(currentScene()); const ids = referencedSheetIds(map);
  const value = { format: 'sprite-foundry', version: 7, ...clone(map), campaign: { name: scene.name, active: scene.id, scenes: [scene] }, sheets: [...library.values()].filter(entry => !entry.builtin && ids.has(entry.id)).map(sheetRecord), builtinCuts: builtinCutRecords(), activeSheets: { ...activeSheets } };
  download(new Blob([JSON.stringify(value)], { type: 'application/json' }), `${scene.name.replace(/[^a-zA-Z0-9_-]+/g,'-') || 'map'}.json`); toast('Current map saved with its used sheets');
}
function bindProjectControls() {
  $('newProject').onclick=newBlankProject;$('restorePreviousProject').onclick=restorePreviousProject;
  try{$('restorePreviousProject').disabled=!localStorage.getItem('foundry-previous-campaign');}catch{}
  $('sceneSelect').onchange = e => switchScene(e.target.value);
  $('sceneKind').onchange = () => { $('sceneFloor').disabled = $('sceneKind').value !== 'floor'; };
  $('projectName').onchange = () => { campaign.name = $('projectName').value.trim() || 'My dungeon'; persistCampaign(); };
  $('updateScene').onclick = () => { const scene = currentScene(); if (!scene) return; const floor = +$('sceneFloor').value; if (!Number.isInteger(floor) || floor < -99 || floor > 999) return toast('Floor number must be -99 to 999'); scene.name = $('sceneName').value.trim() || 'Untitled map'; scene.kind = $('sceneKind').value; scene.group = $('sceneGroup').value.trim(); scene.floor = scene.kind === 'floor' ? floor : 0; renderScenes(); persistCampaign(); toast('Map details updated'); };
  $('newFloor').onclick = () => addScene('floor'); $('newWorld').onclick = () => addScene('world'); $('newArea').onclick = () => addScene('area'); $('duplicateScene').onclick = () => addScene(currentScene()?.kind || 'area', true); $('saveScene').onclick = exportCurrentScene;
}
