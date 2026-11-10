// Synthesizes the demo's music bed and sound effects into public/audio/.
// Everything is generated from code, so the audio is original, royalty-free
// and identical on every run. No dependencies: plain Node writing 16-bit WAV.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "audio");
const TAU = Math.PI * 2;

// ---------- primitives ----------

let seed = 0x7e3ba;
const rand = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};

const mtof = (midi) => 440 * 2 ** ((midi - 69) / 12);
const stereo = (seconds) => {
  const n = Math.ceil(seconds * SR);
  return [new Float32Array(n), new Float32Array(n)];
};
const mono = (seconds) => new Float32Array(Math.ceil(seconds * SR));

/** Adds a mono voice into a stereo buffer at `at` seconds, equal-power panned. */
function mix(dst, src, at, gain = 1, pan = 0) {
  const start = Math.round(at * SR);
  const l = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  const r = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  for (let i = 0; i < src.length; i++) {
    const j = start + i;
    if (j < 0 || j >= dst[0].length) continue;
    dst[0][j] += src[i] * l;
    dst[1][j] += src[i] * r;
  }
}

function mixStereo(dst, src, at = 0, gain = 1) {
  const start = Math.round(at * SR);
  for (let c = 0; c < 2; c++)
    for (let i = 0; i < src[c].length; i++) {
      const j = start + i;
      if (j >= 0 && j < dst[c].length) dst[c][j] += src[c][i] * gain;
    }
}

function lowpass(x, cutoff, poles = 1) {
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  for (let p = 0; p < poles; p++) {
    let y = 0;
    for (let i = 0; i < x.length; i++) x[i] = y += a * (x[i] - y);
  }
  return x;
}

function highpass(x, cutoff) {
  const low = lowpass(Float32Array.from(x), cutoff);
  for (let i = 0; i < x.length; i++) x[i] -= low[i];
  return x;
}

/** Chamberlin state-variable band-pass with a cutoff that moves over time. */
function sweep(x, cutoffAt, q = 0.7) {
  let low = 0;
  let band = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoffAt(i / SR), SR / 6)) / SR);
    low += f * band;
    const high = x[i] - low - q * band;
    band += f * high;
    x[i] = band;
  }
  return x;
}

const saturate = (x, drive = 1.5) => {
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / Math.tanh(drive);
  return x;
};

/** A small Freeverb: eight damped combs and four all-passes per side. */
function reverb([inL, inR], { room = 0.82, damp = 0.35, wet = 0.3, tail = 2.5 } = {}) {
  const n = inL.length + Math.ceil(tail * SR);
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const passes = [556, 441, 341, 225];
  const out = [new Float32Array(n), new Float32Array(n)];
  [inL, inR].forEach((input, side) => {
    const spread = side * 23;
    const acc = new Float32Array(n);
    for (const length of combs) {
      const size = Math.round((length + spread) * scale);
      const line = new Float32Array(size);
      let index = 0;
      let store = 0;
      for (let i = 0; i < n; i++) {
        const y = line[index];
        store = y * (1 - damp) + store * damp;
        line[index] = (i < input.length ? input[i] * 0.015 : 0) + store * room;
        acc[i] += y;
        index = (index + 1) % size;
      }
    }
    for (const length of passes) {
      const size = Math.round((length + spread) * scale);
      const line = new Float32Array(size);
      let index = 0;
      for (let i = 0; i < n; i++) {
        const delayed = line[index];
        const x = acc[i];
        line[index] = x + delayed * 0.5;
        acc[i] = delayed - x;
        index = (index + 1) % size;
      }
    }
    for (let i = 0; i < n; i++) out[side][i] = (i < input.length ? input[i] : 0) + acc[i] * wet;
  });
  return out;
}

function normalize(buffer, peakDb = -1) {
  const channels = Array.isArray(buffer) ? buffer : [buffer];
  let peak = 0;
  for (const ch of channels) for (const v of ch) peak = Math.max(peak, Math.abs(v));
  const gain = peak ? 10 ** (peakDb / 20) / peak : 1;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
  return buffer;
}

/** Fades the ends so no file starts or stops with a click. */
function edges(buffer, fadeIn = 0.002, fadeOut = 0.01) {
  const channels = Array.isArray(buffer) ? buffer : [buffer];
  for (const ch of channels) {
    const a = Math.round(fadeIn * SR);
    const b = Math.round(fadeOut * SR);
    for (let i = 0; i < a && i < ch.length; i++) ch[i] *= i / a;
    for (let i = 0; i < b && i < ch.length; i++) ch[ch.length - 1 - i] *= i / b;
  }
  return buffer;
}

function writeWav(name, buffer) {
  const [l, r] = Array.isArray(buffer) ? buffer : [buffer, buffer];
  const n = l.length;
  const data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(join(OUT, name), data);
}

// ---------- instruments ----------

function kick() {
  const x = mono(0.45);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    phase += (TAU * (48 + 110 * Math.exp(-t * 32))) / SR;
    x[i] = Math.sin(phase) * Math.exp(-t * 6.5) + rand() * Math.exp(-t * 500) * 0.25;
  }
  return edges(saturate(x, 2.2));
}

function hat(length = 0.06, decay = 80) {
  const x = mono(length);
  for (let i = 0; i < x.length; i++) x[i] = rand();
  highpass(highpass(x, 7000), 7000);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp((-i / SR) * decay);
  return edges(x, 0.0005, 0.005);
}

function clap() {
  const x = mono(0.3);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const bursts = [0, 0.009, 0.018].reduce((sum, at) => sum + (t >= at ? Math.exp(-(t - at) * (at === 0.018 ? 22 : 180)) : 0), 0);
    x[i] = rand() * bursts;
  }
  highpass(lowpass(x, 3200, 2), 900);
  return edges(x);
}

function bassNote(midi, length) {
  const x = mono(length);
  const f = mtof(midi);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * Math.min(1, (length - t) / 0.05) * (0.75 + 0.25 * Math.exp(-t * 9));
    x[i] = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) + 0.12 * Math.sin(TAU * 3 * f * t)) * env;
  }
  return edges(saturate(x, 1.8));
}

function padChord(notes, length, { attack = 0.35, release = 0.9, cutoff = 1500 } = {}) {
  const x = mono(length + release);
  for (const midi of notes) {
    for (const cents of [-8, 0, 7]) {
      const f = mtof(midi) * 2 ** (cents / 1200);
      let phase = rand() * 0.5 + 0.5;
      for (let i = 0; i < x.length; i++) {
        phase += f / SR;
        if (phase >= 1) phase -= 1;
        x[i] += (2 * phase - 1) * 0.2;
      }
    }
  }
  lowpass(x, cutoff, 2);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const env = t < attack ? t / attack : t < length ? 1 : Math.max(0, 1 - (t - length) / release);
    x[i] *= env * env;
  }
  return edges(x);
}

/** Karplus-Strong plucked string. */
function pluck(midi, length = 0.9, brightness = 0.5) {
  const x = mono(length);
  const period = Math.max(2, Math.round(SR / mtof(midi)));
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = rand();
  lowpass(line, 2000 + brightness * 6000);
  let index = 0;
  for (let i = 0; i < x.length; i++) {
    const next = (index + 1) % period;
    const y = line[index];
    line[index] = 0.996 * 0.5 * (y + line[next]);
    x[i] = y;
    index = next;
  }
  return edges(x, 0.001, 0.08);
}

function bell(midi, length = 1.6, decay = 3) {
  const x = mono(length);
  const f = mtof(midi);
  const partials = [
    [1, 1, 1],
    [2.0, 0.45, 1.6],
    [2.76, 0.3, 2.4],
    [5.4, 0.12, 4],
  ];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, amp, speed] of partials) v += Math.sin(TAU * f * ratio * t) * amp * Math.exp(-t * decay * speed);
    x[i] = v * Math.min(1, t / 0.002);
  }
  return edges(x);
}

/** Filtered noise whose band moves from `from` to `to` Hz. */
function whoosh(length, from, to, { peak = 0.45, q = 0.9 } = {}) {
  const x = mono(length);
  for (let i = 0; i < x.length; i++) x[i] = rand();
  sweep(x, (t) => from * (to / from) ** (t / length), q);
  for (let i = 0; i < x.length; i++) {
    const p = i / x.length;
    x[i] *= p < peak ? (p / peak) ** 2 : Math.exp(-((p - peak) / (1 - peak)) * 5);
  }
  return edges(x);
}

/** A whoosh that travels across the stereo field. */
function panned(x, fromPan, toPan) {
  const out = [new Float32Array(x.length), new Float32Array(x.length)];
  for (let i = 0; i < x.length; i++) {
    const pan = fromPan + (toPan - fromPan) * (i / x.length);
    out[0][i] = x[i] * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    out[1][i] = x[i] * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  }
  return out;
}

// ---------- sound effects ----------

const sfx = {};

sfx["whoosh"] = () => reverb(panned(whoosh(0.42, 350, 4200, { peak: 0.55 }), 0.6, -0.6), { wet: 0.12, tail: 0.5 });

sfx["swish"] = () => reverb(panned(whoosh(0.55, 500, 5000, { peak: 0.5, q: 1.2 }), -0.5, 0.5), { wet: 0.15, tail: 0.6 });

for (let v = 0; v < 3; v++) {
  sfx[`type-${v}`] = () => {
    const x = mono(0.05);
    const f = [2400, 2800, 2150][v];
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] = rand() * Math.exp(-t * 900) * 0.7 + Math.sin(TAU * f * t) * Math.exp(-t * 260) * 0.5 + Math.sin(TAU * 180 * t) * Math.exp(-t * 120) * 0.35;
    }
    return edges(highpass(x, 120), 0.0003, 0.005);
  };
}

const PENTATONIC = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91];

for (let k = 0; k < 6; k++) {
  sfx[`pop-${k}`] = () => {
    const x = mono(0.16);
    const top = mtof(PENTATONIC[k] + 12);
    let phase = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      phase += (TAU * (top * 0.45 + top * 0.55 * Math.exp(-t * 55))) / SR;
      x[i] = Math.sin(phase) * Math.exp(-t * 28) * Math.min(1, t / 0.001);
    }
    return edges(x);
  };
}

for (let k = 0; k < 10; k++) {
  sfx[`seat-${k}`] = () => {
    const x = mono(0.5);
    const f = mtof(PENTATONIC[k]);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      x[i] =
        Math.sin(TAU * f * t) * Math.exp(-t * 11) +
        0.35 * Math.sin(TAU * f * 3.99 * t) * Math.exp(-t * 34) +
        0.25 * Math.sin(TAU * 140 * t) * Math.exp(-t * 60) +
        rand() * Math.exp(-t * 700) * 0.3;
    }
    return reverb([x, Float32Array.from(x)], { wet: 0.12, tail: 0.6 });
  };
}

sfx["complete"] = () => {
  const out = stereo(2.2);
  mix(out, bell(88, 1.8, 2.2), 0, 0.6, -0.2);
  mix(out, bell(93, 1.8, 2.2), 0.07, 0.55, 0.2);
  mix(out, bell(100, 1.4, 2.8), 0.14, 0.25, 0);
  return reverb(out, { wet: 0.35, tail: 1.2 });
};

sfx["lock"] = () => {
  const x = mono(0.25);
  for (const [at, f, gain] of [
    [0, 1800, 0.8],
    [0.034, 1100, 1],
  ]) {
    for (let i = Math.round(at * SR); i < x.length; i++) {
      const t = i / SR - at;
      x[i] += gain * (rand() * Math.exp(-t * 800) * 0.6 + Math.sin(TAU * f * t) * Math.exp(-t * 180) * 0.5 + Math.sin(TAU * 95 * t) * Math.exp(-t * 40) * 0.6);
    }
  }
  return edges(x);
};

sfx["tick"] = () => {
  const x = mono(0.06);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.sin(TAU * 3100 * t) * Math.exp(-t * 220) * 0.6 + rand() * Math.exp(-t * 1200) * 0.3;
  }
  return edges(x, 0.0003, 0.005);
};

sfx["tick-low"] = () => {
  const x = mono(0.08);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.sin(TAU * 1500 * t) * Math.exp(-t * 160) * 0.6 + Math.sin(TAU * 210 * t) * Math.exp(-t * 70) * 0.4;
  }
  return edges(x, 0.0003, 0.005);
};

sfx["digit"] = () => {
  const x = mono(0.18);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.sin(TAU * 620 * t) * Math.exp(-t * 30) * 0.7 + Math.sin(TAU * 1240 * t) * Math.exp(-t * 60) * 0.3 + Math.sin(TAU * 120 * t) * Math.exp(-t * 45) * 0.5;
  }
  return edges(saturate(x, 1.4));
};

sfx["confirm"] = () => {
  const out = stereo(1.8);
  mix(out, sfx.lock(), 0, 0.7);
  mix(out, bell(84, 1.2, 3), 0.03, 0.45, -0.25);
  mix(out, bell(88, 1.2, 3), 0.09, 0.45, 0);
  mix(out, bell(91, 1.4, 2.6), 0.15, 0.45, 0.25);
  return reverb(out, { wet: 0.3, tail: 1 });
};

sfx["draw"] = () => {
  const x = mono(1.6);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const p = t / 1.5;
    phase += (TAU * mtof(76 + 12 * Math.min(1, p))) / SR;
    x[i] = (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * Math.min(1, t / 0.3) * Math.max(0, Math.min(1, (1.6 - t) / 0.25)) * 0.5;
  }
  return reverb([x, Float32Array.from(x)], { wet: 0.4, tail: 1 });
};

sfx["flip"] = () => {
  const out = stereo(1.6);
  mix(out, whoosh(0.3, 600, 3500, { peak: 0.7 }), 0, 0.9);
  mix(out, kick(), 0.24, 0.55);
  mix(out, bell(81, 1.2, 2.5), 0.24, 0.35, -0.2);
  mix(out, bell(88, 1.2, 2.5), 0.24, 0.3, 0.2);
  return reverb(out, { wet: 0.25, tail: 1 });
};

sfx["impact"] = () => {
  const x = mono(2.4);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    phase += (TAU * (42 + 90 * Math.exp(-t * 14))) / SR;
    x[i] = Math.sin(phase) * Math.exp(-t * 2.2) + rand() * Math.exp(-t * 30) * 0.18;
  }
  lowpass(x, 3000);
  saturate(x, 2);
  return reverb([x, Float32Array.from(x)], { wet: 0.35, room: 0.86, tail: 1.5 });
};

sfx["shimmer"] = () => {
  const out = stereo(2.6);
  [81, 88, 93, 96, 100].forEach((midi, k) => mix(out, bell(midi, 2.2, 1.4), k * 0.045, 0.32, (k - 2) * 0.3));
  return reverb(out, { wet: 0.5, room: 0.88, tail: 1.8 });
};

// ---------- music bed ----------

/**
 * 120 BPM, A minor, Am–F–C–G. One beat is 0.5 s (15 frames), so every scene
 * change in the video lands on a beat. The groove starts at 3 s with the
 * first app screen and stops at 26 s for the end card.
 */
function bed() {
  const LENGTH = 30;
  const BEAT = 0.5;
  const START = 3;
  const STOP = 26;
  const drums = stereo(LENGTH);
  const bass = stereo(LENGTH);
  const pads = stereo(LENGTH);
  const plucks = stereo(LENGTH);

  const chords = [
    { root: 45, pad: [57, 60, 64, 71] },
    { root: 41, pad: [53, 57, 60, 67] },
    { root: 48, pad: [55, 60, 64, 71] },
    { root: 43, pad: [55, 59, 62, 69] },
  ];

  // Intro: a low A minor swell under the logo, rising into the drop.
  mix(pads, padChord([45, 57, 64], 2.6, { attack: 1.2, release: 0.6, cutoff: 700 }), 0, 0.5);
  mix(pads, whoosh(1.6, 300, 6000, { peak: 0.97, q: 1.4 }), 1.4, 0.22, 0);

  const k = kick();
  const h = hat();
  const hSoft = hat(0.04, 120);
  const cl = clap();
  for (let bar = 0; START + bar * 2 < STOP; bar++) {
    const barAt = START + bar * 2;
    const chord = chords[bar % 4];
    const lastBar = barAt + 2 > STOP;
    mix(pads, padChord(chord.pad, lastBar ? 1 : 2, { attack: 0.08, release: 0.6, cutoff: barAt >= 22 ? 2400 : 1700 }), barAt, 0.42);
    for (let step = 0; step < 8; step++) {
      const t = barAt + step * (BEAT / 2);
      if (t >= STOP) break;
      const beat = step % 2 === 0;
      if (beat && t <= STOP - 1) mix(drums, k, t, 0.9);
      if (!beat && t >= 8) mix(drums, h, t, 0.18, 0.25);
      if (t >= 17 && t < STOP - 0.5) mix(drums, hSoft, t + BEAT / 4, 0.08, -0.2);
      if (t >= 13 && (step === 2 || step === 6) && t < STOP - 0.5) mix(drums, cl, t, 0.32, -0.1);
      const bassMidi = chord.root + (step === 3 || step === 7 ? 12 : 0);
      mix(bass, bassNote(bassMidi, BEAT / 2 - 0.02), t, 0.5);
      if (t >= 8) {
        const tones = [chord.pad[0] + 12, chord.pad[1] + 12, chord.pad[2] + 12, chord.pad[0] + 24];
        const pattern = [0, 2, 1, 3, 2, 1, 0, 2];
        mix(plucks, pluck(tones[pattern[step]], 0.8, t >= 22 ? 0.8 : 0.5), t, 0.3, step % 2 ? 0.35 : -0.35);
        if (t >= 22) mix(plucks, pluck(tones[pattern[step]] + 12, 0.5, 0.9), t + 0.004, 0.12, step % 2 ? -0.4 : 0.4);
      }
    }
  }
  // A short lift into the end card.
  mix(pads, whoosh(1.2, 400, 7000, { peak: 0.96, q: 1.3 }), STOP - 1.2, 0.2, 0);

  // End card: one ringing A minor chord.
  mix(pads, padChord([45, 57, 64, 69, 71, 76], 2.6, { attack: 0.02, release: 1.4, cutoff: 2600 }), STOP, 0.5);
  mix(bass, bassNote(45, 2.4), STOP, 0.55);
  mix(plucks, pluck(81, 3), STOP, 0.3, -0.3);
  mix(plucks, pluck(88, 3), STOP + 0.12, 0.25, 0.3);
  mix(plucks, pluck(93, 3), STOP + 0.24, 0.2, 0);

  // Sidechain feel: bass and pads duck under each kick.
  for (let i = 0; i < drums[0].length; i++) {
    const t = i / SR;
    if (t < START || t >= STOP - 1) continue;
    const since = (t - START) % BEAT;
    const duck = 1 - 0.5 * Math.exp(-since * 9);
    for (const layer of [bass, pads]) {
      layer[0][i] *= duck;
      layer[1][i] *= duck;
    }
  }

  const out = stereo(LENGTH);
  mixStereo(out, drums, 0, 1);
  mixStereo(out, bass, 0, 1);
  mixStereo(out, reverb(pads, { wet: 0.35, tail: 0 }), 0, 1);
  mixStereo(out, reverb(plucks, { wet: 0.3, tail: 0 }), 0, 1);

  // Gentle bus glue, then fade the last second.
  for (const ch of out) {
    for (let i = 0; i < ch.length; i++) {
      const t = i / SR;
      ch[i] = Math.tanh(ch[i] * 0.9);
      if (t > LENGTH - 1) ch[i] *= (LENGTH - t) ** 2;
    }
  }
  return normalize(out, -2);
}

mkdirSync(OUT, { recursive: true });
writeWav("bed.wav", bed());
for (const [name, make] of Object.entries(sfx)) writeWav(`${name}.wav`, normalize(make(), -1));
console.log(`Wrote bed.wav and ${Object.keys(sfx).length} sound effects to ${OUT}`);
