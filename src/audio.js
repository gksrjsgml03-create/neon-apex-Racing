const frequency = note => 440 * 2 ** ((note - 69) / 12);

// Original procedural music and effects: no downloads or copyrighted samples.
export class AudioEngine {
  constructor() {
    this.enabled = true;
    this.musicVolume = .55;
    this.effectsVolume = .75;
    this.musicActive = false;
    this.bpm = 116;
    this.root = 57;
    this.lastBoost = false;
    this.lastImpact = 0;
    this.lastCount = null;
    this.step = 0;
  }

  initialize(context) {
    if (this.ctx) return;
    this.ctx = context;
    const c = this.ctx;
    this.master = c.createGain();
    this.music = c.createGain();
    this.effects = c.createGain();
    this.compressor = c.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.ratio.value = 5;
    this.master.gain.value = .7;
    this.music.gain.value = this.musicVolume;
    this.effects.gain.value = this.effectsVolume;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(c.destination);

    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    this.engine = this.oscillator('sawtooth', 55, 0, 650);
    this.motor = this.oscillator('triangle', 110, 0, 1100);
    this.road = this.noiseLoop('lowpass', 800);
    this.skid = this.noiseLoop('bandpass', 1900);
    this.skid.filter.Q.value = 1.5;
    this.skidTone = this.oscillator('sine', 820, 0, 2200);
    this.air = this.noiseLoop('highpass', 650);
    this.nextNote = c.currentTime;
  }

  async unlock() {
    if (!this.ctx) {
      this.initialize(new (window.AudioContext || window.webkitAudioContext)());
      this.timer = window.setInterval(() => this.schedule(), 60);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx.state === 'running';
  }

  async toggle() {
    this.enabled = !this.enabled;
    await this.unlock();
    this.setVolumes(this.musicVolume, this.effectsVolume);
    return this.enabled;
  }

  setVolumes(music, effects) {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.effectsVolume = Math.max(0, Math.min(1, effects));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.enabled ? .7 : 0, now, .04);
    this.music.gain.setTargetAtTime(this.musicVolume, now, .04);
    this.effects.gain.setTargetAtTime(this.effectsVolume, now, .04);
  }

  oscillator(type, hz, volume, cutoff) {
    const c = this.ctx, source = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
    source.type = type; source.frequency.value = hz;
    gain.gain.value = volume; filter.type = 'lowpass'; filter.frequency.value = cutoff;
    source.connect(filter); filter.connect(gain); gain.connect(this.effects); source.start();
    return { source, gain, filter };
  }

  noiseLoop(type, hz) {
    const c = this.ctx, source = c.createBufferSource(), gain = c.createGain(), filter = c.createBiquadFilter();
    source.buffer = this.noise; source.loop = true;
    gain.gain.value = 0; filter.type = type; filter.frequency.value = hz;
    source.connect(filter); filter.connect(gain); gain.connect(this.effects); source.start();
    return { source, gain, filter };
  }

  tone(note, when, duration, volume, type = 'triangle', bus = this.music, endNote = note) {
    const c = this.ctx, osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency(note), when);
    osc.frequency.exponentialRampToValueAtTime(frequency(endNote), when + duration);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    osc.connect(gain); gain.connect(bus);
    osc.start(when); osc.stop(when + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  percussion(when, duration, volume, hz, bus = this.music) {
    const c = this.ctx, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = hz;
    gain.gain.setValueAtTime(volume, when); gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(filter); filter.connect(gain); gain.connect(bus);
    source.start(when); source.stop(when + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  musicStep(when, step) {
    const beat = 60 / this.bpm, bar = Math.floor(step / 16) % 4;
    const chord = [0, 5, 3, 7][bar], root = this.root + chord;
    const melody = [12, 16, 19, 16, 14, 16, 12, 7, 12, 19, 21, 19, 16, 14, 12, 14];
    if (step % 2 === 0) this.tone(root + melody[(step / 2) % melody.length], when, beat * .42, .095, 'triangle');
    if (step % 4 === 0) {
      this.tone(root - 24, when, beat * .7, .15, 'triangle');
      this.tone(44, when, .15, .40, 'sine', this.music, 22);
    }
    if (step % 8 === 4) this.percussion(when, .14, .12, 1200);
    if (step % 2 === 0) this.percussion(when, .045, .045, 6500);
    if (step % 16 === 0) for (const interval of [0, 4, 7]) this.tone(root + interval, when, beat * 3.5, .026, 'sine');
  }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (!this.enabled || !this.musicActive) { this.nextNote = now; return; }
    this.nextNote = Math.max(now, this.nextNote);
    while (this.nextNote < now + .15) {
      this.musicStep(this.nextNote, this.step++);
      this.nextNote += 60 / this.bpm / 4;
    }
  }

  setTrack(track) {
    this.bpm = track.bpm;
    this.root = [57, 60, 55, 62, 59][track.level - 1];
    this.step = 0;
    this.lastCount = null;
    this.lastBoost = false;
    if (this.ctx) this.nextNote = this.ctx.currentTime;
  }

  boostSound() {
    const now = this.ctx.currentTime;
    this.tone(40, now, .6, .19, 'sawtooth', this.effects, 78);
    this.percussion(now, .8, .23, 900, this.effects);
  }

  update(race, state) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, active = state === 'racing', driving = active && race.countdown === 0 && !race.overturned;
    const speed = Math.abs(race.speed), ratio = Math.min(1, speed / 6500), boost = race.boostTime > 0;
    this.musicActive = true;
    this.master.gain.setTargetAtTime(this.enabled ? .7 : 0, now, .04);
    const set = (node, value) => node.gain.gain.setTargetAtTime(driving ? value : 0, now, .07);
    set(this.engine, .045 + ratio * .07); set(this.motor, .035 + ratio * .045);
    set(this.road, ratio * .12); set(this.skid, race.drifting ? .19 : 0);
    set(this.skidTone, race.drifting ? .045 : 0); set(this.air, boost ? .13 : 0);
    this.engine.source.frequency.setTargetAtTime(48 + ratio * 135, now, .1);
    this.engine.filter.frequency.setTargetAtTime(350 + ratio * 1100, now, .1);
    this.motor.source.frequency.setTargetAtTime(98 + ratio * 270, now, .1);
    this.road.filter.frequency.setTargetAtTime(450 + ratio * 1000, now, .1);
    this.skidTone.source.frequency.setTargetAtTime(780 + Math.sin(race.time * 27) * 90, now, .03);
    if (driving && boost && !this.lastBoost) this.boostSound();
    if(active&&race.impactSerial!==this.lastImpact){this.percussion(now,.25,.3,220,this.effects);this.lastImpact=race.impactSerial;}
    this.lastBoost = boost;
    const count = Math.max(0, Math.ceil(race.countdown - .7));
    if (active && count !== this.lastCount && race.countdown > 0) this.tone(count ? 76 : 88, now, count ? .12 : .45, .17, 'sine', this.effects);
    this.lastCount = active ? count : null;
  }
}
