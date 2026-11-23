// audio.js — every sound is synthesised with WebAudio oscillators and
// filtered noise; there are no audio files. The context is created lazily
// on the first user gesture (browser autoplay rules) and every call is
// safe before that: silence, never an error.

let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freqFrom, freqTo, seconds, type = 'sine', volume = 1, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + seconds);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

function noiseBurst(seconds, volume = 0.6, delay = 0, freq = 2400) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, (seconds * ctx.sampleRate) | 0);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

export const sfx = {
  pickup() { tone(880, 1320, 0.09, 'triangle', 0.7); tone(1320, 1760, 0.1, 'triangle', 0.5, 0.06); },
  bigPickup() { tone(660, 990, 0.12, 'triangle', 0.8); tone(990, 1480, 0.14, 'triangle', 0.7, 0.09); tone(1480, 1980, 0.2, 'sine', 0.6, 0.18); },
  coin() { tone(1900, 1500, 0.05, 'square', 0.35); noiseBurst(0.06, 0.4, 0.02, 3200); },
  emp() { tone(1400, 60, 0.45, 'sawtooth', 0.5); noiseBurst(0.3, 0.35, 0, 900); },
  pick() { tone(300 + Math.random() * 60, 240, 0.04, 'square', 0.25); },
  cut() { noiseBurst(0.12, 0.7, 0, 1800); tone(220, 90, 0.12, 'square', 0.3, 0.02); },
  spotted() { tone(520, 780, 0.16, 'square', 0.5); tone(520, 780, 0.16, 'square', 0.5, 0.2); },
  alarmTick() { tone(1150, 1150, 0.05, 'square', 0.22); },
  busted() { tone(392, 392, 0.22, 'sawtooth', 0.6); tone(311, 311, 0.22, 'sawtooth', 0.6, 0.2); tone(233, 110, 0.5, 'sawtooth', 0.65, 0.4); },
  levelClear() { tone(523, 523, 0.12, 'triangle', 0.7); tone(659, 659, 0.12, 'triangle', 0.7, 0.11); tone(784, 784, 0.12, 'triangle', 0.7, 0.22); tone(1046, 1046, 0.3, 'triangle', 0.8, 0.33); },
  click() { tone(700, 500, 0.05, 'square', 0.3); },
};
