import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {readFile} from 'node:fs/promises';
import {PROTOCOL} from '../src/net/protocol.js';
const {endpoint}=JSON.parse(await readFile(new URL('../public-server.json',import.meta.url),'utf8'));
const sockets=[];
async function peer(name){
  const socket=new WebSocket(endpoint);sockets.push(socket);const queue=[];let error;
  socket.on('error',value=>error=value);socket.on('message',raw=>queue.push(JSON.parse(raw)));
  const wait=async(type,predicate=()=>true)=>{
    const deadline=Date.now()+12000;
    while(Date.now()<deadline){if(error)throw error;const i=queue.findIndex(m=>m.type===type&&predicate(m));if(i>=0)return queue.splice(i,1)[0];await new Promise(r=>setTimeout(r,20));}
    throw new Error(`Public route timed out: ${type}`);
  };
  const hello=await wait('hello');assert.equal(hello.protocol,PROTOCOL);
  return {id:hello.id,name,wait,send:(type,data={})=>socket.send(JSON.stringify({type,...data}))};
}
let timer;
try{
  const a=await peer('연결 확인 A'),b=await peer('연결 확인 B');
  a.send('create',{name:a.name,protocol:PROTOCOL});const {room}=await a.wait('room');
  b.send('join',{name:b.name,protocol:PROTOCOL,code:room.code});await b.wait('room');
  b.send('ready',{ready:true});await a.wait('room',m=>m.room.members.length===2&&m.room.members.every(p=>p.ready));
  a.send('start');const started=await a.wait('room',m=>m.room.phase==='racing');await b.wait('room',m=>m.room.phase==='racing');
  timer=setInterval(()=>a.send('input',{round:started.room.round,input:{accelerate:true}}),80);
  const x=await a.wait('snapshot',m=>m.players.find(p=>p.id===a.id).state.speed>300);
  const y=await b.wait('snapshot',m=>m.tick===x.tick);assert.deepEqual(x.players,y.players);
  console.log(JSON.stringify({publicWss:true,players:2,sharedStart:true,matchingStates:true,controlsDelivered:true}));
}finally{clearInterval(timer);for(const socket of sockets)socket.close();setTimeout(()=>{for(const socket of sockets)socket.terminate();},500).unref();}
