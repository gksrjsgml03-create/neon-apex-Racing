import test from 'node:test';
import assert from 'node:assert/strict';
import {Race} from '../src/race.js';
import {chargeBoost} from '../src/boost.js';
import {hitWall,hitKart,stepImpact} from '../src/collision.js';
import {terrainAt} from '../src/terrain.js';
import {TRACKS} from '../src/tracks.js';
const ready=()=>{const r=new Race('coast');r.countdown=0;r.rivals=[];return r;};
test('partial drift survives release; only 100% awards one booster and resets',()=>{
 const r=ready();r.speed=3000;r.drift=.6;r.boosts=3;r.update(.01,{});
 assert.equal(r.drift,.6);assert.equal(r.boosts,3);
 assert.equal(chargeBoost(r,.39),false);assert.equal(r.boosts,3);
 assert.equal(chargeBoost(r,.01),true);assert.equal(r.boosts,4);assert.equal(r.drift,0);
 r.boost();assert.equal(r.boosts,3);r.boost();assert.equal(r.boosts,3);
});
test('faster wall impact rebounds harder and severe impact overturns',()=>{
 const low=ready(),high=ready();low.speed=2000;high.speed=7000;
 hitWall(low,-1,1.4);hitWall(high,-1,1.4);
 assert(high.lateralVelocity<low.lateralVelocity);assert(!low.overturned);assert(high.overturned);
 for(let i=0;i<180;i++)high.update(1/60,{accelerate:true,right:true,drift:true});
 assert.equal(high.speed,0);assert.equal(high.drift,0);assert(Math.abs(high.impactRoll)>3);
});
test('kart impact pushes both participants apart and ignores repeat contacts',()=>{
 const r=ready();r.speed=4500;const rival={speed:3000};
 assert(hitKart(r,rival,-1));assert(r.lateralVelocity<0);assert(rival.bumpVelocity>0);
 const serial=r.impactSerial;assert(!hitKart(r,rival,-1));assert.equal(r.impactSerial,serial);
});
test('R restores vehicle behind crash, preserves inventory and protects for one second',()=>{
 const r=ready();r.distance=10000;r.speed=7000;r.drift=.7;r.boosts=4;hitWall(r,1,2);
 assert(r.respawn());assert.equal(r.distance,8200);assert.equal(r.overturned,false);
 assert.equal(r.invulnerable,1);assert.equal(r.boosts,4);assert.equal(r.drift,.7);
 assert(!hitWall(r,1,2));assert(!r.respawn());stepImpact(r,.99);assert(!hitWall(r,1,2));
 stepImpact(r,.02);assert(hitWall(r,1,2));
 r.invulnerable=0;r.lapTimes=[60];r.distance=r.track.length+50;r.respawn();
 assert.equal(r.distance,r.track.length);assert.equal(r.lapTimes.length,1);
});
test('each natural course has distinct usable surfaces and wrapped sampling',()=>{
 for(const track of TRACKS){
   const ids=new Set(Array.from({length:100},(_,i)=>terrainAt(track,i/100*track.length).id));
   assert(track.width>=1.08);
   assert(track.id==='metro'?ids.size===1:ids.size>=2);
   assert.equal(terrainAt(track,-1).id,terrainAt(track,track.length-1).id);
 }
 const coast=TRACKS.find(t=>t.id==='coast');
 assert(terrainAt(coast,coast.length*.5).speed<terrainAt(coast,0).speed);
});
