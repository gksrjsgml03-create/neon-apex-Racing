const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function resetImpact(state) {
  Object.assign(state,{lateralVelocity:0,impactRoll:0,airHeight:0,verticalVelocity:0,
    overturned:false,crashTime:0,rollDirection:1,invulnerable:0,impactSerial:0,respawnSerial:0});
}
export function hitWall(state, direction, approach) {
  const severity=clamp(Math.abs(state.speed)/7200*(.5+.5*Math.min(1,Math.abs(approach)/1.2)),0,1.3);
  return impact(state,direction,severity,'wall');
}
export function hitKart(state, rival, direction) {
  const relative=Math.abs(state.speed-rival.speed);
  const severity=clamp((relative*.8+Math.abs(state.speed)*.18)/6500,0,1.3);
  const applied=impact(state,direction,severity,'kart');
  if(applied){rival.bumpVelocity=-direction*(.5+severity*2.8);rival.slowTimer=.5+severity*.6;}
  return applied;
}
function impact(state,direction,severity,kind) {
  if(state.invulnerable>0||state.collideTimer>0||state.overturned)return false;
  const fast=Math.abs(state.speed)>=5000;
  state.lateralVelocity=direction*(.48+severity*3.4);
  state.verticalVelocity=.8+severity*3.5;
  state.impactRoll=-direction*(.10+severity*.40);
  state.speed*=clamp(.82-severity*.38,.25,.82);
  state.boostTime=0;state.drifting=false;state.collideTimer=.65;state.impactSerial++;
  if(fast&&severity>=.70){
    state.overturned=true;state.crashTime=0;state.rollDirection=-direction;
    state.verticalVelocity=3.7+severity;state.speed*=.4;
    state.say('전복! R 키로 복귀');
  }else state.say(kind==='wall'?'벽 충돌!':'카트 충돌!');
  return true;
}
export function stepImpact(state,dt,grip=1) {
  state.invulnerable=Math.max(0,state.invulnerable-dt);
  state.collideTimer=Math.max(0,state.collideTimer-dt);
  state.x+=state.lateralVelocity*dt;
  state.lateralVelocity*=Math.exp(-dt*4.5*grip);
  state.airHeight=Math.max(0,state.airHeight+state.verticalVelocity*dt);
  state.verticalVelocity-=dt*12;
  if(state.airHeight===0&&state.verticalVelocity<0)state.verticalVelocity=0;
  if(state.overturned){
    state.crashTime+=dt;
    const progress=Math.min(1,state.crashTime/.8);
    state.impactRoll=state.rollDirection*Math.PI*(1-(1-progress)**3);
    state.speed*=Math.exp(-dt*5);
    if(Math.abs(state.speed)<10)state.speed=0;
  }else state.impactRoll*=Math.exp(-dt*6);
}
export function recover(state) {
  if(state.finished||state.countdown>0||state.invulnerable>0)return false;
  // Never move behind an already-completed lap, so timing and lap count remain valid.
  state.distance=Math.max(state.lapTimes.length*state.track.length,state.distance-1800);
  const lanes=[0,-state.track.width*.4,state.track.width*.4];
  state.x=lanes.find(lane=>state.rivals.every(r=>Math.abs(r.distance-state.distance)>900||Math.abs(r.x-lane)>.35))??0;
  Object.assign(state,{speed:900,lateralVelocity:0,airHeight:0,verticalVelocity:0,
    impactRoll:0,overturned:false,crashTime:0,boostTime:0,drifting:false,visualSteer:0,
    invulnerable:1,collideTimer:0});
  state.respawnSerial++;state.say('복귀 · 1초 무적');return true;
}
