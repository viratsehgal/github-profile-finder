/**
 * The soundtrack is a generated artifact (4MB of WAV), so it isn't committed.
 * Anything that renders video calls this first to make sure it exists.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const SOUNDTRACK = resolve("public/audio/soundtrack.wav");

export function ensureSoundtrack() {
  if (existsSync(SOUNDTRACK)) return SOUNDTRACK;
  console.log("No soundtrack found — synthesising it now…");
  execFileSync(process.execPath, [resolve("scripts/make-audio.mjs")], { stdio: "inherit" });
  return SOUNDTRACK;
}
