import {OnlineClient} from './client.js';
import {inviteText,readInvite,serverURL} from './protocol.js';
const $=id=>document.getElementById(id);

export class OnlineLobby {
  constructor(callbacks,profile){
    this.callbacks=callbacks;this.profile=profile;
    this.client=new OnlineClient(msg=>this.receive(msg),()=>{
      this.busy(false);callbacks.disconnected();this.status('서버 연결이 끊겼습니다. 다시 참가해 주세요.');
    });
    try{$('server-address').value=localStorage.getItem('apex-server')||'ws://127.0.0.1:8787';$('player-name').value=localStorage.getItem('apex-name')||'레이서';}catch{}
    $('local-host').hidden=!window.desktop;
    this.loadPublicServer();
    $('internet-host').onclick=()=>this.enter('create',false,true);
    $('local-host').onclick=()=>this.enter('create',true);
    $('create-room').onclick=()=>this.enter('create');
    $('join-room').onclick=()=>this.enter('join');
    $('room-ready').onclick=()=>this.client.send('ready',{ready:!this.client.room.members.find(p=>p.id===this.client.id)?.ready});
    $('room-start').onclick=()=>this.client.send('start');
    $('room-leave').onclick=()=>this.leave();
    $('return-lobby').onclick=()=>this.client.send('return');
    $('copy-invite').onclick=async()=>{
      try{const text=$('invite-output').value;if(window.desktop)await window.desktop.copyInvite(text);else await navigator.clipboard.writeText(text);$('room-note').textContent='초대 정보를 복사했습니다. 친구에게 보내 주세요.';}
      catch{$('invite-output').select();$('room-note').textContent='선택된 초대 정보를 Ctrl+C로 복사해 주세요.';}
    };
    $('invite-address').onchange=()=>this.updateInvite();
  }
  status(text){$('online-status').textContent=text;$('room-note').textContent=text;}
  busy(value){for(const id of ['internet-host','local-host','create-room','join-room'])$(id).disabled=value;}
  async loadPublicServer(){
    const apply=config=>{
      this.publicEndpoint=null;
      try{if(config?.endpoint){const endpoint=serverURL(config.endpoint);if(!endpoint.startsWith('wss://'))throw new Error();this.publicEndpoint=endpoint;}}catch{}
      $('public-server-note').textContent=config?.notice||'공개 서버 주소를 직접 입력해 접속할 수 있습니다.';
    };
    try{apply(await (await fetch(new URL('../../public-server.json',import.meta.url))).json());}catch{}
    try{
      const response=await fetch('https://raw.githubusercontent.com/gksrjsgml03-create/neon-apex-Racing/main/public-server.json',{cache:'no-store',signal:AbortSignal.timeout(4000)});
      if(response.ok)apply(await response.json());
    }catch{}
  }
  async enter(type,local=false,internet=false){
    this.busy(true);this.status('서버에 연결 중입니다…');
    try{
      let endpoint=$('server-address').value,code=$('room-code').value.trim().toUpperCase();this.localAddresses=null;
      if(internet){if(!this.publicEndpoint)throw new Error('공개 서버를 준비 중입니다. 잠시 후 다시 시도하거나 서버 주소를 입력해 주세요.');endpoint=this.publicEndpoint;}
      if(type==='join'&&$('invite-input').value.trim()){
        const invite=readInvite($('invite-input').value);endpoint=invite.endpoint;code=invite.code;
      }
      if(type==='join'&&!/^[A-Z0-9]{6}$/.test(code))throw new Error('6자리 방 코드 또는 초대 정보를 입력해 주세요.');
      if(local){const info=await window.desktop.hostServer();endpoint=info.endpoint;this.localAddresses=info.addresses;}
      endpoint=serverURL(endpoint);$('server-address').value=endpoint;
      await this.client.connect(endpoint);
      const name=$('player-name').value.trim()||'레이서';
      try{localStorage.setItem('apex-server',endpoint);localStorage.setItem('apex-name',name);}catch{}
      this.client.enter(type,{...this.profile(),name},code);
    }catch(error){this.status(error.message);this.busy(false);this.client.disconnect();}
  }
  receive(msg){
    if(msg.type==='error'){this.status(msg.message);this.busy(false);}
    if(msg.type==='room'){
      this.busy(false);this.renderRoom(msg.room);this.callbacks.room(msg.room,this.client.id);
    }
    if(msg.type==='snapshot')this.callbacks.snapshot(msg);
  }
  renderRoom(room){
    const host=room.host===this.client.id;
    $('room-title').textContent=`방 ${room.code}`;$('room-count').textContent=`${room.members.length} / 8 RACERS`;
    $('room-players').replaceChildren();
    for(let i=0;i<8;i++){
      const p=room.members[i],card=document.createElement('div');card.className='player-seat'+(p?' occupied':'');
      const number=document.createElement('span');number.className='seat-number';number.textContent=String(i+1).padStart(2,'0');card.append(number);
      const name=document.createElement('strong');name.textContent=p?`${p.name}${p.id===this.client.id?' (나)':''}`:'친구를 기다리는 중';card.append(name);
      const tag=document.createElement('small');tag.textContent=p?(p.id===room.host?'방장':p.ready?'준비 완료':'준비 중'):'EMPTY';card.append(tag);
      $('room-players').append(card);
    }
    $('room-ready').hidden=host;$('room-start').hidden=!host;
    $('room-ready').textContent=room.members.find(p=>p.id===this.client.id)?.ready?'준비 취소':'준비 완료';
    $('room-start').disabled=room.members.length<2||room.members.some(p=>!p.ready);
    $('room-map-note').textContent=host?'맵을 고르면 참가자들이 다시 준비합니다.':'방장이 맵을 선택합니다. 준비 버튼을 눌러 주세요.';
    document.querySelectorAll('.course').forEach(button=>{button.disabled=!host;});
    const key=room.code+this.client.endpoint;
    if(this.inviteKey!==key){
      this.inviteKey=key;$('invite-address').value=this.localAddresses?.[0]||this.client.endpoint;
      $('room-note').textContent=this.localAddresses?'내 PC 방입니다. 같은 공유기의 친구는 이 초대 정보로 참가할 수 있습니다. 다른 인터넷에서는 공개 서버 또는 포트 연결 설정이 필요합니다.':'같은 서버에 접속하는 친구에게 초대 정보를 보내 주세요.';
    }
    this.updateInvite();
  }
  updateInvite(){try{$('invite-output').value=inviteText($('invite-address').value,this.client.room.code);}catch{$('room-note').textContent='초대할 서버 주소를 확인해 주세요.';}}
  track(trackId){this.client.send('track',{trackId});}
  leave(){this.client.send('leave');this.client.disconnect();this.inviteKey=null;this.callbacks.disconnected();this.status('방에서 나왔습니다.');}
}
