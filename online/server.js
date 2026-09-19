import http from 'node:http';
import {WebSocketServer} from 'ws';
import {Rooms} from './rooms.js';

export async function startServer({port=8787,host='0.0.0.0',manualTick=false}={}){
  const rooms=new Rooms();
  const server=http.createServer((req,res)=>{
    if(req.url!=='/health'){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({ok:true,game:'Neon Apex',protocol:1}));
  });
  const wss=new WebSocketServer({server,maxPayload:2048,perMessageDeflate:false});
  wss.on('connection',socket=>{
    if(wss.clients.size>800){socket.close(1013,'Server full');return;}
    socket.alive=true;socket.on('pong',()=>socket.alive=true);socket.on('error',()=>{});
    const p=rooms.connect(data=>{
      if(socket.readyState===1){if(socket.bufferedAmount>256*1024){socket.terminate();return;}socket.send(JSON.stringify(data));}
    });
    let windowStart=Date.now(),messages=0;
    socket.on('message',(data,binary)=>{
      if(Date.now()-windowStart>1000){windowStart=Date.now();messages=0;}
      if(++messages>100||binary){socket.close(1008,'Invalid traffic');return;}
      try{rooms.handle(p,JSON.parse(data.toString()));}catch{socket.close(1008,'Invalid JSON');}
    });
    socket.on('close',()=>rooms.disconnect(p));
  });
  let last=performance.now(),accumulator=0;
  const timer=manualTick?null:setInterval(()=>{
    const now=performance.now();accumulator+=Math.min(.25,(now-last)/1000);last=now;
    while(accumulator>=1/60){rooms.update(1/60);accumulator-=1/60;}
  },1000/60);
  const heartbeat=setInterval(()=>{for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}},10000);
  const close=async()=>{clearInterval(timer);clearInterval(heartbeat);for(const socket of wss.clients)socket.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));};
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});}
  catch(error){clearInterval(timer);clearInterval(heartbeat);wss.close();throw error;}
  return {port:server.address().port,rooms,close};
}
