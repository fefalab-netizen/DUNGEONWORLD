// Alpha projection finds transparent gutters near the intended grid boundaries.
function proposedAlphaCut(width,height,alpha,settings,type){
 const initial=cutGeometry({width,height},settings,type),xs=new Uint32Array(width),ys=new Uint32Array(height);let solid=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[y*width+x]>16){xs[x]++;ys[y]++;solid++;}
 if(!solid)throw new Error('The image is empty. Use manual cuts.');
 if(solid>width*height*.95)throw new Error('No useful transparency found. Use manual cuts or export a transparent PNG.');
 function axis(profile,current){const lines=[...current];let found=0;for(let i=1;i<lines.length-1;i++){const span=(current[i+1]-current[i-1])/2,lo=Math.max(Math.ceil(current[i-1]+1),Math.floor(current[i]-span*.32)),hi=Math.min(Math.floor(current[i+1]-1),Math.ceil(current[i]+span*.32));const runs=[];let start=-1;for(let p=lo;p<=hi+1;p++){if(p<=hi&&profile[p]===0){if(start<0)start=p;}else if(start>=0){if(p-start>=2)runs.push({center:(start+p)/2,width:p-start});start=-1;}}runs.sort((a,b)=>(Math.abs(a.center-current[i])-.2*a.width)-(Math.abs(b.center-current[i])-.2*b.width));if(runs.length){lines[i]=Math.round(runs[0].center);found++;}}return{lines,found};}
 const x=axis(xs,initial.xLines,width,height),y=axis(ys,initial.yLines,height,width);
 if(!x.found&&!y.found)throw new Error('No clear gutters near this grid. Keep the current cut or adjust rows and columns.');
 const cut={...initial.cut,gapX:0,gapY:0,insetX:0,insetY:0,xLines:x.lines,yLines:y.lines};cutGeometry({width,height},cut,type);return{cut,found:x.found+y.found,total:initial.cut.columns+initial.cut.rows-2};
}
async function suggestAutoCut(){
 const entry=library.get(activeSheets[layer]);if(!entry)return false;$('autoCut').disabled=true;
 try{const image=entry.image||await loadImage(entry.data||(entry.type==='terrain'?'terrain5.png':'Mobs5.png'));const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);let pixels;try{pixels=g.getImageData(0,0,c.width,c.height).data;}catch{throw new Error('This browser blocks pixel reading. Re-upload this sheet here, then try auto-cut.');}const alpha=new Uint8Array(c.width*c.height);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];const proposal=proposedAlphaCut(c.width,c.height,alpha,readCutInputs(),entry.type);cutDraft=proposal.cut;for(const[key,id]of Object.entries(cutIds))$(id).value=cutDraft[key];drawCutPreview();$('cutFeedback').textContent=`Found ${proposal.found}/${proposal.total} gutter boundaries. Review the green lines, then Apply & save cut. No changes saved yet.`;return true;}catch(error){$('cutFeedback').textContent=error.message;return false;}finally{$('autoCut').disabled=false;}
}
