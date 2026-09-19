import {Race,formatTime} from './race.js';
import {LENGTH} from './track.js';
import {Renderer} from './render.js';
import {AudioEngine} from './audio.js';
import {drivingInput,actionForKey,GAME_KEYS} from './input.js';
const $=id=>document.getElementById(id),race=new Race(),renderer=new Renderer($('world')),audio=new AudioEngine(),keys=new Set();
let state='menu',last=performance.now(),best=null;
try{const saved=Number(localStorage.getItem('neon-apex-best'));if(Number.isFinite(saved)&&saved>0)best=saved;}catch{}
function record(){ $('record').textContent=best?`BEST ${formatTime(best)}`:'첫 기록에 도전하세요';}record();
function view(){const playing=state!=='menu';document.body.classList.toggle('playing',playing);$('menu').hidden=playing;$('guide').hidden=playing;$('footer').hidden=playing;$('hud').hidden=!playing;$('overlay').hidden=state!=='paused'&&state!=='finished';}
function start(){keys.clear();race.reset();state='racing';$('results').replaceChildren();view();}
function pause(){if(state!=='racing')return;state='paused';keys.clear();$('overlay-label').textContent='TAKE A BREATH';$('overlay-title').textContent='PIT STOP.';$('overlay-text').textContent='잠시 멈춰도, 레이스는 기다립니다.';$('resume').hidden=false;$('results').replaceChildren();view();}
function finish(){state='finished';const isBest=!best||race.time<best;if(isBest){best=race.time;try{localStorage.setItem('neon-apex-best',String(best));}catch{}}record();$('overlay-label').textContent=isBest?'NEW PERSONAL BEST':'RACE COMPLETE';$('overlay-title').textContent=`P${race.place}. FINISH.`;$('overlay-text').textContent='다음 코너에는 더 빠른 라인이 기다립니다.';$('resume').hidden=true;$('results').innerHTML=`<p>전체 기록 <b>${formatTime(race.time)}</b></p>${race.lapTimes.map((t,i)=>`<p>LAP ${i+1}<b>${formatTime(t)}</b></p>`).join('')}<p>개인 최고 <b>${formatTime(best)}</b></p>`;view();}
$('start').onclick=start;$('restart').onclick=start;$('resume').onclick=()=>{state='racing';keys.clear();view();};$('home').onclick=()=>{state='menu';keys.clear();race.reset();document.body.classList.remove('flux');view();};$('sound').onclick=()=>{const on=audio.toggle();$('sound').textContent=on?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-label',on?'소리 끄기':'소리 켜기');};
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();$('home').click();});
window.addEventListener('keydown',e=>{if(GAME_KEYS.has(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;const action=actionForKey(e.code);if(action==='pause'){if(state==='racing')pause();else if(state==='paused'){$('resume').click();}}else if(state==='racing'&&action)race[action]();});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function frame(now){const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;
 if(state==='menu'){race.distance+=dt*2200;race.time+=dt;renderer.draw(race,true);}
 else{
  if(state==='racing'){
   const input=drivingInput(keys);race.visualSteer=(input.right?1:0)-(input.left?1:0);race.update(dt,input);if(race.finished)finish();
  }
  renderer.draw(race);renderer.map($('map'),race);document.body.classList.toggle('flux',race.flux);
  $('position').innerHTML=`0${race.place}<span> / 06</span>`;$('lap').innerHTML=`LAP ${Math.min(3,race.lapTimes.length+1)} <span>/ 3</span>`;$('time').textContent=formatTime(race.time);$('speed').textContent=String(Math.round(Math.abs(race.speed)/30)).padStart(3,'0');$('energy').style.width=`${race.energy}%`;$('energy-label').textContent=`페이즈 에너지 ${Math.round(race.energy)}%`;$('drift').style.width=`${race.drift*100}%`;$('phase').textContent=race.flux?'FLUX DIMENSION':'STREET MODE';$('boost-label').textContent=`CTRL 부스터 × ${race.boosts}`;$('boost-status').textContent=race.speed<0?'R · REVERSE':race.boostTime>0?'OVERDRIVE ACTIVE':race.flux?'PHASE DRIVE':'D · ELECTRIC DRIVE';$('message').textContent=race.countdown>0?(race.countdown>.7?String(Math.ceil(race.countdown-.7)):'GO!'):race.messageTime>0?race.message:'';
 }
 audio.update(Math.abs(race.speed),state==='racing'&&race.countdown===0,race.boostTime>0);document.documentElement.dataset.gameReady='true';requestAnimationFrame(frame);
}view();requestAnimationFrame(frame);
