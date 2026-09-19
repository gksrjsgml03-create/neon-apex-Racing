import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, segmentAt } from '../src/tracks.js';
import { Race } from '../src/race.js';

test('reverse steering follows the requested screen direction on every course', () => {
  for (const track of TRACKS) {
    const step = input => { const r=new Race(track.id);r.countdown=0;r.distance=4000;r.speed=-1000;r.update(1/60,input);return r.x; };
    const neutral=step({brake:true});
    assert(step({brake:true,left:true})<neutral,track.id+' left');
    assert(step({brake:true,right:true})>neutral,track.id+' right');
  }
});
test('five unique, continuous courses have increasing length and decreasing road width', () => {
  assert.equal(TRACKS.length,5);
  assert.equal(new Set(TRACKS.map(t=>JSON.stringify(t.points))).size,5);
  for (const [i,track] of TRACKS.entries()) {
    assert.equal(track.level,i+1);
    assert(track.segments.every(s=>Number.isFinite(s.curve)&&Number.isFinite(s.hill)));
    assert(track.segments.some(s=>Math.abs(s.curve)>1.1),'drift corner: '+track.id);
    assert.equal(segmentAt(-1,track).index,track.segments.length-1);
    assert.equal(segmentAt(track.length,track).index,0);
    if(i){assert(track.length>TRACKS[i-1].length);assert(track.width<TRACKS[i-1].width);}
  }
});
test('each selected map owns its lap distance and persists on restart', () => {
  for (const track of TRACKS) {
    const r=new Race(track.id);r.countdown=0;r.distance=track.length-1;r.speed=5000;
    r.update(.01,{accelerate:true});assert.equal(r.lapTimes.length,1);
    r.reset();assert.equal(r.track.id,track.id);assert.equal(r.distance,0);assert.equal(r.lapTimes.length,0);
  }
});
