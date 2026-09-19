import { LENGTH, segmentAt } from './track.js';
import { updateSpeed } from './vehicle.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Race {
 constructor(){this.reset();}
 reset(){Object.assign(this,{distance:0,x:0,speed:0,time:0,countdown:3.2,energy:50,flux:false,boosts:1,boostTime:0,drift:0,drifting:false,finished:false,place:6,lapTimes:[],lapStart:0,message:'',messageTime:0,collideTimer:0});this.rivals=Array.from({length:5},(_,i)=>({distance:750+i*950,x:(i%3-1)*.52,speed:4400+i*135,color:['#ff719a','#a992ff','#ffcb62','#71c9ff','#f5f4ed'][i],seed:i}));}
 say(message){this.message=message;this.messageTime=1.7;}
 shift(){if(this.countdown>0||this.finished)return;if(this.flux){this.flux=false;this.say('STREET MODE');}else if(this.energy>=25){this.flux=true;this.say('FLUX DIMENSION');}else this.say('에너지 25% 필요');}
 boost(){if(this.countdown<=0&&this.speed>0&&this.boosts>0&&this.boostTime<=0&&!this.finished){this.boosts--;this.boostTime=2.4;this.say('OVERDRIVE');}}
 update(dt,input={}){
  if(this.finished)return;
  this.messageTime=Math.max(0,this.messageTime-dt);
  if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt);return;}
  this.time+=dt;this.boostTime=Math.max(0,this.boostTime-dt);this.collideTimer=Math.max(0,this.collideTimer-dt);
  const curve=segmentAt(this.distance).curve, steering=(input.right?1:0)-(input.left?1:0);
  this.drifting=!!input.drift&&steering!==0&&this.speed>1800;
  const max=(this.flux?6900:5700)+(this.boostTime>0?2400:0);
  this.speed=updateSpeed(this.speed,dt,input,max);
  if(this.speed<=0)this.boostTime=0;
  const ratio=this.speed/5700;
  this.x+=steering*dt*(this.drifting?1.35:1.05)*clamp(ratio*2,-1,1)-curve*ratio*dt*(this.drifting?.29:.43);
  if(this.drifting){this.drift=clamp(this.drift+dt*(.4+Math.abs(curve)*.12),0,1);this.energy=clamp(this.energy+dt*9,0,100);}
  else if(this.drift>0){if(this.drift>=.55){this.boosts=Math.min(3,this.boosts+1);this.say('DRIFT BOOST +1');}this.drift=0;}
  if(this.flux){this.energy=Math.max(0,this.energy-dt*7);if(this.energy===0){this.flux=false;this.say('에너지 소진 · STREET');}}
  else this.energy=clamp(this.energy+dt*1.3,0,100);
  const edge=this.flux?.81:1;
  if(Math.abs(this.x)>edge){this.speed=clamp(this.speed*Math.max(0,1-dt*2.4),-1800,1800);this.energy=Math.max(0,this.energy-dt*4);}
  this.x=clamp(this.x,-1.55,1.55);
  if(this.speed>0&&this.flux&&segmentAt(this.distance).fluxZone&&Math.abs(this.x)<.35)this.speed=Math.min(max+1000,this.speed+dt*3800);
  const previousDistance=this.distance;
  this.distance+=this.speed*dt;
  for(const r of this.rivals){r.distance+=r.speed*(1-.08*Math.abs(segmentAt(r.distance).curve))*dt;r.x=clamp(Math.sin(this.time*.6+r.seed*1.7)*.55,-.75,.75);if(!this.flux&&Math.abs(r.distance-this.distance)<260&&Math.abs(r.x-this.x)<.23&&this.collideTimer===0){this.speed*=.68;this.x+=this.x>=r.x?.16:-.16;this.collideTimer=1;this.say('접촉! 레이싱 라인을 바꾸세요');}}
  this.place=1+this.rivals.filter(r=>r.distance>this.distance).length;
  const nextLapDistance=(this.lapTimes.length+1)*LENGTH;
  if(previousDistance<nextLapDistance&&this.distance>=nextLapDistance){this.lapTimes.push(this.time-this.lapStart);this.lapStart=this.time;if(this.lapTimes.length<3)this.say(`LAP ${this.lapTimes.length+1} / 3`);}
  if(this.distance>=LENGTH*3){this.finished=true;this.distance=LENGTH*3;}
 }
}
export const formatTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(3).padStart(6,'0')}`;
