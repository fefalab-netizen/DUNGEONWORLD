// Pure simulation code: usable by the game, future tools, and Node tests.
export const TILE = 32;
export function createTestRoom() {
  const width = 38, height = 26;
  const solid = Array(width * height).fill(false);
  const props = [{x:7,y:7,cell:2},{x:8,y:7,cell:3},{x:29,y:18,cell:4}];
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    solid[y*width+x] = x===0||y===0||x===width-1||y===height-1 ||
      (x===20 && y>=4 && y<=21 && !(y>=12&&y<=14)) ||
      ([10,28].includes(x)&&[9,18].includes(y));
  }
  for(const p of props) solid[p.y*width+p.x]=true;
  return {width,height,solid,props,spawn:{x:15.5*TILE,y:13.5*TILE}};
}
export function canOccupy(world,x,y,radius=8) {
  for(let ty=Math.floor((y-radius)/TILE);ty<=Math.floor((y+radius-0.001)/TILE);ty++)
    for(let tx=Math.floor((x-radius)/TILE);tx<=Math.floor((x+radius-0.001)/TILE);tx++)
      if(tx<0||ty<0||tx>=world.width||ty>=world.height||world.solid[ty*world.width+tx]) return false;
  return true;
}
export function move(world,body,dx,dy) {
  // Substeps prevent tunnelling even if callers pass a large displacement.
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
  for(let i=0;i<count;i++) {
    if(canOccupy(world,body.x+dx/count,body.y,body.radius)) body.x+=dx/count;
    if(canOccupy(world,body.x,body.y+dy/count,body.radius)) body.y+=dy/count;
  }
}
export function direction(keys) {
  let x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  let y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  const length=Math.hypot(x,y)||1;
  return {x:x/length,y:y/length};
}

