// Edge-to-edge workspace; layout preferences stay local to this browser.
let workspaceUI={left:280,right:290,library:true,inspector:true};
function workspaceWidth(){return window.innerWidth||$('workspaceLayout').getBoundingClientRect().width||1200;}
function constrainedPanelWidth(side,value){const other=side==='left'?(workspaceUI.inspector?workspaceUI.right:0):(workspaceUI.library?workspaceUI.left:0);return Math.round(Math.max(190,Math.min(480,value,workspaceWidth()-other-240-14)));}
function applyWorkspaceLayout(save=true){
 const main=$('workspaceLayout');main.style.setProperty('--library-width',`${workspaceUI.left}px`);main.style.setProperty('--inspector-width',`${workspaceUI.right}px`);main.classList.toggle('hide-library',!workspaceUI.library);main.classList.toggle('hide-inspector',!workspaceUI.inspector);
 $('toggleLibrary').setAttribute('aria-pressed',String(workspaceUI.library));$('toggleInspector').setAttribute('aria-pressed',String(workspaceUI.inspector));
 $('resizeLibrary').setAttribute('aria-valuenow',String(workspaceUI.left));$('resizeInspector').setAttribute('aria-valuenow',String(workspaceUI.right));
 if(save)try{localStorage.setItem('foundry-layout',JSON.stringify(workspaceUI));}catch{}
}
function resizeWorkspacePanel(side,width){workspaceUI[side]=constrainedPanelWidth(side,width);applyWorkspaceLayout();}
function toggleWorkspacePanel(key){workspaceUI[key]=!workspaceUI[key];if(workspaceWidth()<=900&&workspaceUI[key])workspaceUI[key==='library'?'inspector':'library']=false;applyWorkspaceLayout();}
function resetWorkspaceLayout(){workspaceUI={left:280,right:290,library:workspaceWidth()>900,inspector:workspaceWidth()>900};applyWorkspaceLayout();}
function openCutStudio(){if(!library.has(activeSheets[layer]))return toast('Select a sprite sheet first');showCutSettings();$('cutFeedback').textContent='Drag the boundaries, then Apply & save cut.';const dialog=$('cutDialog');if(!dialog.open)dialog.showModal();resizeCutCanvas();}
function resizeCutCanvas(){if(!$('cutDialog').open)return;const c=$('cutPreview'),r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;const dpr=window.devicePixelRatio||1;c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);drawCutPreview();}
function bindWorkspaceUI(){
 try{const saved=JSON.parse(localStorage.getItem('foundry-layout')||'null');if(saved){workspaceUI.left=Number.isFinite(saved.left)?Math.max(190,Math.min(480,saved.left)):280;workspaceUI.right=Number.isFinite(saved.right)?Math.max(190,Math.min(480,saved.right)):290;workspaceUI.library=saved.library!==false;workspaceUI.inspector=saved.inspector!==false;}}catch{}
 if(workspaceWidth()<=900){workspaceUI.library=false;workspaceUI.inspector=false;}else{workspaceUI.left=constrainedPanelWidth('left',workspaceUI.left);workspaceUI.right=constrainedPanelWidth('right',workspaceUI.right);}applyWorkspaceLayout(false);
 $('toggleLibrary').onclick=()=>toggleWorkspacePanel('library');$('toggleInspector').onclick=()=>toggleWorkspacePanel('inspector');$('resetLayout').onclick=resetWorkspaceLayout;
 for(const [id,side]of [['resizeLibrary','left'],['resizeInspector','right']]){const handle=$(id);let dragging=null;handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();dragging={start:e.clientX,width:workspaceUI[side]};handle.setPointerCapture(e.pointerId);handle.classList.add('resizing');});handle.addEventListener('pointermove',e=>{if(!dragging)return;resizeWorkspacePanel(side,dragging.width+(e.clientX-dragging.start)*(side==='left'?1:-1));});for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,()=>{dragging=null;handle.classList.remove('resizing');});handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')resizeWorkspacePanel(side,side==='left'?280:290);else resizeWorkspacePanel(side,workspaceUI[side]+(e.key==='ArrowRight'?20:-20)*(side==='left'?1:-1));});}
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser');}};
 window.addEventListener('resize',()=>{if(workspaceWidth()>900){workspaceUI.left=constrainedPanelWidth('left',workspaceUI.left);workspaceUI.right=constrainedPanelWidth('right',workspaceUI.right);}applyWorkspaceLayout(false);resizeCutCanvas();});
 $('openCutEditor').onclick=openCutStudio;$('closeCutEditor').onclick=()=>$('cutDialog').close();$('cutDialog').addEventListener('close',()=>{cutDrag=null;});
 const cutObserver=new ResizeObserver(resizeCutCanvas);cutObserver.observe($('cutPreview'));
}
