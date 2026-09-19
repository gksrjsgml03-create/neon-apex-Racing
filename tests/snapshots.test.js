import test from 'node:test';
import assert from 'node:assert/strict';
import {SnapshotBuffer} from '../src/net/snapshots.js';
import {OnlineRace} from '../src/net/race.js';
import {Race} from '../src/race.js';
const p=(distance,x=0,extra={})=>({id:'friend',name:'friend',connected:true,state:{distance,x,speed:6000,countdown:0,finished:false,overturned:false,respawnSerial:0,visualSteer:0,airHeight:0,impactRoll:0,...extra}});
test('20Hz snapshots render the positions between packets, including reverse and lap wrap',()=>{
 const b=new SnapshotBuffer();b.push([p(9900,0)],60,2);b.push([p(10200,1)],63,2.05);
 assert(Math.abs(b.sample('friend',1.025).distance-10050)<1e-6);assert(Math.abs(b.sample('friend',1.025).x-.5)<1e-6);
 b.push([p(10100,.5,{speed:-2000})],66,2.1);assert(Math.abs(b.sample('friend',1.075).distance-10150)<1e-6);
});
test('late packets extrapolate only briefly, then freeze; disconnected cars never extrapolate',()=>{
 const b=new SnapshotBuffer();b.push([p(1000)],60,2);assert.equal(b.sample('friend',1.5).distance,1600);
 b.push([{...p(1300),connected:false}],63,2.05);assert.equal(b.sample('friend',2).distance,1300);assert(b.stale(3));
});
test('respawns snap to the new position instead of interpolating through the track',()=>{
 const b=new SnapshotBuffer();b.push([p(10000)],60,2);b.push([p(8200,0,{respawnSerial:1})],63,2.05);
 assert.equal(b.sample('friend',1.025).distance,8200);assert.equal(b.sample('friend',1.025).respawnSerial,1);
 assert.equal(b.push([p(999999)],60,3),false);assert.equal(b.tracks.get('friend').frames.length,1);
});
test('jittered arrival cadence keeps the render clock moving forward and bounds history',()=>{
 const b=new SnapshotBuffer();let previous=-Infinity;
 for(let frame=0;frame<240;frame++){
   const now=frame/60;if(frame%3===0)b.push([p(frame*100)],frame,now+(frame%9===0?.025:0));
   const sample=b.advance(now)[0];assert(sample.distance>=previous-1e-6);previous=sample.distance;
 }
 assert(b.tracks.get('friend').frames.length<=40);
});
test('local corrections affect presentation without changing server state; respawn resets correction',()=>{
 const r=new OnlineRace('coast'),state=new Race('coast');state.countdown=0;state.distance=1000;
 r.applySnapshot([{id:'me',state}], 'me',60,2);r.distance=1300;state.distance=1250;
 r.applySnapshot([{id:'me',state}], 'me',63,2.05);assert.equal(r.distance,1250);assert.equal(r.presentation().distance,1300);
 r.updatePresentation(2.1,.05);assert(r.presentation().distance<1300);assert(r.presentation().distance>1250);
 state.respawnSerial=1;state.distance=0;r.applySnapshot([{id:'me',state}],'me',66,2.1);assert.equal(r.presentation().distance,0);
});
