/**
 * Composes the video soundtrack and writes public/audio/soundtrack.wav.
 *
 * Every sound is synthesised from scratch by lib/synth.js — this file is just
 * the arrangement: a 12-bar chiptune at 120 BPM whose sections line up exactly
 * with the scene boundaries in lib/timeline.js.
 *
 *   npm run audio
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DURATION_SECONDS, FPS, SCENES, ITEM_DELAY, ITEM_STAGGER, MAX_REPOS, MAX_LANGUAGES, toSeconds } from "../lib/timeline.js";
import {
  chordFreqs,
  createTrack,
  delay,
  encodeWav,
  fade,
  fanfare,
  hat,
  kick,
  lowpass,
  master,
  note,
  pop,
  snare,
  sparkle,
  tone,
  whoosh,
} from "../lib/synth.js";

const BPM = 120;
const BEAT = 60 / BPM; // 0.5s
const BAR = BEAT * 4; // 2s

/** One entry per bar: the chord the bar sits on. */
const PROGRESSION = [
  // welcome (2 bars) — bright and open
  { root: "C3", shape: "maj9", drums: "light" },
  { root: "C3", shape: "maj9", drums: "light" },
  // repos (4 bars) — the main groove, I–V–vi–IV
  { root: "C3", shape: "maj", drums: "full" },
  { root: "G2", shape: "maj", drums: "full" },
  { root: "A2", shape: "min", drums: "full" },
  { root: "F2", shape: "maj", drums: "full" },
  // languages (4 bars) — same shape, lifted a whole step for energy
  { root: "D3", shape: "maj", drums: "busy" },
  { root: "A2", shape: "maj", drums: "busy" },
  { root: "B2", shape: "min", drums: "busy" },
  { root: "G2", shape: "maj", drums: "busy" },
  // outro (2 bars) — tension, then home
  { root: "G2", shape: "dom7", drums: "fill" },
  { root: "C3", shape: "maj9", drums: "none" },
];

const track = createTrack(DURATION_SECONDS);

/* ------------------------------------------------------------ arrangement */

PROGRESSION.forEach((bar, index) => {
  const at = index * BAR;
  const freqs = chordFreqs(bar.root, bar.shape);
  const root = freqs[0];

  // --- bass: root on 1 and 3, a fifth on the "and" of 4 for momentum
  tone(track, { at, dur: BEAT * 0.9, freq: root / 2, type: "triangle", gain: 0.4, attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.1 });
  tone(track, { at: at + BEAT * 2, dur: BEAT * 0.9, freq: root / 2, type: "triangle", gain: 0.36, attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.1 });
  if (bar.drums !== "none") {
    tone(track, { at: at + BEAT * 3.5, dur: BEAT * 0.4, freq: freqs[2] / 2, type: "triangle", gain: 0.28, attack: 0.005, decay: 0.08, sustain: 0.6, release: 0.08 });
  }

  // --- pad: the chord itself, held under everything and spread across stereo
  freqs.forEach((f, i) => {
    tone(track, {
      at,
      dur: BAR * 0.92,
      freq: f,
      type: "triangle",
      gain: 0.075,
      pan: (i / (freqs.length - 1) - 0.5) * 1.1,
      attack: 0.08,
      decay: 0.3,
      sustain: 0.65,
      release: 0.35,
      detune: i % 2 ? 6 : -6, // slight spread keeps the pad from sounding sterile
    });
  });

  // --- lead arpeggio in eighth notes, bouncing up and back down the chord
  const steps = 8;
  for (let s = 0; s < steps; s++) {
    const isBusy = bar.drums === "busy";
    const shape = [0, 1, 2, 3, 2, 1, 2, 3];
    const idx = shape[s] % freqs.length;
    const octave = isBusy && s % 4 === 3 ? 2 : 1;
    tone(track, {
      at: at + s * BEAT * 0.5,
      dur: BEAT * 0.42,
      freq: freqs[idx] * 2 * octave,
      type: s % 2 === 0 ? "pulse" : "thin",
      gain: bar.drums === "light" ? 0.1 : 0.14,
      pan: (s % 2 === 0 ? -1 : 1) * 0.28,
      attack: 0.004,
      decay: 0.06,
      sustain: 0.5,
      release: 0.12,
    });
  }

  // --- drums
  if (bar.drums === "light") {
    kick(track, at, 0.7);
    hat(track, at + BEAT * 2, 0.07, true);
  } else if (bar.drums === "full" || bar.drums === "busy") {
    kick(track, at, 0.85);
    kick(track, at + BEAT * 2, 0.7);
    snare(track, at + BEAT, 0.3);
    snare(track, at + BEAT * 3, 0.3);
    const hats = bar.drums === "busy" ? 8 : 4;
    for (let h = 0; h < hats; h++) {
      hat(track, at + (h * BAR) / hats, h % 2 ? 0.06 : 0.1, h === hats - 1);
    }
  } else if (bar.drums === "fill") {
    kick(track, at, 0.85);
    snare(track, at + BEAT, 0.3);
    // tumbling fill into the finale
    for (let f = 0; f < 6; f++) {
      snare(track, at + BEAT * 2 + f * (BEAT / 3), 0.16 + f * 0.035);
    }
  }
});

/* -------------------------------------------------------------------- SFX */

// A whoosh on every scene change, plus the reveal sparkle on the opening card.
sparkle(track, 0.55, 0.11);
for (const key of ["repos", "languages", "outro"]) {
  whoosh(track, toSeconds(SCENES[key].from) - 0.35, { dur: 0.5, gain: 0.15 });
}

// A blip per card, matching the on-screen stagger exactly.
const BLIP_SCALE = ["E6", "G6", "A6", "C7", "D7"].map(note);
for (const [key, count] of [["repos", MAX_REPOS], ["languages", MAX_LANGUAGES]]) {
  const start = toSeconds(SCENES[key].from);
  for (let i = 0; i < count; i++) {
    pop(track, start + toSeconds(ITEM_DELAY + 2) + i * toSeconds(ITEM_STAGGER), BLIP_SCALE[i], 0.15);
  }
}

// The finish, landing on the final bar.
fanfare(track, toSeconds(SCENES.outro.from) + 1.0, 0.16);

/* --------------------------------------------------------------- mixdown */

delay(track, { time: BEAT * 0.75, feedback: 0.28, wet: 0.2 });
lowpass(track, 11000);
master(track, 0.86);
fade(track, 0.04, 0.9);

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "..", "public", "audio", "soundtrack.wav");
mkdirSync(dirname(outPath), { recursive: true });
const wav = encodeWav(track);
writeFileSync(outPath, wav);

console.log(
  `Wrote ${outPath}\n  ${DURATION_SECONDS}s · ${FPS}fps timeline · ${BPM} BPM · ${PROGRESSION.length} bars · ${(wav.length / 1e6).toFixed(1)} MB`
);
