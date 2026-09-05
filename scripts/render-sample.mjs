/**
 * Renders the composition with the built-in sample data.
 *
 * Useful for checking the video itself without spending GitHub API quota:
 *   npm run render:sample
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { SAMPLE_DATA } from "../remotion/sample-data.js";
import { ensureSoundtrack } from "../lib/ensure-audio.js";

const t0 = Date.now();
mkdirSync(resolve("out"), { recursive: true });
ensureSoundtrack();

console.log("Bundling…");
const serveUrl = await bundle({
  entryPoint: resolve("remotion/index.jsx"),
  publicDir: resolve("public"),
  onProgress: () => {},
});
console.log(`  bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const composition = await selectComposition({ serveUrl, id: "ProfileVideo", inputProps: SAMPLE_DATA });
console.log(`Composition: ${composition.width}x${composition.height} · ${composition.durationInFrames} frames @ ${composition.fps}fps`);

let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  audioCodec: "aac",
  crf: 20,
  outputLocation: resolve("out/sample.mp4"),
  inputProps: SAMPLE_DATA,
  concurrency: null,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (pct >= last + 10) {
      last = pct;
      console.log(`  ${pct}%`);
    }
  },
});

console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s → out/sample.mp4`);
