import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioEngine} from '../src/audio.js';
test('finish silences all driving loops and events while keeping music enabled',()=>{
 const audio=new AudioEngine(),gains=[];let events=0;
 const param={setTargetAtTime(){}};
 audio.ctx={currentTime:1};audio.master={gain:param};
 for(const key of ['engine','motor','road','skid','skidTone','air'])audio[key]={gain:{gain:{setTargetAtTime(value){gains.push(value);}}},source:{frequency:param},filter:{frequency:param}};
 audio.boostSound=audio.percussion=audio.tone=()=>events++;
 const race={finished:true,countdown:0,overturned:false,speed:6000,boostTime:1,drifting:true,time:10,impactSerial:1};
 audio.update(race,'racing');assert.equal(gains.length,6);assert(gains.every(v=>v===0));assert.equal(events,0);assert.equal(audio.musicActive,true);
 gains.length=0;audio.update({...race,finished:false},'racing');assert(gains.some(v=>v>0));
});
