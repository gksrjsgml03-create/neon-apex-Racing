import {Race} from '../race.js';
import {STATE_KEYS} from './protocol.js';
import {SnapshotBuffer} from './snapshots.js';

export class OnlineRace extends Race {
  constructor(trackId){super(trackId);this.snapshots=new SnapshotBuffer();this.visualOffset={distance:0,x:0};this.hasSnapshot=false;}
  // Remote vehicles are snapshots, never single-player AI.
  updateRivals(){}
  applySnapshot(players,myId,tick=this.snapshots.lastTick+3,arrival=performance.now()/1000){
    const self=players.find(p=>p.id===myId);if(!self)return;
    if(tick<=this.snapshots.lastTick)return;
    const previous={distance:this.distance+this.visualOffset.distance,x:this.x+this.visualOffset.x};
    const snap=!this.hasSnapshot||this.respawnSerial!==self.state.respawnSerial||self.state.countdown>0||Math.abs(previous.distance-self.state.distance)>2500;
    for(const key of STATE_KEYS)this[key]=self.state[key];
    this.visualOffset=snap?{distance:0,x:0}:{distance:previous.distance-this.distance,x:previous.x-this.x};this.hasSnapshot=true;
    this.snapshots.push(players.filter(p=>p.id!==myId),tick,arrival);
    this.updatePresentation(arrival,0);
  }
  updatePresentation(now,dt){
    this.visualOffset.distance*=Math.exp(-dt*12);this.visualOffset.x*=Math.exp(-dt*12);
    this.rivals=this.snapshots.advance(now).map((p,i)=>({...p,x:Math.max(-this.track.width+.1,Math.min(this.track.width-.1,p.x)),color:['#ff719a','#a992ff','#ffcb62','#71c9ff','#8bdfb6','#f5ad79','#f5f4ed'][i]}));
  }
  presentation(){return {...this,distance:this.distance+this.visualOffset.distance,x:this.x+this.visualOffset.x};}
}
