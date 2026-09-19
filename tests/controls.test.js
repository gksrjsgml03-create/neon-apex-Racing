import test from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../src/race.js';
import { LENGTH } from '../src/track.js';
import { drivingInput, actionForKey } from '../src/input.js';
import { updateSpeed } from '../src/vehicle.js';

test('down brakes then reverses; coasting stops and up returns to forward', () => {
  let speed = 1200;
  for (let i=0;i<90;i++) speed=updateSpeed(speed,1/60,{brake:true},5700);
  assert(speed<0 && speed>=-1800);
  for (let i=0;i<120;i++) speed=updateSpeed(speed,1/60,{},5700);
  assert.equal(speed,0);
  speed=-900;
  for (let i=0;i<60;i++) speed=updateSpeed(speed,1/60,{accelerate:true},5700);
  assert(speed>0);
});
test('reverse crosses the start without earning a lap; recrossing a completed lap earns nothing', () => {
  const race=new Race();race.countdown=0;
  for(let i=0;i<60;i++) race.update(1/60,{brake:true});
  assert(race.distance<0);assert.equal(race.lapTimes.length,0);
  race.distance=-1;race.speed=1000;race.update(.01,{accelerate:true});
  assert.equal(race.lapTimes.length,0);
  race.distance=LENGTH-1;race.speed=1000;race.update(.01,{accelerate:true});
  assert.equal(race.lapTimes.length,1);
  race.distance=LENGTH-1;race.update(.01,{accelerate:true});
  assert.equal(race.lapTimes.length,1);
});
test('reverse works off-road and boost does not consume stock in reverse', () => {
  const race=new Race();race.countdown=0;race.x=1.3;
  for(let i=0;i<30;i++) race.update(1/60,{brake:true});
  assert(race.speed<0);assert(race.distance<0);
  race.boost();assert.equal(race.boosts,1);
});
test('both Shift keys drift, both Ctrl keys boost, old bindings are inactive', () => {
  for(const code of ['ShiftLeft','ShiftRight']) {assert(drivingInput(new Set([code])).drift);assert.equal(actionForKey(code),null);}
  for(const code of ['ControlLeft','ControlRight']) assert.equal(actionForKey(code),'boost');
  assert.equal(drivingInput(new Set(['Space'])).drift,false);
  assert(drivingInput(new Set(['ArrowDown'])).brake);
});
