// Shared, DOM-free wire contract. The server accepts controls, never client positions.
export const PROTOCOL=1;
export const MAX_PLAYERS=8;
export const STATE_KEYS=['distance','x','speed','time','countdown','energy','flux','boosts','boostTime','drift','drifting','finished','place','lapTimes','lapStart','message','messageTime','collideTimer','visualSteer','lateralVelocity','impactRoll','airHeight','verticalVelocity','overturned','crashTime','rollDirection','invulnerable','impactSerial','respawnSerial'];
export const stateOf=race=>Object.fromEntries(STATE_KEYS.map(key=>[key,race[key]]));
export function cleanInput(input={}){return Object.fromEntries(['accelerate','brake','left','right','drift'].map(key=>[key,input?.[key]===true]));}
export function serverURL(value){
  let text=String(value||'').trim();
  if(!/^\w+:\/\//.test(text))text='ws://'+text;
  const url=new URL(text);
  if(url.protocol==='http:')url.protocol='ws:';
  if(url.protocol==='https:')url.protocol='wss:';
  if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password||!url.hostname)throw new Error('서버 주소를 확인해 주세요.');
  url.hash='';return url.href;
}
export function inviteText(endpoint,code){return `NEONAPEX ${serverURL(endpoint)} ${code}`;}
export function readInvite(text){
  const match=String(text).trim().match(/^NEONAPEX\s+(\S+)\s+([A-Z0-9]{6})$/i);
  if(!match)throw new Error('복사한 초대 정보 전체를 붙여 넣어 주세요.');
  return {endpoint:serverURL(match[1]),code:match[2].toUpperCase()};
}
