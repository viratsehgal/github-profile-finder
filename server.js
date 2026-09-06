/**
 * The app server.
 *
 *   - serves the static finder page
 *   - proxies the GitHub API (so an optional GITHUB_TOKEN stays server-side)
 *   - renders the Remotion video and hands back an MP4
 *
 *   npm start          # http://localhost:8765
 *   GITHUB_TOKEN=ghp_… npm start
 */

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

import { ensureSoundtrack } from "./lib/ensure-audio.js";
import { compact } from "./lib/format.js";
import { GitHubError, getProfile } from "./lib/github.js";
import { FPS, TOTAL_FRAMES } from "./lib/timeline.js";

const PORT = Number(process.env.PORT ?? 8765);
const TOKEN = process.env.GITHUB_TOKEN || undefined;
/*
 * Origins allowed to call this renderer cross-origin, comma separated, e.g.
 * ALLOWED_ORIGINS=https://your-app.vercel.app
 *
 * Empty means same-origin only. Deliberately not "*": this server spends the
 * GitHub token's quota and CPU on renders, so it shouldn't be open to anyone.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const ROOT = resolve(".");
const OUT_DIR = join(ROOT, "out");

mkdirSync(OUT_DIR, { recursive: true });
ensureSoundtrack();

/* --------------------------------------------------------------- plumbing */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Returns the CORS headers for this request's Origin, or nothing if not allowed. */
function corsHeaders(req) {
  const origin = req.headers.origin?.replace(/\/+$/, "");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Without this the page can't read the quota headers cross-origin — only
    // the CORS-safelisted response headers are visible to JS by default.
    "Access-Control-Expose-Headers": "x-ratelimit-remaining, x-ratelimit-limit, x-ratelimit-reset",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Set per-request by the handler so json()/serveStatic() can echo them back. */
let cors = {};

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    ...cors,
  });
  res.end(payload);
};

const readBody = (req) =>
  new Promise((ok, fail) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1e6) {
        fail(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
    req.on("error", fail);
  });

/* ------------------------------------------------------------ render jobs */

/** jobId -> { status, progress, stage, url, error, username } */
const jobs = new Map();
/** Cache key -> jobId, so re-requesting the same profile is instant. */
const renderCache = new Map();

let bundlePromise = null;

/** Bundling the Remotion project takes ~15s, so do it once and reuse it. */
async function getServeUrl(onStage) {
  if (!bundlePromise) {
    onStage?.("bundling");
    const { bundle } = await import("@remotion/bundler");
    bundlePromise = bundle({
      entryPoint: resolve("remotion/index.jsx"),
      publicDir: resolve("public"),
      onProgress: () => {},
    });
  }
  return bundlePromise;
}

async function renderVideo(job, profile) {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  job.stage = "bundling";
  const serveUrl = await getServeUrl((s) => (job.stage = s));

  const inputProps = {
    user: profile.user,
    repos: profile.repos,
    languages: profile.languages,
    windowLabel: profile.windowLabel,
  };

  job.stage = "preparing";
  const composition = await selectComposition({ serveUrl, id: "ProfileVideo", inputProps });

  const fileName = `${profile.user.login}-${job.cacheKey.slice(0, 8)}.mp4`;
  const outputLocation = join(OUT_DIR, fileName);

  job.stage = "rendering";
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    audioCodec: "aac",
    crf: 20,
    outputLocation,
    inputProps,
    concurrency: null,
    onProgress: ({ progress }) => {
      job.progress = progress;
    },
  });

  job.progress = 1;
  job.stage = "done";
  job.status = "done";
  job.url = `/out/${fileName}`;
  job.fileName = fileName;
}

/* ------------------------------------------------------------------ routes */

/**
 * Passthrough to the GitHub API for the browser.
 *
 * Lets the finder page benefit from GITHUB_TOKEN without the token ever leaving
 * the server. Paths are allow-listed so this can't be used as an open proxy.
 */
const PROXY_ALLOW = [/^\/users\/[^/]+$/, /^\/users\/[^/]+\/repos$/, /^\/repos\/[^/]+\/[^/]+\/languages$/];

async function handleGhProxy(res, path, search) {
  if (!PROXY_ALLOW.some((re) => re.test(path))) {
    return json(res, 403, { error: "forbidden", message: "That GitHub path is not proxied." });
  }

  const upstream = await fetch(`https://api.github.com${path}${search}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-profile-finder",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });

  const body = await upstream.text();
  const forwarded = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", ...cors };
  for (const h of ["x-ratelimit-remaining", "x-ratelimit-limit", "x-ratelimit-reset"]) {
    const v = upstream.headers.get(h);
    if (v) forwarded[h] = v;
  }
  res.writeHead(upstream.status, forwarded);
  res.end(body);
}

async function handleProfile(res, username) {
  try {
    const profile = await getProfile(username, { token: TOKEN });
    json(res, 200, profile);
  } catch (err) {
    if (err instanceof GitHubError) {
      const status = err.kind === "not-found" ? 404 : err.kind === "rate-limited" ? 429 : 502;
      json(res, status, { error: err.kind, message: err.message, reset: err.reset });
    } else {
      json(res, 500, { error: "server", message: err.message });
    }
  }
}

async function handleCreateVideo(req, res) {
  let username;
  try {
    ({ username } = JSON.parse(await readBody(req)));
  } catch {
    return json(res, 400, { error: "bad-request", message: "Expected JSON with a username." });
  }
  if (typeof username !== "string" || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
    return json(res, 400, { error: "bad-request", message: "That is not a valid GitHub username." });
  }

  let profile;
  try {
    profile = await getProfile(username, { token: TOKEN });
  } catch (err) {
    if (err instanceof GitHubError) {
      const status = err.kind === "not-found" ? 404 : err.kind === "rate-limited" ? 429 : 502;
      return json(res, status, { error: err.kind, message: err.message, reset: err.reset });
    }
    return json(res, 500, { error: "server", message: err.message });
  }

  // Key the cache on what the video actually *shows*, not the raw numbers.
  // Follower and star counts tick constantly on busy accounts, and re-rendering
  // 720 frames because someone gained one follower would be silly — the video
  // displays "92k" either way.
  const cacheKey = createHash("sha1")
    .update(
      JSON.stringify({
        login: profile.user.login,
        name: profile.user.name,
        avatar: profile.user.avatar,
        createdAt: profile.user.createdAt,
        followers: compact(profile.user.followers),
        repos: compact(profile.user.publicRepos),
        stars: compact(profile.user.totalStars),
        top: profile.repos.map((r) => [r.name, compact(r.stars), r.language]),
        langs: profile.languages.map((l) => [l.name, l.percent]),
        window: profile.windowLabel,
      })
    )
    .digest("hex");

  const cachedId = renderCache.get(cacheKey);
  const cached = cachedId && jobs.get(cachedId);
  if (cached && cached.status === "done" && existsSync(join(OUT_DIR, cached.fileName))) {
    return json(res, 200, { jobId: cachedId, cached: true });
  }

  const jobId = randomUUID();
  const job = {
    id: jobId,
    cacheKey,
    username: profile.user.login,
    status: "running",
    stage: "queued",
    progress: 0,
  };
  jobs.set(jobId, job);
  renderCache.set(cacheKey, jobId);

  renderVideo(job, profile).catch((err) => {
    job.status = "error";
    job.stage = "error";
    job.error = err.message ?? String(err);
    console.error(`[render] ${profile.user.login} failed:`, err);
  });

  json(res, 202, { jobId, cached: false });
}

function handleJobStatus(res, jobId) {
  const job = jobs.get(jobId);
  if (!job) return json(res, 404, { error: "not-found", message: "Unknown job." });
  json(res, 200, {
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    url: job.url,
    error: job.error,
    username: job.username,
    durationSeconds: TOTAL_FRAMES / FPS,
  });
}

function serveStatic(req, res, pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error: "forbidden" });
  if (pathname === "/" ) filePath = join(ROOT, "index.html");

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    return json(res, 404, { error: "not-found", message: `No such file: ${pathname}` });
  }

  const ext = extname(filePath).toLowerCase();
  const isVideo = ext === ".mp4";
  const { size } = statSync(filePath);

  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Content-Length": size,
    // Videos are content-addressed by hash, so they're safe to cache hard.
    "Cache-Control": isVideo ? "public, max-age=31536000, immutable" : "no-store",
    ...(isVideo ? { "Accept-Ranges": "bytes" } : {}),
    ...cors,
  });
  createReadStream(filePath).pipe(res);
}

/* ------------------------------------------------------------------ server */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    res.writeHead(Object.keys(cors).length ? 204 : 403, cors);
    return res.end();
  }

  try {
    if (pathname.startsWith("/api/gh/") && req.method === "GET") {
      return await handleGhProxy(res, pathname.slice("/api/gh".length), url.search);
    }
    if (pathname.startsWith("/api/profile/") && req.method === "GET") {
      return await handleProfile(res, pathname.slice("/api/profile/".length));
    }
    if (pathname === "/api/video" && req.method === "POST") {
      return await handleCreateVideo(req, res);
    }
    if (pathname.startsWith("/api/video/") && req.method === "GET") {
      return handleJobStatus(res, pathname.slice("/api/video/".length));
    }
    if (pathname === "/api/config" && req.method === "GET") {
      return json(res, 200, { hasToken: Boolean(TOKEN), durationSeconds: TOTAL_FRAMES / FPS });
    }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error("[server]", err);
    json(res, 500, { error: "server", message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`GitHub Profile Finder → http://localhost:${PORT}`);
  console.log(TOKEN ? "  GitHub token: set (5,000 req/hr)" : "  GitHub token: not set (60 req/hr)");
  console.log(
    ALLOWED_ORIGINS.length
      ? `  Cross-origin callers: ${ALLOWED_ORIGINS.join(", ")}`
      : "  Cross-origin callers: none (same-origin only)"
  );
});
