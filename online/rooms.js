import {randomBytes,randomUUID} from 'node:crypto';
import {Race} from '../src/race.js';
import {TRACKS} from '../src/tracks.js';
import {hitKart} from '../src/collision.js';
import {PROTOCOL,MAX_PLAYERS,cleanInput,stateOf} from '../src/net/protocol.js';

const characters=['ace','rosie','shadow','fox','panda','robot'];
const karts=['bolt','petal','ember','sunny','ranger'];
const fail=message=>{throw new Error(message);};
export class Rooms {
  constructor(){this.rooms=new Map();this.clients=new Map();this.tick=0;}
  connect(send){const p={id:randomUUID(),send,room:null,name:'레이서',ready:false,input:{},actions:[],lastInput:0};this.clients.set(p.id,p);send({type:'hello',id:p.id,protocol:PROTOCOL});return p;}
  reply(p,type,data={}){p.send({type,...data});}
  broadcast(room,type,data={}){for(const id of room.members)this.reply(this.clients.get(id),type,data);}
  roomInfo(room){return {code:room.code,host:room.host,trackId:room.trackId,phase:room.phase,round:room.round,maxPlayers:MAX_PLAYERS,members:room.members.map(id=>{const p=this.clients.get(id);return {id,name:p.name,ready:p.ready,character:p.character,kart:p.kart};})};}
  publish(room){this.broadcast(room,'room',{room:this.roomInfo(room)});}
  handle(p,msg){
    try{
      if(!msg||typeof msg.type!=='string')return;
      if(msg.type==='ping'){this.reply(p,'pong',{stamp:msg.stamp});return;}
      if(msg.type==='leave'){this.leave(p);return;}
      if(msg.type==='create'||msg.type==='join'){
        if(p.room)fail('이미 방에 참가 중입니다.');
        if(msg.protocol!==PROTOCOL)fail('게임 버전이 다릅니다. 같은 최신 버전을 사용해 주세요.');
        p.name=String(msg.name||'레이서').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,16)||'레이서';
        p.character=characters.includes(msg.character)?msg.character:'ace';p.kart=karts.includes(msg.kart)?msg.kart:'bolt';
        let room;
        if(msg.type==='create'){
          if(this.rooms.size>=100)fail('서버에 방이 가득 찼습니다.');
          let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(this.rooms.has(code));
          room={code,host:p.id,trackId:'coast',members:[],phase:'lobby',round:0,racers:[],elapsed:0};this.rooms.set(code,room);
        }else{
          room=this.rooms.get(String(msg.code||'').trim().toUpperCase());
          if(!room)fail('방을 찾지 못했습니다. 초대 코드와 서버 주소를 확인해 주세요.');
          if(room.phase!=='lobby')fail('이미 경기 중인 방입니다. 다음 경기를 기다려 주세요.');
          if(room.members.length>=MAX_PLAYERS)fail('방 정원 8명이 모두 찼습니다.');
        }
        room.members.push(p.id);p.room=room;p.ready=p.id===room.host;this.publish(room);return;
      }
      const room=p.room;if(!room)fail('먼저 방에 참가해 주세요.');
      if(msg.type==='input'){
        if(room.phase==='racing'&&msg.round===room.round){p.input=cleanInput(msg.input);p.lastInput=this.tick;}
        return;
      }
      if(msg.type==='action'){
        if(room.phase==='racing'&&msg.round===room.round&&['boost','shift','respawn'].includes(msg.action)&&p.actions.length<3)p.actions.push(msg.action);
        return;
      }
      if(msg.type==='track'){
        if(p.id!==room.host||room.phase!=='lobby')fail('대기실에서 방장만 맵을 바꿀 수 있습니다.');
        if(!TRACKS.some(t=>t.id===msg.trackId))fail('지원하지 않는 맵입니다.');
        room.trackId=msg.trackId;for(const id of room.members)this.clients.get(id).ready=id===room.host;this.publish(room);return;
      }
      if(msg.type==='ready'){
        if(room.phase!=='lobby')return;p.ready=p.id===room.host||msg.ready===true;this.publish(room);return;
      }
      if(msg.type==='start'){
        if(p.id!==room.host||room.phase!=='lobby')fail('방장만 경기를 시작할 수 있습니다.');
        if(room.members.length<2)fail('최소 2명이 있어야 시작할 수 있습니다.');
        if(room.members.some(id=>!this.clients.get(id).ready))fail('모든 참가자의 준비를 기다려 주세요.');
        this.start(room);return;
      }
      if(msg.type==='return'){
        if(room.phase==='lobby')return;
        if(room.phase!=='results')fail('경기가 모두 종료된 후 계속할 수 있습니다.');
        room.phase='lobby';room.racers=[];for(const id of room.members)this.clients.get(id).ready=id===room.host;this.publish(room);
      }
    }catch(error){this.reply(p,'error',{message:error.message});}
  }
  start(room){
    room.phase='racing';room.round++;room.elapsed=0;room.finishDeadline=null;
    room.racers=room.members.map((id,i)=>{
      const p=this.clients.get(id),race=new Race(room.trackId);race.rivals=[];
      race.distance=-Math.floor(i/2)*360;race.x=(i%2?1:-1)*.38;
      p.input={};p.actions=[];p.lastInput=this.tick;
      return {id,name:p.name,character:p.character,kart:p.kart,race,connected:true};
    });
    this.publish(room);this.snapshot(room);
  }
  standings(room){return [...room.racers].sort((a,b)=>Number(b.race.finished)-Number(a.race.finished)||(a.race.finished?a.race.time-b.race.time:b.race.distance-a.race.distance));}
  snapshot(room){
    const standings=this.standings(room);standings.forEach((r,i)=>r.race.place=i+1);
    this.broadcast(room,'snapshot',{round:room.round,tick:this.tick,phase:room.phase,remaining:room.finishDeadline===null?null:Math.max(0,room.finishDeadline-room.elapsed),players:room.racers.map(p=>({id:p.id,name:p.name,character:p.character,kart:p.kart,connected:p.connected,state:stateOf(p.race)}))});
  }
  update(dt=1/60){
    this.tick++;
    for(const room of this.rooms.values()){
      if(room.phase!=='racing')continue;room.elapsed+=dt;
      for(const player of room.racers){
        if(!player.connected||player.race.finished)continue;
        const p=this.clients.get(player.id),race=player.race;
        // Discard held keys when the client stops sending (focus loss/network interruption).
        const input=this.tick-p.lastInput>30?{}:p.input;
        for(const action of p.actions.splice(0)){
          if(action==='respawn')race.rivals=room.racers.filter(other=>other!==player&&other.connected).map(other=>other.race);
          race[action]();race.rivals=[];
        }
        race.visualSteer=Number(input.right||false)-Number(input.left||false);race.update(dt,input);
      }
      for(let i=0;i<room.racers.length;i++)for(let j=i+1;j<room.racers.length;j++){
        const a=room.racers[i],b=room.racers[j],ra=a.race,rb=b.race;
        if(!a.connected||!b.connected||ra.finished||rb.finished||ra.countdown>0||ra.flux||rb.flux||ra.invulnerable>0||rb.invulnerable>0||ra.collideTimer>0||rb.collideTimer>0)continue;
        const gap=Math.abs(ra.distance-rb.distance)%ra.track.length;
        if(Math.min(gap,ra.track.length-gap)<240&&Math.abs(ra.x-rb.x)<.28){
          const direction=ra.x>=rb.x?1:-1,sa=ra.speed,sb=rb.speed;
          hitKart(ra,{speed:sb},direction);hitKart(rb,{speed:sa},-direction);
        }
      }
      if(room.finishDeadline===null&&room.racers.some(p=>p.race.finished))room.finishDeadline=room.elapsed+45;
      if(room.racers.every(p=>p.race.finished||!p.connected)||room.elapsed>=600||(room.finishDeadline!==null&&room.elapsed>=room.finishDeadline)){
        room.phase='results';this.snapshot(room);this.publish(room);
      }else if(this.tick%3===0)this.snapshot(room);
    }
  }
  leave(p){
    const room=p.room;if(!room)return;p.room=null;p.input={};p.actions=[];
    room.members=room.members.filter(id=>id!==p.id);
    const racer=room.racers.find(r=>r.id===p.id);if(racer){racer.connected=false;racer.race.speed=0;}
    this.reply(p,'left');
    if(!room.members.length){this.rooms.delete(room.code);return;}
    if(room.host===p.id){room.host=room.members[0];this.clients.get(room.host).ready=true;}
    this.publish(room);
  }
  disconnect(p){this.leave(p);this.clients.delete(p.id);}
}
