import {PROTOCOL,serverURL} from './protocol.js';

export class OnlineClient {
  constructor(onMessage,onClose){this.onMessage=onMessage;this.onClose=onClose;this.room=null;this.round=0;this.latency=0;}
  async connect(endpoint){
    this.disconnect();this.endpoint=serverURL(endpoint);
    await new Promise((resolve,reject)=>{
      const socket=new WebSocket(this.endpoint);this.socket=socket;let settled=false,pingTimer;
      const timer=setTimeout(()=>{reject(new Error('서버에 연결하지 못했습니다. 주소와 서버 실행 상태를 확인해 주세요.'));socket.close();},8000);
      socket.onmessage=event=>{
        if(this.socket!==socket)return;
        let msg;try{msg=JSON.parse(event.data);}catch{return;}
        if(msg.type==='hello'){
          if(msg.protocol!==PROTOCOL){clearTimeout(timer);reject(new Error('서버와 게임 버전이 다릅니다.'));socket.close();return;}
          this.id=msg.id;settled=true;clearTimeout(timer);resolve();
          pingTimer=setInterval(()=>this.send('ping',{stamp:performance.now()}),2000);this.pingTimer=pingTimer;
        }
        if(msg.type==='pong')this.latency=Math.round(performance.now()-msg.stamp);
        if(msg.type==='room'){this.room=msg.room;this.round=msg.room.round;}
        if(msg.type==='left')this.room=null;
        this.onMessage(msg);
      };
      socket.onerror=()=>{if(!settled){clearTimeout(timer);reject(new Error('서버에 연결할 수 없습니다. 서버 주소와 방화벽을 확인해 주세요.'));}};
      socket.onclose=()=>{
        clearTimeout(timer);clearInterval(pingTimer);
        if(!settled)reject(new Error('서버 연결이 종료되었습니다.'));
        if(this.socket===socket){this.socket=null;this.room=null;if(settled)this.onClose();}
      };
    });
  }
  send(type,data={}){if(this.socket?.readyState===1)this.socket.send(JSON.stringify({type,...data}));}
  enter(type,profile,code){this.send(type,{protocol:PROTOCOL,...profile,code});}
  input(input){this.send('input',{round:this.round,input});}
  action(action){this.send('action',{round:this.round,action});}
  disconnect(){clearInterval(this.pingTimer);const socket=this.socket;this.socket=null;this.room=null;socket?.close();}
}
