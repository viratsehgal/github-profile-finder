/**
 * The single source of truth for video timing.
 *
 * Both the Remotion compositions and the soundtrack generator import this, so
 * the music and the visuals can never drift out of sync.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1080;

/** Scene boundaries, in frames. */
/*
 * Durations are chosen so every scene boundary lands exactly on a musical bar
 * at 120 BPM (one 4/4 bar = 2s = 60 frames). That is what lets the soundtrack
 * change key on a scene change instead of halfway through one.
 */
export const SCENES = {
  welcome: { from: 0, duration: 120 },   // 2 bars
  repos: { from: 120, duration: 240 },   // 4 bars
  languages: { from: 360, duration: 240 }, // 4 bars
  outro: { from: 600, duration: 120 },   // 2 bars
};

export const TOTAL_FRAMES = 720;
export const DURATION_SECONDS = TOTAL_FRAMES / FPS;

export const toSeconds = (frames) => frames / FPS;

/** How many items each list scene shows, and how far apart they pop in. */
export const MAX_REPOS = 5;
export const MAX_LANGUAGES = 5;
export const ITEM_STAGGER = 30; // frames between successive card entrances (1s)
/** Frames after a scene starts before its first card lands. The soundtrack's
 *  blips are placed from this same constant, so sound and picture stay locked. */
export const ITEM_DELAY = 26;
