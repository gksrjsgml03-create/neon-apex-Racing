export class AudioEngine{
 constructor(){this.enabled=false;}
 toggle(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.osc=this.ctx.createOscillator();this.gain=this.ctx.createGain();this.osc.type='sawtooth';this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=400;this.osc.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(this.ctx.destination);this.gain.gain.value=0;this.osc.start();}this.ctx.resume();this.enabled=!this.enabled;return this.enabled;}
 update(speed,active,boost){if(!this.ctx)return;this.osc.frequency.setTargetAtTime(35+speed/65+(boost?25:0),this.ctx.currentTime,.1);this.gain.gain.setTargetAtTime(this.enabled&&active?.035:0,this.ctx.currentTime,.08);}
}
