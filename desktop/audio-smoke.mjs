import { AudioEngine } from '../src/audio.js';

// Render actual Web Audio graphs offline; this checks non-silent output without
// relying on an operating-system speaker, volume mixer or microphone.
export async function verifyAudio() {
  const results = {};
  for (const layer of ['music','engine','road','drift','boost']) {
    const context = new OfflineAudioContext(1, 24000, 24000);
    const audio = new AudioEngine(); audio.initialize(context);
    if (layer === 'music') for (let i=0;i<6;i++) audio.musicStep(i*.13,i);
    if (layer === 'engine') audio.engine.gain.gain.value = .15;
    if (layer === 'road') audio.road.gain.gain.value = .15;
    if (layer === 'drift') { audio.skid.gain.gain.value = .2; audio.skidTone.gain.gain.value = .05; }
    if (layer === 'boost') audio.boostSound();
    const buffer = await context.startRendering();
    const samples = buffer.getChannelData(0);
    const rms = Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
    results[layer] = { rms, audibleSignal: rms > .001 };
  }
  return results;
}
