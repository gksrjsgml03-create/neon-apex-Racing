import { getTrack, segmentAt } from './tracks.js';
import { updateSpeed } from './vehicle.js';
import { terrainAt } from './terrain.js';
import { chargeBoost } from './boost.js';
import { resetImpact, stepImpact, hitWall, hitKart, recover } from './collision.js';

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Race {
  constructor(trackId){this.reset(trackId);}
  reset(trackId=this.track?.id){
    this.track=getTrack(trackId);
    Object.assign(this,{distance:0,x:0,speed:0,time:0,countdown:3.2,energy:50,flux:false,
      boosts:1,boostTime:0,drift:0,drifting:false,finished:false,place:6,lapTimes:[],lapStart:0,
      message:'',messageTime:0,collideTimer:0,visualSteer:0});
    resetImpact(this);
    this.rivals=Array.from({length:5},(_,i)=>({distance:750+i*750,x:(i%3-1)*.52,
      speed:3900+this.track.level*120+i*105,
      color:['#ff719a','#a992ff','#ffcb62','#71c9ff','#f5f4ed'][i],seed:i,
      bumpVelocity:0,bumpOffset:0,slowTimer:0}));
  }
  say(message){this.message=message;this.messageTime=1.7;}
  shift(){
    if(this.countdown>0||this.finished||this.overturned)return;
    if(this.flux){this.flux=false;this.say('STREET MODE');}
    else if(this.energy>=25){this.flux=true;this.say('FLUX DIMENSION');}
    else this.say('에너지 25% 필요');
  }
  boost(){
    if(this.countdown<=0&&this.speed>0&&this.boosts>0&&this.boostTime<=0&&!this.finished&&!this.overturned){
      this.boosts--;this.boostTime=2.4;this.say('OVERDRIVE');
    }
  }
  respawn(){return recover(this);}
  updateRivals(dt){
    for(const rival of this.rivals){
      const surface=terrainAt(this.track,rival.distance);
      rival.slowTimer=Math.max(0,rival.slowTimer-dt);
      rival.distance+=rival.speed*surface.speed*(rival.slowTimer>0?.65:1)*(1-.10*Math.abs(segmentAt(rival.distance,this.track).curve))*dt;
      rival.bumpOffset+=rival.bumpVelocity*dt;
      rival.bumpVelocity*=Math.exp(-dt*4);
      rival.bumpOffset*=Math.exp(-dt*1.1);
      rival.x=clamp(Math.sin(this.time*.6+rival.seed*1.7)*.55*this.track.width+rival.bumpOffset,-this.track.width+.12,this.track.width-.12);
      if(!this.flux&&!this.overturned&&Math.abs(rival.distance-this.distance)<260&&Math.abs(rival.x-this.x)<.28){
        hitKart(this,rival,this.x>=rival.x?1:-1);
      }
    }
    this.place=1+this.rivals.filter(rival=>rival.distance>this.distance).length;
  }
  update(dt,input={}){
    if(this.finished)return;
    this.messageTime=Math.max(0,this.messageTime-dt);
    if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt);return;}
    this.time+=dt;this.boostTime=Math.max(0,this.boostTime-dt);
    const surface=terrainAt(this.track,this.distance),curve=segmentAt(this.distance,this.track).curve;
    stepImpact(this,dt,surface.grip);
    const steering=(input.right?1:0)-(input.left?1:0);
    let steeringVelocity=0;
    if(!this.overturned){
      this.drifting=!!input.drift&&steering!==0&&this.speed>1800;
      const max=(this.flux?6900:5700)*surface.speed+(this.boostTime>0?2400:0);
      this.speed=updateSpeed(this.speed,dt,input,max);
      if(this.speed<=0)this.boostTime=0;
      const ratio=this.speed/5700;
      steeringVelocity=steering*(this.drifting?1.55:1.12)*clamp(Math.abs(ratio)*2,0,1)*surface.grip-curve*ratio*(this.drifting?.32:.43);
      this.x+=steeringVelocity*dt;
      if(this.drifting){
        if(chargeBoost(this,dt*(.4+Math.abs(curve)*.12)))this.say('100% 충전 · 부스터 +1');
        this.energy=clamp(this.energy+dt*9,0,100);
      }
      if(this.flux){this.energy=Math.max(0,this.energy-dt*7);if(this.energy===0){this.flux=false;this.say('에너지 소진 · STREET');}}
      else this.energy=clamp(this.energy+dt*1.3,0,100);
      if(Math.abs(this.x)>this.track.width*(this.flux?.81:1)){
        this.speed=clamp(this.speed*Math.max(0,1-dt*2.4),-1800,1800);
        this.energy=Math.max(0,this.energy-dt*4);
      }
      if(this.speed>0&&this.flux&&segmentAt(this.distance,this.track).fluxZone&&Math.abs(this.x)<.35)this.speed=Math.min(max+1000,this.speed+dt*3800);
    }else this.drifting=false;

    const rail=this.track.width-.10;
    if(Math.abs(this.x)>rail){
      const side=Math.sign(this.x);this.x=side*rail;
      const applied=hitWall(this,-side,steeringVelocity+this.lateralVelocity);
      if(!applied&&side*this.lateralVelocity>0)this.lateralVelocity*=-.25;
    }
    const previousDistance=this.distance;
    this.distance+=this.speed*dt;
    this.updateRivals(dt);
    if(!this.overturned){
      const nextLapDistance=(this.lapTimes.length+1)*this.track.length;
      if(previousDistance<nextLapDistance&&this.distance>=nextLapDistance){
        this.lapTimes.push(this.time-this.lapStart);this.lapStart=this.time;
        if(this.lapTimes.length<3)this.say(`LAP ${this.lapTimes.length+1} / 3`);
      }
      if(this.distance>=this.track.length*3){this.finished=true;this.distance=this.track.length*3;}
    }
  }
}
export const formatTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(3).padStart(6,'0')}`;
