import { Race, formatTime } from './race.js';
import { TRACKS, getTrack, routePath, segmentAt } from './tracks.js';
import { Renderer } from './three/renderer.js';
import { CHARACTERS, KARTS } from './three/models.js';
import { background, landmark } from './scenery.js';
import { AudioEngine } from './audio.js';
import { drivingInput, actionForKey, GAME_KEYS } from './input.js';
import { terrainAt } from './terrain.js';
import { OnlineLobby } from './net/lobby.js';
import { OnlineRace } from './net/race.js';

const $ = id => document.getElementById(id);
const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, String(value)); } catch {} };
let selected = getTrack(read('neon-apex-track', 'coast'));
let race = new Race(selected.id);
const audio = new AudioEngine(), keys = new Set();
let online,mode='single',onlineRound=-1,latestPlayers=[],sendElapsed=0;
let renderer;
try { renderer = new Renderer($('world')); }
catch (error) {
  const message=document.createElement('div');message.className='graphics-error';message.textContent='3D 그래픽을 시작하지 못했습니다. 그래픽 드라이버를 확인한 뒤 게임을 다시 실행해 주세요.';document.body.append(message);throw error;
}
let characterId=read('neon-apex-character','ace'),kartId=read('neon-apex-kart','bolt');
if(!CHARACTERS.some(c=>c.id===characterId))characterId='ace';
if(!KARTS.some(k=>k.id===kartId))kartId='bolt';
function appearance(){
  renderer.setAppearance(characterId,kartId);save('neon-apex-character',characterId);save('neon-apex-kart',kartId);
  document.querySelectorAll('[data-character]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.character===characterId)));
  document.querySelectorAll('[data-kart]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kart===kartId)));
}
for(const [index,character] of CHARACTERS.entries()){
  const button=document.createElement('button');button.className='character-choice';button.dataset.character=character.id;button.style.setProperty('--swatch',character.color);button.setAttribute('aria-label',`캐릭터 ${character.name}`);
  button.innerHTML=`<img src="${renderer.portrait(character.id)}" alt=""><small>${character.name}</small>`;
  button.onclick=()=>{characterId=character.id;appearance();};$('characters').append(button);
}
for(const kart of KARTS){const button=document.createElement('button');button.className='kart-choice';button.dataset.kart=kart.id;button.style.setProperty('--swatch',kart.color);button.innerHTML=`<img src="${renderer.portrait(kart.id,true)}" alt=""><small>${kart.name}</small>`;button.setAttribute('aria-label',`카트 ${kart.name}`);button.onclick=()=>{kartId=kart.id;appearance();};$('karts').append(button);}
appearance();
let state = 'welcome', last = performance.now(), accumulator = 0;
const recordKey = () => `neon-apex-v14-best-${selected.id}`;
const bestTime = () => { const value = Number(read(recordKey(), '0')); return Number.isFinite(value) && value > 0 ? value : null; };

function audioButton() {
  $('sound').textContent = audio.enabled ? 'SOUND ON' : 'SOUND OFF';
  $('sound').setAttribute('aria-label', audio.enabled ? '소리 끄기' : '소리 켜기');
}
async function unlockAudio() {
  try { await audio.unlock(); audioButton(); }
  catch { $('sound').textContent = '소리 다시 켜기'; }
}
function volumes() {
  audio.setVolumes(Number($('music-volume').value) / 100, Number($('effects-volume').value) / 100);
  save('neon-apex-music', $('music-volume').value); save('neon-apex-effects', $('effects-volume').value);
}
for (const [id, key, fallback] of [['music-volume','neon-apex-music',55],['effects-volume','neon-apex-effects',75]]) {
  $(id).value = read(key, fallback); $(id).addEventListener('input', volumes);
}
volumes();

function record() { const best = bestTime(); $('record').textContent = best ? `이 맵 최고 기록 ${formatTime(best)}` : '이 맵의 첫 기록에 도전하세요'; }
function selectTrack(track) {
  selected = track; save('neon-apex-track', track.id); race.reset(track.id);
  race.distance = 700;
  document.body.classList.remove('flux');
  document.querySelectorAll('.course').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.track === track.id)));
  $('selected-level').textContent = `STAGE 0${track.level} / ${track.difficulty}`;
  $('selected-name').textContent = track.name;
  $('selected-description').textContent = `${track.subtitle} · ${track.feature}`;
  $('hud-track').textContent = track.english;
  audio.setTrack(track); record();
}
for (const track of TRACKS) {
  const button = document.createElement('button');
  button.className = 'course'; button.dataset.track = track.id;
  button.style.setProperty('--course-accent', track.theme.accent);
  button.setAttribute('aria-label', `${track.level}단계 ${track.name} ${track.difficulty}`);
  button.innerHTML = `<div class="course-art"><canvas width="320" height="180" aria-hidden="true"></canvas><svg class="course-route" viewBox="0 0 100 100" aria-hidden="true"><path d="${routePath(track)}"/></svg><span class="course-level">0${track.level}</span><span class="course-check">✓</span></div><div class="course-copy"><small>${track.english}</small><strong>${track.name}</strong><div class="course-bottom"><span>${track.difficulty}</span><span class="difficulty-bars" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i class="${i<track.level?'lit':''}"></i>`).join('')}</span></div></div>`;
  button.onclick = () => {if(state==='lobby')online.track(track.id);else selectTrack(track);};
  $('track-list').append(button);
  const c = button.querySelector('canvas').getContext('2d');
  background(c,320,180,track,0,0,false);
  landmark(c,40,170,75,track.theme,1); landmark(c,285,180,60,track.theme,2);
}
selectTrack(selected);

function view() {
  const playing = ['racing','paused','finished'].includes(state); document.body.classList.toggle('playing', playing);
  $('menu').hidden=state!=='menu';$('mode-screen').hidden=state!=='welcome';$('online-screen').hidden=state!=='connect';$('lobby-screen').hidden=state!=='lobby';
  $('guide').hidden=playing||state==='lobby';$('footer').hidden=playing;
  $('hud').hidden = !playing; $('overlay').hidden = state !== 'paused' && state !== 'finished';
  $('net-hud').hidden=mode!=='multi';$('online-ranking').hidden=mode!=='multi';
  if(mode!=='multi')$('online-progress').hidden=true;
  $('restart').hidden=mode==='multi';$('return-lobby').hidden=!(mode==='multi'&&state==='finished'&&online?.client.room?.phase==='results'&&online.client.room.host===online.client.id);
  $('home').textContent=mode==='multi'?'방에서 나가기':'모드 선택으로';
}
function start() {
  mode='single';race=new Race(selected.id);renderer.setOpponents();
  keys.clear(); accumulator = 0; race.reset(selected.id); audio.setTrack(selected);
  state = 'racing'; $('results').replaceChildren(); view(); void unlockAudio();
}
function pause() {
  if (state !== 'racing') return;
  state = 'paused'; keys.clear(); accumulator = 0;
  $('overlay-label').textContent = 'TAKE A BREATH'; $('overlay-title').textContent = 'PIT STOP.';
  $('overlay-text').textContent = mode==='multi'?'온라인 경기는 계속 진행됩니다. 돌아오면 운전을 이어갈 수 있습니다.':'잠시 멈춰도, 레이스는 기다립니다.';
  if(mode==='multi')online.client.input({});
  $('resume').hidden = false; $('results').replaceChildren(); view();
}
function finish() {
  state = 'finished'; const best = bestTime(), isBest = !best || race.time < best;
  if (isBest) save(recordKey(), race.time);
  record(); $('overlay-label').textContent = isBest ? 'NEW COURSE RECORD' : 'RACE COMPLETE';
  $('overlay-title').textContent = `P${race.place}. FINISH.`;
  $('overlay-text').textContent = `${selected.name} 완주! 다른 코스에도 도전해 보세요.`;
  $('resume').hidden = true;
  $('results').innerHTML = `<p>전체 기록 <b>${formatTime(race.time)}</b></p>${race.lapTimes.map((time,i)=>`<p>LAP ${i+1}<b>${formatTime(time)}</b></p>`).join('')}<p>이 맵 최고 <b>${formatTime(bestTime())}</b></p>`;
  view();
}
$('start').onclick = start; $('restart').onclick = start;
$('resume').onclick = () => { state = 'racing'; keys.clear(); accumulator = 0; view(); void unlockAudio(); };
$('home').onclick = () => { if(mode==='multi'&&online.client.room)online.leave();else showMode(); };
$('sound').onclick = async () => { try { await audio.toggle(); audioButton(); } catch { $('sound').textContent = '소리 장치 확인'; } };
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); $('home').click(); });
window.addEventListener('keydown', event => {
  if(!['racing','paused'].includes(state))return;
  if(GAME_KEYS.has(event.code)) event.preventDefault();
  keys.add(event.code); if (event.repeat) return;
  if(event.code==='KeyC'&&state==='racing'){renderer.toggleCamera();race.say('카메라 시점 변경');return;}
  const action = actionForKey(event.code);
  if (action === 'pause') { if (state === 'racing') pause(); else if (state === 'paused') $('resume').click(); }
  else if (state === 'racing' && action) {if(mode==='multi')online.client.action(action);else race[action]();}
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function hud() {
  $('position').innerHTML = `0${race.place}<span> / ${String(mode==='multi'?latestPlayers.length:6).padStart(2,'0')}</span>`;
  $('lap').innerHTML = `LAP ${Math.min(3,race.lapTimes.length+1)} <span>/ 3</span>`;
  $('time').textContent = formatTime(race.time);
  $('speed').textContent = String(Math.round(Math.abs(race.speed)/30)).padStart(3,'0');
  $('energy').style.width = `${race.energy}%`; $('energy-label').textContent = `페이즈 에너지 ${Math.round(race.energy)}%`;
  $('drift').style.width = `${race.drift*100}%`; $('phase').textContent = race.flux ? 'FLUX DIMENSION' : 'STREET MODE';
  $('boost-label').textContent = `충전 ${Math.floor(race.drift*100)}% / 100%`;
  $('boost-inventory').hidden=race.boosts===0;
  $('boost-inventory').classList.toggle('active',race.boostTime>0);
  $('boost-inventory').setAttribute('aria-label',`부스터 ${race.boosts}개 · CTRL 사용`);
  $('boost-count').textContent=String(race.boosts);
  $('recovery').hidden=!race.overturned;
  $('protection').hidden=race.invulnerable<=0;
  $('protection').textContent=`복귀 보호 ${race.invulnerable.toFixed(1)}초`;
  $('surface-label').textContent=`주행 노면 · ${terrainAt(race.track,race.distance).name}`;
  $('boost-status').textContent = race.speed < 0 ? 'R · REVERSE' : race.boostTime > 0 ? 'OVERDRIVE ACTIVE' : race.flux ? 'PHASE DRIVE' : 'D · ELECTRIC DRIVE';
  $('message').textContent = race.countdown > 0 ? (race.countdown > .7 ? String(Math.ceil(race.countdown-.7)) : 'GO!') : race.messageTime > 0 ? race.message : '';
  const ahead = segmentAt(race.distance+3200, race.track).curve;
  $('corner-hint').hidden = race.countdown > 0 || race.speed < 0 || race.overturned;
  $('corner-hint').innerHTML = Math.abs(ahead) > 1.15 ? `<strong>${ahead > 0 ? '↱' : '↰'}</strong>${Math.abs(ahead)>2.5?'급커브':'코너'} · SHIFT 드리프트` : '<strong>↑</strong> 가속 구간';
}
function frame(now) {
  const dt = Math.max(0,Math.min((now-last)/1000,.05)); last = now;
  if (!['racing','paused','finished'].includes(state)) { race.distance += dt*1800; race.time += dt; renderer.draw(race,true); }
  else {
    if (state === 'racing') {
      const input = drivingInput(keys); race.visualSteer = (input.right?1:0)-(input.left?1:0);
      accumulator += dt;
      while (accumulator >= 1/60 && !race.finished) { race.update(1/60,input); accumulator -= 1/60; }
      if (race.finished&&mode==='single') finish();
    }
    if(mode==='multi'){
      sendElapsed+=dt;
      if(sendElapsed>=1/30){sendElapsed=0;online.client.input(state==='racing'?drivingInput(keys):{});}
      race.updatePresentation(now/1000,dt);
      $('net-hud').textContent=`ONLINE · ${online.client.latency} ms · ${latestPlayers.length}명${race.snapshots.stale(now/1000)?' · 연결 지연':''}`;
    }
    const displayRace=mode==='multi'?race.presentation():race;
    renderer.draw(displayRace); renderer.map($('map'),displayRace); document.body.classList.toggle('flux',race.flux); hud();
  }
  audio.update(race,state);
  document.documentElement.dataset.musicPlaying=String(!!audio.ctx&&audio.ctx.state==='running'&&audio.enabled&&audio.musicActive);
  document.documentElement.dataset.gameReady = 'true'; requestAnimationFrame(frame);
}
function restoreTrackCards(){
  $('menu').insertBefore($('track-list'),document.querySelector('.selection-footer'));
  document.querySelectorAll('.course').forEach(button=>button.disabled=false);
}
function showMode(){
  online?.client.disconnect();mode='single';state='welcome';keys.clear();restoreTrackCards();race=new Race(selected.id);renderer.setOpponents();selectTrack(selected);view();
}
function showConnect(){
  state='connect';mode='multi';keys.clear();onlineRound=-1;restoreTrackCards();race=new Race(selected.id);renderer.setOpponents();view();
}
function onlineResults(){
  state='finished';keys.clear();$('resume').hidden=true;$('overlay-label').textContent='RACE TOGETHER';$('overlay-title').textContent='RACE FINISHED';
  $('overlay-text').textContent=online.client.room?.host===online.client.id?'대기실로 돌아가 다음 맵을 선택할 수 있습니다.':'방장이 대기실로 돌아가면 다음 경기를 준비합니다.';
  $('results').replaceChildren();
  for(const player of [...latestPlayers].sort((a,b)=>a.state.place-b.state.place)){
    const row=document.createElement('p'),name=document.createElement('span'),time=document.createElement('b');
    name.textContent=`${player.state.place}. ${player.name}`;time.textContent=player.state.finished?formatTime(player.state.time):player.connected?'미완주':'연결 종료';row.append(name,time);$('results').append(row);
  }
  view();
}
online=new OnlineLobby({
  disconnected:showConnect,
  room(room,myId){
    if(room.phase==='lobby'){
      if(state!=='lobby'||selected.id!==room.trackId){race=new Race(room.trackId);renderer.setOpponents();selectTrack(getTrack(room.trackId));}
      state='lobby';mode='multi';$('room-maps').append($('track-list'));view();
    }else if(room.phase==='racing'&&room.round!==onlineRound){
      onlineRound=room.round;mode='multi';selected=getTrack(room.trackId);race=new OnlineRace(room.trackId);race.rivals=[];
      renderer.setOpponents(room.members.filter(p=>p.id!==myId));audio.setTrack(selected);keys.clear();accumulator=0;
      latestPlayers=[];state='racing';$('hud-track').textContent=selected.english;view();void unlockAudio();
    }else if(room.phase==='results')onlineResults();
  },
  snapshot(msg){
    if(msg.round!==onlineRound||!(race instanceof OnlineRace))return;
    latestPlayers=msg.players;race.applySnapshot(msg.players,online.client.id,msg.tick,performance.now()/1000);
    $('online-ranking').replaceChildren();
    for(const p of [...msg.players].sort((a,b)=>a.state.place-b.state.place)){
      const row=document.createElement('div');row.textContent=`${p.state.place}  ${p.name}${!p.connected?' · 연결 종료':p.state.finished?' · 완주':''}`;row.className=p.id===online.client.id?'me':'';$('online-ranking').append(row);
    }
    $('online-progress').hidden=msg.remaining===null&&!race.finished;
    $('online-progress').textContent=race.finished?`완주! 다른 참가자를 기다립니다${msg.remaining===null?'':` · ${Math.ceil(msg.remaining)}초`}`:`경기 종료까지 ${Math.ceil(msg.remaining||0)}초`;
    if(msg.phase==='results')onlineResults();
  }
},()=>({character:characterId,kart:kartId}));
$('single-mode').onclick=()=>{mode='single';state='menu';restoreTrackCards();view();};
$('multi-mode').onclick=showConnect;
$('single-back').onclick=showMode;$('online-back').onclick=showMode;
window.addEventListener('pointerdown',()=>{void unlockAudio();},{once:true});
void unlockAudio();view();requestAnimationFrame(frame);
