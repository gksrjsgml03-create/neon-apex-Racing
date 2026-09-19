import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, SEGMENT } from '../src/tracks.js';
import { roadPose, ROAD_HALF } from '../src/three/road-space.js';
import { Race } from '../src/race.js';

test('3D course coordinates wrap continuously, including reversing across the start',()=>{
  for(const track of TRACKS){
    const a=roadPose(track,-.001),b=roadPose(track,track.length-.001),c=roadPose(track,.001);
    assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
    assert(Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)<.001);
    for(let i=0;i<track.segments.length;i+=20){const p=roadPose(track,i*SEGMENT,.5);assert(Object.values(p).every(Number.isFinite));assert(Math.abs(p.tx*p.nx+p.tz*p.nz)<1e-8);}
  }
});
test('road width stays inside the tightest 3D bend on all five maps',()=>{
  for(const track of TRACKS)for(let i=0;i<track.segments.length;i++){
    const a=roadPose(track,i*SEGMENT),b=roadPose(track,(i+1)*SEGMENT);
    const angle=Math.acos(Math.min(1,a.tx*b.tx+a.tz*b.tz));
    const radius=Math.hypot(a.x-b.x,a.z-b.z)/Math.max(angle,1e-6);
    assert(radius>ROAD_HALF*track.width,track.id+' road folds at '+i);
  }
});
test('3D guardrails stop sideways escape without turning reverse speed forward',()=>{
  for(const direction of [-1,1]){
    const race=new Race('metro');race.countdown=0;race.x=direction*1.5;race.speed=-1000;
    race.update(1/60,{brake:true});assert(Math.abs(race.x)<=race.track.width-.1);assert(race.speed<0);
  }
});
