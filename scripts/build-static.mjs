/**
 * Builds the static site into dist/ for a CDN host (Vercel, Netlify, Pages).
 *
 * The browser half of this app has no dependencies — it's four files. Nothing
 * here needs npm install, which is the point: the render toolchain is ~570MB
 * and none of it belongs in a static deploy.
 *
 * Set RENDERER_URL to point the deployed page at a render backend running
 * elsewhere; without it the page deploys as a finder-only site and says so.
 *
 *   node scripts/build-static.mjs
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");

// Exactly what the browser loads, and nothing else.
const FILES = ["index.html", "app.js", "styles.css", "lib/languages.js"];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const file of FILES) {
  const to = join(DIST, file);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(join(ROOT, file), to);
}

const rendererUrl = (process.env.RENDERER_URL ?? "").trim().replace(/\/+$/, "");
writeFileSync(join(DIST, "config.json"), JSON.stringify({ rendererUrl: rendererUrl || null }, null, 2));

console.log(`Built dist/ (${FILES.length} files)`);
console.log(rendererUrl ? `  renderer: ${rendererUrl}` : "  renderer: none — deploys as a finder-only site");
