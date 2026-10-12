import {coreSheets} from './sprite-usage.js?v=6.0';
import {sheets} from './data.js?v=6.0';

export function gridLines(size) {return Array.from({length:5},(_,i)=>Math.round(size*i/4));}
function findGutters(profile) {
  const base=gridLines(profile.length), result=[...base];
  for(let i=1;i<4;i++) {
    const low=Math.round(base[i]-profile.length/4*.23), high=Math.round(base[i]+profile.length/4*.23);
    let best=base[i], score=Infinity;
    for(let p=low;p<=high;p++) {
      const cost=profile[p]*1000+Math.abs(p-base[i]);
      if(cost<score){best=p;score=cost;}
    }
    result[i]=best;
  }
  return result;
}
export class AssetManager {
  constructor(){this.atlases=new Map();this.errors=[];}
  async load(onProgress=()=>{},ids=coreSheets) {
    let done=0;
    await Promise.all(sheets.filter(s=>ids.includes(s.id)).map(async sheet=>{
      try {if(!this.atlases.has(sheet.id))await this.loadSheet(sheet);} catch(error){this.errors.push(`${sheet.path}: ${error.message}`);}
      onProgress(++done,ids.length);
    }));
  }
  async loadSheet(sheet) {
    let image;
    for(const path of [sheet.path, ...(sheet.fallbacks||[])]) {
      try {image=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image missing or unreadable'));img.src=path;
      });break;}catch { /* Try only explicitly configured alternate filenames. */ }
    }
    if(!image) throw new Error('Image missing or unreadable');
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
    const w=canvas.width,h=canvas.height,pixels=g.getImageData(0,0,w,h).data;
    const xs=new Uint32Array(w),ys=new Uint32Array(h);let transparent=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const a=pixels[(y*w+x)*4+3];if(a<255)transparent++;
      if(a>16){xs[x]++;ys[y]++;}
    }
    const xl=findGutters(xs),yl=findGutters(ys),frames=[];
    for(let cell=0;cell<16;cell++) {
      const col=cell%4,row=Math.floor(cell/4),x=xl[col],y=yl[row],cw=xl[col+1]-x,ch=yl[row+1]-y;
      let left=cw,top=ch,right=-1,bottom=-1;
      for(let py=0;py<ch;py++)for(let px=0;px<cw;px++)if(pixels[((y+py)*w+x+px)*4+3]>16){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
      frames.push({x,y,w:cw,h:ch,bounds:right<0?{left:0,top:0,right:cw-1,bottom:ch-1}:{left,top,right,bottom}});
    }
    // Shared crop, scale and registration for each A/B pair: never trim independently.
    if(sheet.character)for(let i=0;i<16;i+=2){
      const a=frames[i].bounds,b=frames[i+1].bounds;
      const union={left:Math.min(a.left,b.left),top:Math.min(a.top,b.top),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)};
      frames[i].bounds=frames[i+1].bounds=union;
    }
    this.atlases.set(sheet.id,{image,frames,width:w,height:h,transparent:transparent>0,xLines:xl,yLines:yl});
  }
  draw(g,sheet,cell,x,y,width,height,flip=false) {
    const a=this.atlases.get(sheet);if(!a)return;
    const f=a.frames[cell],b=f.bounds,sw=b.right-b.left+1,sh=b.bottom-b.top+1;
    // Clamp each source rectangle, but retain the common destination registration.
    const cw=Math.min(sw,f.w-b.left),ch=Math.min(sh,f.h-b.top);
    g.save();g.imageSmoothingEnabled=false;
    g.translate(Math.round(x+(flip?width:0)),Math.round(y));if(flip)g.scale(-1,1);
    g.drawImage(a.image,f.x+b.left,f.y+b.top,cw,ch,0,0,width*cw/sw,height*ch/sh);g.restore();
  }
  character(g,cell,x,feet,size=42,flip=false) {
    const f=this.atlases.get('01')?.frames[cell];if(!f)return;
    const b=f.bounds,ratio=(b.right-b.left+1)/(b.bottom-b.top+1),width=size*ratio;
    this.draw(g,'01',cell,x-width/2,feet-size,width,size,flip);
  }
}

