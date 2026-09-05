# GitHub Profile Finder 🎬

Search any GitHub user — then turn their profile into a fun, shareable
24-second video with an original soundtrack, rendered with
[Remotion](https://www.remotion.dev).

## Run

```bash
npm install
npm start
```

Then open http://localhost:8765

The first video render also downloads a headless Chromium (~170 MB) and
synthesises the soundtrack; both are cached afterwards.

### Optional: a GitHub token

Unauthenticated GitHub requests are capped at **60/hour per IP**, and building
one video costs about 12 of them. A token raises that to 5,000/hour:

```bash
GITHUB_TOKEN=ghp_your_token npm start
```

The token stays on the server. The browser talks to GitHub through an
allow-listed proxy (`/api/gh/...`), so it never sees the credential.

### Without Node

`serve.py` still serves the finder as a plain static site (no build, no
dependencies). The video feature detects that there's no backend and hides
itself; everything else works.

```bash
python3 serve.py 8765
```

## The video

24 seconds, 1080×1080, H.264 + AAC. Four scenes, cut to the music:

| Scene | | |
|---|---|---|
| **Welcome** | 0–4s | Avatar, name, and how long they've been on GitHub, with confetti |
| **Top repos** | 4–12s | Their five most-starred repos, ranked, with a quip each |
| **Top languages** | 12–20s | What they've actually been writing lately, as animated bars |
| **Outro** | 20–24s | Sign-off card with total stars |

Scene lengths are chosen so every boundary lands exactly on a musical bar
(2s at 120 BPM). `lib/timeline.js` is the single source of truth — the video and
the soundtrack both import it, so they can't drift apart.

### The soundtrack is synthesised, not sampled

`lib/synth.js` is a small software synthesiser written from scratch — oscillators,
ADSR envelopes, a ping-pong delay, a one-pole filter and a WAV encoder, all in
plain JavaScript with no Web Audio and no dependencies. `scripts/make-audio.mjs`
arranges it into a 12-bar chiptune whose key changes land on the scene cuts, with
a whoosh on every transition and a blip as each card pops in.

```bash
npm run audio     # regenerate public/audio/soundtrack.wav
```

### "Last couple of months" languages

GitHub has no endpoint for this, so it's derived: take the repos pushed to in
the last 90 days, ask each one for its byte-level language breakdown, and total
them up. If the window is too quiet it widens to 6 months, then a year, then all
time — and the video labels whichever window it actually used. When quota is
tight it falls back to each repo's primary language and says "(estimated)".

## Sharing

- **Download MP4** — always works; the file is a normal H.264 MP4.
- **Share…** — opens the native share sheet where the browser supports sharing
  files (Safari, iOS, Android). Hidden elsewhere.
- **Copy link** — copies the video URL. Note this points at your local server;
  putting videos on the public internet needs a storage backend (S3, R2,
  or [Remotion Lambda](https://www.remotion.dev/docs/lambda)), which isn't wired up here.

## Deploying

The finder page is a static site and deploys anywhere — including Vercel — with
no configuration. **Video rendering does not.**

`@remotion/renderer` drives a real headless Chromium to screenshot 720 frames
and mux them with ffmpeg. That means:

| Requirement | Vercel serverless |
|---|---|
| 193 MB headless Chromium, downloaded at runtime | 250 MB unzipped function limit |
| Writes frames and the MP4 to disk | Filesystem is read-only except `/tmp` |
| ~20s of CPU per render on a fast laptop | 60s cap, much slower CPU |
| Long-running process (`server.listen`) | Functions are per-request handlers |
| Renders persist to be downloaded | No storage between invocations |

So on Vercel you get the finder, and the video panel tells you the renderer
isn't there. To actually render, you need one of:

- **A host that runs a Node process** — Render, Railway, Fly.io, or any VM.
  `npm start` works as-is; point a persistent disk or object store at `out/`.
- **[Remotion Lambda](https://www.remotion.dev/docs/lambda)** — renders on AWS
  Lambda and writes to S3. This is the supported serverless path, and it also
  gives the videos real public URLs, which is what "Copy link" wants.
- **Static front end + separate render backend** — keep the Vercel URL and
  point the page at a renderer hosted elsewhere.

## Other commands

```bash
npm run studio         # Remotion Studio — live-edit the video with sample data
npm run render:sample  # render out/sample.mp4 without touching the GitHub API
npm run setup-browser  # pre-download the headless browser
```

## Finder features

- Search by username, `@name`, or a full `github.com/name` URL
- Profile card, stats, and top 12 non-forked repos with sorting
- Shareable `#username` URLs with working back/forward
- Click **Profile Finder** in the header to reset to home
- Light/dark theme, recent searches, animated gradient backdrop
- Distinct handling for not-found, rate-limit and network errors

## Layout

```
index.html, app.js, styles.css   the finder page
server.js                        static files + GitHub proxy + render jobs
lib/timeline.js                  scene timing shared by video and audio
lib/synth.js                     the software synthesiser
lib/github.js                    profile fetching + language aggregation
lib/languages.js                 colours and emoji, shared by page and video
remotion/                        the video: Root, ProfileVideo, scenes, components
scripts/make-audio.mjs           soundtrack arrangement
```

## A licensing note

Remotion is free for individuals and small teams, but **companies of 4+ people
need a paid licence**. See [remotion.dev/license](https://www.remotion.dev/license).
