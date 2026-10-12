export class DebugSpeed {
 constructor(){this.enabled=false;this.multiplier=2;}
 toggle(){this.enabled=!this.enabled;}
 cycle(){this.multiplier=({1:2,2:4,4:8,8:1})[this.multiplier];}
 get value(){return this.enabled?this.multiplier:1;}
 reset(){this.enabled=false;this.multiplier=2;}
}
