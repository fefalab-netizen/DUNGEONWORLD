// Visually verified against 01.png and 02.png: unmirrored poses face left.
export function flipForAim(angle) { return Math.cos(angle)>0; }
export function facingAngle(input,previous=0){
 if(input.aiming||input.attack)return input.angle??previous;
 if(input.x||input.y)return Math.atan2(input.y,input.x);
 return previous;
}
