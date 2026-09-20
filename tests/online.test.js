import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {Rooms} from '../online/rooms.js';
import {startServer} from '../online/server.js';
import {PROTOCOL,inviteText,readInvite} from '../src/net/protocol.js';
import {OnlineRace} from '../src/net/race.js';

function party(count=2){
 const server=new Rooms(),messages=[];
 const players=Array.from({length:count},()=>server.connect(msg=>messages.push(structuredClone(msg))));
 server.handle(players[0],{type:'create',protocol:PROTOCOL,name:'방장',character:'panda',kart:'petal'});
 const room=players[0].room;
 for(const p of players.slice(1))server.handle(p,{type:'join',protocol:PROTOCOL,code:room.code,name:'친구'});
 return {server,players,room,messages};
}
test('rooms enforce 2–8 seats, host-only maps/start and readiness after map changes',()=>{
 const {server,players,room,messages}=party(1),host=players[0];
 server.handle(host,{type:'start'});assert.equal(room.phase,'lobby');assert.match(messages.at(-1).message,/최소 2/);
 for(let i=1;i<9;i++){const p=server.connect(()=>{});players.push(p);server.handle(p,{type:'join',protocol:PROTOCOL,code:room.code});}
 assert.equal(room.members.length,8);assert.equal(players[8].room,null);
 server.handle(players[1],{type:'track',trackId:'alpine'});assert.equal(room.trackId,'coast');
 server.handle(players[1],{type:'ready',ready:true});server.handle(host,{type:'track',trackId:'forest'});assert.equal(players[1].ready,false);
 server.handle(host,{type:'start'});assert.equal(room.phase,'lobby');
 for(const p of players.slice(1,8))server.handle(p,{type:'ready',ready:true});
 server.handle(host,{type:'start'});assert.equal(room.racers.length,8);assert.equal(room.phase,'racing');assert.equal(room.racers[0].character,'panda');
 server.handle(players[8],{type:'join',protocol:PROTOCOL,code:room.code});assert.equal(players[8].room,null);
});
test('disconnect migrates host, results return to lobby, empty rooms are removed',()=>{
 const {server,players,room}=party();server.disconnect(players[0]);assert.equal(room.host,players[1].id);assert(players[1].ready);
 const guest=server.connect(()=>{});server.handle(guest,{type:'join',protocol:PROTOCOL,code:room.code});server.handle(guest,{type:'ready',ready:true});server.handle(players[1],{type:'start'});
 room.racers[0].race.finished=true;server.update();assert.equal(room.phase,'racing');
 for(let i=0;i<46*60;i++)server.update();assert.equal(room.phase,'results');
 server.handle(players[1],{type:'return'});assert.equal(room.phase,'lobby');assert.equal(guest.ready,false);
 server.disconnect(guest);server.disconnect(players[1]);assert.equal(server.rooms.size,0);
});
test('server owns player collisions and gives recovery immunity to both contacts',()=>{
 const {server,players,room}=party();server.handle(players[1],{type:'ready',ready:true});server.handle(players[0],{type:'start'});
 const [a,b]=room.racers.map(p=>p.race);a.countdown=b.countdown=0;a.distance=b.distance=5000;a.x=-.1;b.x=.1;a.speed=b.speed=5000;
 server.update();assert.equal(a.impactSerial,1);assert.equal(b.impactSerial,1);assert(a.lateralVelocity<0);assert(b.lateralVelocity>0);
 server.handle(players[0],{type:'action',round:room.round,action:'respawn'});server.update();assert(a.invulnerable>0);assert(a.distance<5000);
});
test('invite roundtrip and remote snapshots do not spawn AI or accept invalid protocols',()=>{
 assert.deepEqual(readInvite(inviteText('https://race.example','ABC123')),{endpoint:'wss://race.example/',code:'ABC123'});
 assert.throws(()=>readInvite('https://unknown.example'));
 const {server,players,room}=party();server.handle(players[1],{type:'ready',ready:true});server.handle(players[0],{type:'start'});
 const view=new OnlineRace(room.trackId);view.applySnapshot(room.racers.map(p=>({id:p.id,state:p.race})),players[0].id);
 const before=view.rivals[0].distance;view.countdown=0;view.update(.1,{});assert.equal(view.rivals[0].distance,before);
 const invalid=server.connect(()=>{});server.handle(invalid,{type:'create',protocol:0});assert.equal(invalid.room,null);
});

async function peer(url){
 const socket=new WebSocket(url),queue=[];let notify;
 socket.on('message',data=>{queue.push(JSON.parse(data));notify?.();});
 const wait=async(type,predicate=()=>true)=>{
   const deadline=Date.now()+3000;
   while(Date.now()<deadline){const i=queue.findIndex(m=>m.type===type&&predicate(m));if(i>=0)return queue.splice(i,1)[0];await new Promise(resolve=>{const timer=setTimeout(resolve,25);notify=()=>{clearTimeout(timer);resolve();};});}
   throw new Error('Timed out waiting for '+type);
 };
 const hello=await wait('hello');return {socket,id:hello.id,wait,send:(type,data={})=>socket.send(JSON.stringify({type,...data}))};
}
test('two real WebSocket clients join, race, receive matching server snapshots and disconnect',async()=>{
 const server=await startServer({port:0,host:'127.0.0.1',manualTick:true});let a,b;
 try{
  a=await peer(`ws://127.0.0.1:${server.port}`);b=await peer(`ws://127.0.0.1:${server.port}`);
  a.send('create',{protocol:PROTOCOL,name:'A'});const {room}=await a.wait('room');
  b.send('join',{protocol:PROTOCOL,code:room.code,name:'B'});await b.wait('room');
  b.send('ready',{ready:true});await a.wait('room',m=>m.room.members.length===2&&m.room.members.every(p=>p.ready));
  a.send('start');await a.wait('room',m=>m.room.phase==='racing');await b.wait('room',m=>m.room.phase==='racing');
  for(let i=0;i<200;i++)server.rooms.update();
  a.send('input',{round:1,input:{accelerate:true},distance:999999999,boosts:999});a.send('ping',{stamp:1});await a.wait('pong');
  for(let i=0;i<18;i++)server.rooms.update();
  const x=await a.wait('snapshot',m=>m.tick>=216),y=await b.wait('snapshot',m=>m.tick===x.tick);
  assert.deepEqual(x.players,y.players);const me=x.players.find(p=>p.id===a.id).state;assert(me.speed>0);assert(me.distance<1000);assert.equal(me.boosts,1);
  b.socket.close();await a.wait('room',m=>m.room.members.length===1);
 }finally{a?.socket.terminate();b?.socket.terminate();await server.close();}
});

test('guest can continue in the same room and start a second round without invites',()=>{
 const {server,players,room}=party();const code=room.code;
 server.handle(players[1],{type:'ready',ready:true});server.handle(players[0],{type:'start'});
 server.handle(players[1],{type:'return'});assert.equal(room.phase,'racing');
 for(const p of room.racers)p.race.finished=true;server.update();assert.equal(room.phase,'results');
 server.handle(players[1],{type:'return'});assert.equal(room.phase,'lobby');assert.equal(room.code,code);assert.equal(room.members.length,2);
 assert(players.every(p=>p.room===room));assert.equal(players[1].ready,false);
 server.handle(players[1],{type:'ready',ready:true});server.handle(players[0],{type:'return'});assert.equal(players[1].ready,true);
 server.handle(players[0],{type:'start'});assert.equal(room.round,2);assert.equal(room.phase,'racing');
});
