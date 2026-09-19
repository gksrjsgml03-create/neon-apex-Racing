import {Race} from '../race.js';
import {STATE_KEYS} from './protocol.js';

export class OnlineRace extends Race {
  // Remote vehicles are snapshots, never single-player AI.
  updateRivals(){}
  applySnapshot(players,myId){
    const self=players.find(p=>p.id===myId);if(!self)return;
    for(const key of STATE_KEYS)this[key]=self.state[key];
    this.rivals=players.filter(p=>p.id!==myId).map((p,i)=>({...p.state,id:p.id,name:p.name,kart:p.kart,character:p.character,connected:p.connected,color:['#ff719a','#a992ff','#ffcb62','#71c9ff','#8bdfb6','#f5ad79','#f5f4ed'][i]}));
  }
}
