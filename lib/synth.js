/**
 * A tiny software synthesiser.
 *
 * Renders 16-bit PCM WAV audio using nothing but Math — no Web Audio API, no
 * native modules, no sample libraries. Everything you hear in the video is
 * computed sample by sample from oscillators and envelopes right here.
 */

export const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ notes */

const SEMITONES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** "A4" -> 440, "C#5" -> 554.37 */
export function note(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const [, letter, accidental, octave] = m;
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const semis = SEMITONES[letter] + offset + (Number(octave) - 4) * 12;
  return 440 * 2 ** (semis / 12);
}

/** Chord shorthand: chord("C4", "maj") -> ["C4","E4","G4"] as frequencies. */
const CHORD_SHAPES = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10],
  sus4: [0, 5, 7],
  maj9: [0, 4, 7, 14],
};

export function chordFreqs(root, shape = "maj") {
  const base = note(root);
  return CHORD_SHAPES[shape].map((s) => base * 2 ** (s / 12));
}

/* ------------------------------------------------------------- oscillators */

/** A deterministic PRNG, so every build produces a byte-identical soundtrack. */
function makeRandom(seed = 0x5eed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rand = makeRandom();

function wave(type, phase) {
  const p = phase - Math.floor(phase);
  switch (type) {
    case "sine":
      return Math.sin(TAU * p);
    case "square":
      return p < 0.5 ? 1 : -1;
    case "pulse":
      return p < 0.25 ? 1 : -1; // thinner, more "chiptune lead"
    case "thin":
      return p < 0.125 ? 1 : -1;
    case "saw":
      return 2 * p - 1;
    case "triangle":
      return 4 * Math.abs(p - 0.5) - 1;
    case "noise":
      return rand() * 2 - 1;
    default:
      throw new Error(`Unknown wave: ${type}`);
  }
}

/* ------------------------------------------------------------------ track */

export function createTrack(seconds) {
  const length = Math.ceil(seconds * SAMPLE_RATE);
  return {
    seconds,
    length,
    left: new Float32Array(length),
    right: new Float32Array(length),
  };
}

function mix(track, index, value, pan = 0) {
  if (index < 0 || index >= track.length) return;
  // Equal-power panning keeps perceived loudness steady across the stereo field.
  const angle = ((pan + 1) / 2) * (Math.PI / 2);
  track.left[index] += value * Math.cos(angle);
  track.right[index] += value * Math.sin(angle);
}

/* -------------------------------------------------------------- envelopes */

function envelope(t, dur, { attack, decay, sustain, release }) {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < dur) return sustain;
  const r = t - dur;
  return r < release ? sustain * (1 - r / release) : 0;
}

/* ------------------------------------------------------------------ voices */

/**
 * A single synthesised note.
 *
 * `sweep` glides the pitch to another frequency over the note's life, which is
 * what turns a sine into a kick drum and a noise burst into a whoosh.
 */
export function tone(track, opts) {
  const {
    at,
    dur,
    freq,
    type = "square",
    gain = 0.2,
    pan = 0,
    attack = 0.005,
    decay = 0.04,
    sustain = 0.75,
    release = 0.08,
    sweep = null,
    vibrato = null,
    detune = 0,
  } = opts;

  const start = Math.floor(at * SAMPLE_RATE);
  const total = Math.ceil((dur + release) * SAMPLE_RATE);
  let phase = 0;

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, dur, { attack, decay, sustain, release });
    if (env <= 0) continue;

    const progress = Math.min(1, t / Math.max(dur, 1e-6));
    let f = sweep === null ? freq : freq + (sweep - freq) * progress;
    if (vibrato) f *= 1 + Math.sin(TAU * vibrato.rate * t) * vibrato.depth;
    f *= 2 ** (detune / 1200);

    phase += f / SAMPLE_RATE;
    mix(track, start + i, wave(type, phase) * env * gain, pan);
  }
}

/** Layered percussion built from the same primitives. */
export function kick(track, at, gain = 0.9) {
  tone(track, { at, dur: 0.09, freq: 150, sweep: 45, type: "sine", gain, attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 });
  tone(track, { at, dur: 0.02, freq: 900, sweep: 200, type: "triangle", gain: gain * 0.25, attack: 0.001, decay: 0.01, sustain: 0, release: 0.02 });
}

export function hat(track, at, gain = 0.12, open = false) {
  tone(track, {
    at,
    dur: open ? 0.11 : 0.022,
    freq: 8000,
    type: "noise",
    gain,
    attack: 0.001,
    decay: open ? 0.09 : 0.018,
    sustain: 0.05,
    release: 0.03,
  });
}

export function snare(track, at, gain = 0.35) {
  tone(track, { at, dur: 0.07, freq: 6000, type: "noise", gain, attack: 0.001, decay: 0.06, sustain: 0.1, release: 0.06 });
  tone(track, { at, dur: 0.06, freq: 220, sweep: 170, type: "triangle", gain: gain * 0.5, attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.05 });
}

/* --------------------------------------------------------------- SFX ------ */

/** Rising noise sweep — used on scene changes. */
export function whoosh(track, at, { dur = 0.5, gain = 0.16, down = false } = {}) {
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const p = i / steps;
    const f = down ? 5200 - p * 4200 : 900 + p * 5200;
    tone(track, {
      at: at + p * dur,
      dur: dur / steps,
      freq: f,
      type: "noise",
      gain: gain * Math.sin(Math.PI * p),
      attack: 0.002,
      decay: 0.01,
      sustain: 0.6,
      release: 0.03,
      pan: (p - 0.5) * 1.2,
    });
  }
}

/** Cheerful blip for each card that pops onto screen. */
export function pop(track, at, freq = note("E6"), gain = 0.17) {
  tone(track, { at, dur: 0.05, freq: freq * 0.75, sweep: freq, type: "pulse", gain, attack: 0.002, decay: 0.03, sustain: 0.4, release: 0.06 });
}

/** Ascending sparkle, for reveals. */
export function sparkle(track, at, gain = 0.1) {
  ["C6", "E6", "G6", "C7"].forEach((n, i) => {
    tone(track, { at: at + i * 0.045, dur: 0.05, freq: note(n), type: "sine", gain, attack: 0.002, decay: 0.04, sustain: 0.3, release: 0.18, pan: (i - 1.5) * 0.3 });
  });
}

/** The big finish. */
export function fanfare(track, at, gain = 0.15) {
  const melody = [
    ["G4", 0, 0.12],
    ["C5", 0.12, 0.12],
    ["E5", 0.24, 0.12],
    ["G5", 0.36, 0.5],
  ];
  for (const [n, offset, dur] of melody) {
    tone(track, { at: at + offset, dur, freq: note(n), type: "pulse", gain, attack: 0.004, decay: 0.05, sustain: 0.8, release: 0.3 });
    tone(track, { at: at + offset, dur, freq: note(n) * 2, type: "sine", gain: gain * 0.4, attack: 0.004, decay: 0.05, sustain: 0.7, release: 0.3 });
  }
  chordFreqs("C4", "maj9").forEach((f, i) => {
    tone(track, { at: at + 0.36, dur: 0.8, freq: f, type: "triangle", gain: gain * 0.5, attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.6, pan: (i - 1.5) * 0.35 });
  });
  sparkle(track, at + 0.4, 0.08);
}

/* ------------------------------------------------------------- processing */

/** Simple stereo ping-pong delay — cheap depth without a reverb impulse. */
export function delay(track, { time = 0.24, feedback = 0.3, wet = 0.22 } = {}) {
  const d = Math.floor(time * SAMPLE_RATE);
  for (let i = d; i < track.length; i++) {
    track.left[i] += track.right[i - d] * feedback * wet;
    track.right[i] += track.left[i - d] * feedback * wet;
  }
}

/** One-pole low-pass, to take the harshness off the square waves. */
export function lowpass(track, cutoff = 9000) {
  const dt = 1 / SAMPLE_RATE;
  const rc = 1 / (TAU * cutoff);
  const alpha = dt / (rc + dt);
  let l = 0;
  let r = 0;
  for (let i = 0; i < track.length; i++) {
    l += alpha * (track.left[i] - l);
    r += alpha * (track.right[i] - r);
    track.left[i] = l;
    track.right[i] = r;
  }
}

/** Normalise to a target peak, then soft-clip so nothing ever crackles. */
export function master(track, peak = 0.89) {
  let max = 0;
  for (let i = 0; i < track.length; i++) {
    max = Math.max(max, Math.abs(track.left[i]), Math.abs(track.right[i]));
  }
  if (max === 0) return;
  const g = peak / max;
  for (let i = 0; i < track.length; i++) {
    track.left[i] = Math.tanh(track.left[i] * g);
    track.right[i] = Math.tanh(track.right[i] * g);
  }
}

/** Fade the very start and end so the file never clicks. */
export function fade(track, inSec = 0.05, outSec = 0.6) {
  const fi = Math.floor(inSec * SAMPLE_RATE);
  const fo = Math.floor(outSec * SAMPLE_RATE);
  for (let i = 0; i < fi; i++) {
    const g = i / fi;
    track.left[i] *= g;
    track.right[i] *= g;
  }
  for (let i = 0; i < fo; i++) {
    const g = i / fo;
    const idx = track.length - 1 - i;
    track.left[idx] *= g;
    track.right[idx] *= g;
  }
}

/* ------------------------------------------------------------------- WAV */

/** Encode the float track as a 16-bit stereo PCM WAV file. */
export function encodeWav(track) {
  const channels = 2;
  const bytesPerSample = 2;
  const dataSize = track.length * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // format: PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < track.length; i++) {
    for (const channel of [track.left, track.right]) {
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      buffer.writeInt16LE(Math.round(clamped * 32767), offset);
      offset += 2;
    }
  }
  return buffer;
}
