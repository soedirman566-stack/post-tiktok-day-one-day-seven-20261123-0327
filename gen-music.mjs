// A tiny synthesized heist groove: kick, hats, a walking bass and sparse
// plucks in A minor at 116 BPM. Rendered to 16-bit WAV, no samples, no
// copyrighted material — every sound is a shaped oscillator/noise burst.
import { writeFileSync } from 'node:fs';

const SR = 44100;
const BPM = 116;
const BEAT = 60 / BPM;
const BARS = 11;                       // ~22.8 s
const DUR = BARS * 4 * BEAT;
const N = Math.floor(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);

const add = (buf, t, fn) => {
  const s = Math.floor(t * SR);
  for (let i = 0; i < fn.length && s + i < N; i++) { buf[s + i] += fn[i]; }
};
const env = (n, a, d) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = i < a ? i / a : Math.exp(-(i - a) / d); return o; };
const tone = (freq, secs, type = 'sine', slideTo = null) => {
  const n = Math.floor(secs * SR), o = new Float32Array(n), e = env(n, 40, n * 0.35);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const f = slideTo ? freq + (slideTo - freq) * (i / n) : freq;
    ph += 2 * Math.PI * f / SR;
    const v = type === 'sine' ? Math.sin(ph) : type === 'square' ? Math.sign(Math.sin(ph)) * 0.4 : Math.sin(ph) + 0.3 * Math.sin(2 * ph);
    o[i] = v * e[i];
  }
  return o;
};
const noise = (secs, decay) => {
  const n = Math.floor(secs * SR), o = new Float32Array(n);
  let seed = 22222;
  for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; o[i] = (seed / 0x40000000 - 1) * Math.exp(-i / decay); }
  return o;
};
const scale = (buf, g) => buf.map((v) => v * g);
const both = (t, fn, g = 1) => { add(L, t, scale(fn, g)); add(R, t, scale(fn, g)); };

const A1 = 55, C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196, A3 = 220, C4 = 261.63, E4 = 329.63;
const bassLine = [A1, 0, A1, 0, C3, 0, A1, 0, A1, 0, A1, 0, D3, 0, E3, 0,
                  A1, 0, A1, 0, C3, 0, A1, 0, F3, 0, E3, 0, D3, 0, C3, 0];
for (let bar = 0; bar < BARS; bar++) {
  for (let b = 0; b < 4; b++) {
    const t = (bar * 4 + b) * BEAT;
    both(t, tone(150, 0.24, 'sine', 40), 0.9);                    // kick
    both(t + BEAT / 2, noise(0.05, 900), 0.16);                   // hat (offbeat)
    both(t + BEAT * 0.25, noise(0.03, 500), 0.07);                // tick
    if (b === 2) both(t, noise(0.12, 2600), 0.22);                // snare-ish
  }
  for (let s = 0; s < 16; s++) {
    const f = bassLine[s];
    if (f) both((bar * 4 + s / 4) * BEAT, tone(f, 0.21, 'triangle'), 0.5);
  }
  // sparse pluck melody every other bar
  if (bar % 2 === 0) {
    const notes = [A3, C4, E4, C4];
    notes.forEach((f, i) => both((bar * 4 + i) * BEAT + BEAT / 2, tone(f, 0.3, 'sine'), 0.12));
  }
}
// master fade out over the last second
for (let i = 0; i < SR; i++) { const g = 1 - i / SR; L[N - SR + i] *= g; R[N - SR + i] *= g; }

const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const cl = Math.max(-1, Math.min(1, L[i] * 0.8)), cr = Math.max(-1, Math.min(1, R[i] * 0.8));
  out.writeInt16LE(Math.round(cl * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(cr * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2], out);
console.log('music seconds:', DUR.toFixed(2));
