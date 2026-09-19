import test from 'node:test';
import assert from 'node:assert/strict';
import {Race} from '../src/race.js';
import {LENGTH} from '../src/track.js';
test('countdown prevents movement and phase spending',()=>{const r=new Race();r.shift();r.update(.1,{accelerate:true});assert.equal(r.distance,0);assert.equal(r.flux,false);assert.equal(r.energy,50);});
test('phase runs out and drift earns a capped boost',()=>{const r=new Race();r.countdown=0;r.energy=.1;r.flux=true;r.update(.1,{});assert.equal(r.flux,false);r.speed=3000;r.drift=.8;r.boosts=2;r.update(.01,{});assert.equal(r.boosts,3);assert.equal(r.drift,0);});
test('third lap finishes once and reset clears race state',()=>{const r=new Race();r.countdown=0;r.distance=LENGTH*3-10;r.speed=5000;r.update(.01,{accelerate:true});assert.equal(r.finished,true);const time=r.time;r.update(1,{});assert.equal(r.time,time);r.reset();assert.equal(r.distance,0);assert.equal(r.finished,false);assert.equal(r.rivals.length,5);});
