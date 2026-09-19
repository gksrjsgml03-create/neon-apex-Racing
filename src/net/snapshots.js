const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const continuous=['distance','x','speed','visualSteer','impactRoll','airHeight','verticalVelocity'];

// Buffer presentation only. Physics, inventory, laps and contacts remain authoritative.
export class SnapshotBuffer {
  constructor({delay=.1,maxExtrapolation=.1}={}){
    this.delay=delay;this.maxExtrapolation=maxExtrapolation;this.tracks=new Map();this.lastTick=-1;
    this.offset=null;this.playhead=null;this.lastFrame=null;this.lastArrival=null;
  }
  push(players,tick,arrival){
    if(!Number.isFinite(tick)||tick<=this.lastTick)return false;
    this.lastTick=tick;this.lastArrival=arrival;
    const time=tick/60,offset=arrival-time;
    this.offset=this.offset===null?offset:Math.min(offset,this.offset+.001);
    const present=new Set();
    for(const player of players){
      present.add(player.id);let track=this.tracks.get(player.id);
      if(!track){track={frames:[],meta:player};this.tracks.set(player.id,track);}
      const last=track.frames.at(-1);
      if(last&&last.state.respawnSerial!==player.state.respawnSerial)track.frames=[];
      track.meta=player;track.frames.push({time,state:{...player.state}});
      if(track.frames.length>40)track.frames.shift();
    }
    for(const id of this.tracks.keys())if(!present.has(id))this.tracks.delete(id);
    return true;
  }
  advance(now){
    if(this.offset===null)return [];
    const target=now-this.offset-this.delay,dt=this.lastFrame===null?0:Math.max(0,now-this.lastFrame);
    if(this.playhead===null||dt>1)this.playhead=target;
    else this.playhead+=dt*clamp(1+(target-this.playhead)*2,.85,1.15);
    this.lastFrame=now;
    return [...this.tracks.keys()].map(id=>this.sample(id,this.playhead));
  }
  sample(id,time){
    const track=this.tracks.get(id);if(!track)return null;
    const frames=track.frames,first=frames[0],last=frames.at(-1);
    let state={...last.state};
    if(time<=first.time)state={...first.state};
    else if(time<last.time){
      const index=frames.findIndex(frame=>frame.time>=time),a=frames[index-1],b=frames[index];
      const t=(time-a.time)/(b.time-a.time);state={...a.state};
      for(const key of continuous)if(Number.isFinite(a.state[key])&&Number.isFinite(b.state[key]))state[key]=a.state[key]+(b.state[key]-a.state[key])*t;
    }else if(!state.finished&&!state.overturned&&state.countdown<=0&&track.meta.connected!==false){
      const dt=clamp(time-last.time,0,this.maxExtrapolation);
      state.distance+=state.speed*dt;
      state.x+=(state.lateralVelocity||0)*dt;
    }
    const {id:playerId,name,kart,character,connected}=track.meta;
    return {...state,id:playerId,name,kart,character,connected};
  }
  stale(now){return this.lastArrival!==null&&now-this.lastArrival>.35;}
}
