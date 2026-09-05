/* GitHub Profile Finder — the browser half. */

import { languageColor } from "./lib/languages.js";

/*
 * Where GitHub requests go.
 *
 * Served by server.js we proxy through it, so an optional GITHUB_TOKEN can lift
 * the rate limit without ever reaching the browser. Served as plain static
 * files (serve.py, or any static host) we talk to GitHub directly and the
 * video feature simply isn't offered.
 */
let API = "https://api.github.com";
let backend = null;
const RECENT_KEY = "gpf:recent";
const THEME_KEY = "gpf:theme";
const SORT_KEY = "gpf:sort";
const SUGGESTIONS = ["torvalds", "gaearon", "sindresorhus", "yyx990803", "octocat"];

const $ = (id) => document.getElementById(id);
const el = {
  form: $("search-form"),
  input: $("username"),
  clearBtn: $("clear-btn"),
  searchBtn: $("search-btn"),
  results: $("results"),
  idle: $("state-idle"),
  loading: $("state-loading"),
  error: $("state-error"),
  errorTitle: $("error-title"),
  errorDetail: $("error-detail"),
  profile: $("profile"),
  reposBlock: $("repos-block"),
  repos: $("repos"),
  reposNote: $("repos-note"),
  repoSort: $("repo-sort"),
  suggestList: $("suggest-list"),
  recentRow: $("recent-row"),
  recentList: $("recent-list"),
  clearRecent: $("clear-recent"),
  homeLink: $("home-link"),
  themeToggle: $("theme-toggle"),
  rate: $("rate"),
  videoBlock: $("video-block"),
  makeVideo: $("make-video"),
  videoProgress: $("video-progress"),
  videoBar: $("video-bar"),
  videoStage: $("video-stage"),
  videoResult: $("video-result"),
  videoPlayer: $("video-player"),
  videoDownload: $("video-download"),
  videoShare: $("video-share"),
  videoCopy: $("video-copy"),
  videoHint: $("video-hint"),
};

let currentRepos = [];
let inFlight = null;

/* ---------- helpers ---------- */

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const num = (n) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);

const fullDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function relative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  const units = [
    ["minute", 60], ["hour", 24], ["day", 30], ["month", 12], ["year", Infinity],
  ];
  let value = mins, i = 0;
  while (i < units.length - 1 && Math.abs(value) >= units[i][1]) {
    value = Math.round(value / units[i][1]);
    i++;
  }
  if (i === 0 && Math.abs(value) < 1) return "just now";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
    .format(-value, units[i][0]);
}

function icon(path) {
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"/></svg>`;
}
const ICONS = {
  pin: "M11.536 3.464a5 5 0 0 1 0 7.072L8 14.07l-3.536-3.535a5 5 0 1 1 7.072-7.072ZM8 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  building: "M1.75 16A1.75 1.75 0 0 1 0 14.25V1.75C0 .784.784 0 1.75 0h8.5C11.216 0 12 .784 12 1.75v12.5c0 .085-.006.168-.018.25h2.268a.25.25 0 0 0 .25-.25V8.285a.25.25 0 0 0-.111-.208l-1.055-.703a.75.75 0 1 1 .832-1.248l1.055.703c.487.325.779.871.779 1.456v5.965A1.75 1.75 0 0 1 14.25 16h-3.5a.75.75 0 0 1-.197-.026c-.099.017-.2.026-.303.026h-3a.75.75 0 0 1-.75-.75V14h-1v1.25a.75.75 0 0 1-.75.75Zm-.25-1.75c0 .138.112.25.25.25H4v-1.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v1.25h2.25a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25ZM3.75 6h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5ZM3 3.75A.75.75 0 0 1 3.75 3h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 3.75Zm4 0A.75.75 0 0 1 7.75 3h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 3.75ZM7.75 6h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7.75 6ZM3 9.75A.75.75 0 0 1 3.75 9h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 3 9.75ZM7.75 9h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1 0-1.5Z",
  link: "M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0Z",
  mail: "M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25v-8.5C0 2.784.784 2 1.75 2ZM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V5.809L8.38 9.397a.75.75 0 0 1-.76 0L1.5 5.809Zm13-8.181v-.32a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25v.32L8 7.88Z",
  x: "M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z",
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  fork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
};

/* ---------- view state ---------- */

function show(name) {
  el.idle.hidden = name !== "idle";
  el.loading.hidden = name !== "loading";
  el.error.hidden = name !== "error";
  el.profile.hidden = name !== "profile";
  el.reposBlock.hidden = name !== "profile";
  // The video panel only exists when the Node backend is there to render one.
  el.videoBlock.hidden = name !== "profile" || !backend;
  el.results.setAttribute("aria-busy", String(name === "loading"));
  el.searchBtn.disabled = name === "loading";
  el.searchBtn.textContent = name === "loading" ? "Searching…" : "Search";
}

function showError(title, detail) {
  el.errorTitle.textContent = title;
  el.errorDetail.textContent = detail || "";
  show("error");
}

function updateRate(headers) {
  const remaining = headers.get("x-ratelimit-remaining");
  const limit = headers.get("x-ratelimit-limit");
  if (remaining === null) return;
  el.rate.textContent = `API requests left: ${remaining}/${limit}`;
}

/* ---------- data ---------- */

async function getJSON(url, signal) {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  updateRate(res.headers);

  if (res.ok) return res.json();

  if (res.status === 404) {
    const err = new Error("not-found");
    err.kind = "not-found";
    throw err;
  }
  if (res.status === 403 || res.status === 429) {
    const err = new Error("rate-limited");
    err.kind = "rate-limited";
    const reset = res.headers.get("x-ratelimit-reset");
    if (reset) err.reset = new Date(Number(reset) * 1000);
    throw err;
  }
  const err = new Error(`http-${res.status}`);
  err.kind = "http";
  err.status = res.status;
  throw err;
}

async function search(rawName, { pushHash = true } = {}) {
  const name = rawName.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
  if (!name) return;

  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(name)) {
    el.input.value = name;
    showError("That is not a valid GitHub username", "Usernames use letters, numbers and single hyphens, up to 39 characters.");
    return;
  }

  el.input.value = name;
  el.clearBtn.hidden = false;
  if (pushHash && decodeURIComponent(location.hash.slice(1)) !== name) {
    history.pushState(null, "", "#" + encodeURIComponent(name));
  }

  if (inFlight) inFlight.abort();
  resetVideo();
  const ctrl = new AbortController();
  inFlight = ctrl;

  show("loading");
  try {
    const user = await getJSON(`${API}/users/${encodeURIComponent(name)}`, ctrl.signal);
    // Repos are secondary: a failure here should not blank out a profile we already have.
    let repos = [];
    let reposFailed = false;
    try {
      repos = await getJSON(
        `${API}/users/${encodeURIComponent(user.login)}/repos?per_page=100&sort=updated`,
        ctrl.signal
      );
    } catch (e) {
      if (e.name === "AbortError") throw e;
      reposFailed = true;
    }

    renderProfile(user);
    currentRepos = Array.isArray(repos) ? repos.filter((r) => !r.fork) : [];
    renderRepos(reposFailed, Array.isArray(repos) ? repos.length : 0);
    show("profile");
    rememberRecent(user.login);
    document.title = `${user.login} · GitHub Profile Finder`;
  } catch (e) {
    if (e.name === "AbortError") return;
    if (e.kind === "not-found") {
      showError(`No GitHub user named “${name}”`, "Check the spelling, or try one of the suggestions above.");
    } else if (e.kind === "rate-limited") {
      const when = e.reset ? e.reset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
      showError(
        "GitHub rate limit reached",
        when
          ? `Unauthenticated requests are capped at 60 per hour per IP. Try again after ${when}.`
          : "Unauthenticated requests are capped at 60 per hour per IP. Try again shortly."
      );
    } else if (e.kind === "http") {
      showError(`GitHub returned an error (${e.status})`, "The API may be having trouble. Try again in a moment.");
    } else {
      showError("Could not reach GitHub", "Check your network connection and try again.");
    }
  } finally {
    if (inFlight === ctrl) inFlight = null;
  }
}

/* ---------- render ---------- */

function renderProfile(u) {
  const meta = [];
  if (u.location) meta.push(`<li>${icon(ICONS.pin)}<span>${esc(u.location)}</span></li>`);
  if (u.company) meta.push(`<li>${icon(ICONS.building)}<span>${esc(u.company)}</span></li>`);
  if (u.blog) {
    const href = /^https?:\/\//i.test(u.blog) ? u.blog : "https://" + u.blog;
    meta.push(`<li>${icon(ICONS.link)}<a href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow">${esc(u.blog)}</a></li>`);
  }
  if (u.email) meta.push(`<li>${icon(ICONS.mail)}<a href="mailto:${esc(u.email)}">${esc(u.email)}</a></li>`);
  if (u.twitter_username) {
    meta.push(`<li>${icon(ICONS.x)}<a href="https://x.com/${encodeURIComponent(u.twitter_username)}" target="_blank" rel="noopener noreferrer">@${esc(u.twitter_username)}</a></li>`);
  }

  const stats = [
    ["Followers", u.followers],
    ["Following", u.following],
    ["Repos", u.public_repos],
    ["Gists", u.public_gists],
  ]
    .map(([label, v]) => `<div class="stat"><b>${num(v)}</b><span>${label}</span></div>`)
    .join("");

  el.profile.innerHTML = `
    <div class="avatar-col">
      <img class="avatar" src="${esc(u.avatar_url)}&s=264" alt="" width="132" height="132" loading="lazy" />
      <a class="ghost-btn" href="${esc(u.html_url)}" target="_blank" rel="noopener noreferrer">View on GitHub</a>
    </div>
    <div class="info-col">
      <div class="name-row">
        <span class="name">${esc(u.name || u.login)}</span>
        <a class="login" href="${esc(u.html_url)}" target="_blank" rel="noopener noreferrer">@${esc(u.login)}</a>
        ${u.type !== "User" ? `<span class="badge">${esc(u.type)}</span>` : ""}
      </div>
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ""}
      <p class="joined">Joined ${fullDate(u.created_at)} · profile updated ${relative(u.updated_at)}</p>
      <div class="stats">${stats}</div>
      ${meta.length ? `<ul class="meta">${meta.join("")}</ul>` : ""}
    </div>`;
}

function sortRepos(repos, mode) {
  const copy = repos.slice();
  if (mode === "updated") copy.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  else if (mode === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
  else copy.sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at));
  return copy;
}

function renderRepos(failed, totalFetched) {
  if (failed) {
    el.repos.innerHTML = "";
    el.reposNote.textContent = "Repositories could not be loaded (the API request failed or was rate limited).";
    return;
  }
  if (!currentRepos.length) {
    el.repos.innerHTML = "";
    el.reposNote.textContent = totalFetched
      ? "This user has only forked repositories."
      : "This user has no public repositories.";
    return;
  }

  const sorted = sortRepos(currentRepos, el.repoSort.value).slice(0, 12);
  el.repos.innerHTML = sorted
    .map((r) => {
      const color = languageColor(r.language);
      return `
      <div class="repo">
        <a class="repo-name" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a>
        ${r.description ? `<p class="repo-desc">${esc(r.description)}</p>` : ""}
        <div class="repo-foot">
          ${r.language ? `<span><i class="dot" style="background:${esc(color)}"></i>${esc(r.language)}</span>` : ""}
          <span class="stars">${icon(ICONS.star)}${num(r.stargazers_count)}</span>
          <span>${icon(ICONS.fork)}${num(r.forks_count)}</span>
          <span>Updated ${relative(r.pushed_at)}</span>
        </div>
      </div>`;
    })
    .join("");

  const shown = Math.min(12, currentRepos.length);
  el.reposNote.textContent =
    `Showing ${shown} of ${currentRepos.length} non-forked public repos` +
    (totalFetched === 100 ? " (first 100 fetched from the API)." : ".");
}

/* ---------- recent searches ---------- */

function readRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function rememberRecent(login) {
  const list = [login, ...readRecent().filter((x) => x.toLowerCase() !== login.toLowerCase())].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
  renderRecent();
}

function chips(container, names) {
  container.innerHTML = "";
  names.forEach((n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = n;
    b.addEventListener("click", () => search(n));
    container.appendChild(b);
  });
}

function renderRecent() {
  const list = readRecent();
  el.recentRow.hidden = list.length === 0;
  chips(el.recentList, list);
}

/* ---------- theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

/* ---------- video studio ---------- */

const STAGE_TEXT = {
  queued: "Warming up the projector\u2026",
  bundling: "Packing the studio\u2026 the first render takes a little longer",
  preparing: "Setting the stage\u2026",
  rendering: "\ud83c\udfac Rolling camera",
  done: "Done!",
};

let videoPoll = null;
let currentVideo = null;

/** Ask the server whether it can render (and route GitHub calls through it). */
async function detectBackend() {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (!res.ok) return null;
    const cfg = await res.json();
    API = "/api/gh";
    return cfg;
  } catch {
    return null; // static hosting: finder works, video doesn't
  }
}

function resetVideo() {
  clearInterval(videoPoll);
  videoPoll = null;
  currentVideo = null;
  el.videoProgress.hidden = true;
  el.videoResult.hidden = true;
  el.videoHint.textContent = "";
  el.videoBar.style.width = "0%";
  el.makeVideo.disabled = false;
  el.makeVideo.textContent = "\ud83c\udfac Make my video";
  el.videoPlayer.removeAttribute("src");
  el.videoPlayer.load();
}

function setStage(stage, progress = 0) {
  const pct = Math.round((progress || 0) * 100);
  el.videoBar.style.width = `${stage === "rendering" ? Math.max(pct, 2) : 4}%`;
  el.videoStage.textContent =
    stage === "rendering" ? `${STAGE_TEXT.rendering} ${pct}%` : STAGE_TEXT[stage] ?? "Working\u2026";
}

function failVideo(message) {
  clearInterval(videoPoll);
  videoPoll = null;
  el.videoProgress.hidden = true;
  el.makeVideo.disabled = false;
  el.videoHint.textContent = `Could not make the video: ${message}`;
}

function showVideo(url, username) {
  currentVideo = { url, username };
  el.videoProgress.hidden = true;
  el.videoResult.hidden = false;
  el.makeVideo.disabled = false;
  el.makeVideo.textContent = "\ud83c\udfac Make it again";
  el.videoPlayer.src = url;
  el.videoDownload.href = url;
  el.videoDownload.download = `${username}-github.mp4`;
  // File sharing only exists on some platforms; hide the button where it doesn't.
  el.videoShare.hidden = typeof navigator.canShare !== "function";
  el.videoHint.textContent = "";
}

async function makeVideo(username) {
  resetVideo();
  el.makeVideo.disabled = true;
  el.videoProgress.hidden = false;
  setStage("queued", 0);

  let jobId;
  try {
    const res = await fetch("/api/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "the server refused the job");
    jobId = data.jobId;
  } catch (err) {
    failVideo(err.message ?? "could not reach the render server");
    return;
  }

  videoPoll = setInterval(async () => {
    try {
      const res = await fetch(`/api/video/${jobId}`, { cache: "no-store" });
      const job = await res.json();
      if (job.status === "error") return failVideo(job.error ?? "the render failed");
      setStage(job.stage, job.progress);
      if (job.status === "done") {
        clearInterval(videoPoll);
        videoPoll = null;
        showVideo(job.url, job.username);
      }
    } catch {
      failVideo("lost contact with the render server");
    }
  }, 700);
}

async function shareVideo() {
  if (!currentVideo) return;
  try {
    const blob = await (await fetch(currentVideo.url)).blob();
    const file = new File([blob], `${currentVideo.username}-github.mp4`, { type: "video/mp4" });
    if (!navigator.canShare?.({ files: [file] })) {
      el.videoHint.textContent = "This browser can't share files directly \u2014 use Download instead.";
      return;
    }
    await navigator.share({
      files: [file],
      title: `@${currentVideo.username} on GitHub`,
      text: "My GitHub profile as a 24-second video \ud83c\udfac",
    });
  } catch (err) {
    if (err?.name !== "AbortError") {
      el.videoHint.textContent = "Sharing was cancelled or unavailable \u2014 Download always works.";
    }
  }
}

async function copyVideoLink() {
  if (!currentVideo) return;
  const absolute = new URL(currentVideo.url, location.href).href;
  try {
    await navigator.clipboard.writeText(absolute);
    el.videoHint.textContent = absolute.includes("localhost")
      ? "Link copied \u2014 note it only works on this machine. Download the MP4 to share it elsewhere."
      : "Link copied.";
  } catch {
    el.videoHint.textContent = absolute;
  }
}

/* ---------- wiring ---------- */

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  search(el.input.value);
});

el.input.addEventListener("input", () => {
  el.clearBtn.hidden = el.input.value.length === 0;
});

function resetToHome({ focus = true } = {}) {
  if (inFlight) inFlight.abort();
  resetVideo();
  el.input.value = "";
  el.clearBtn.hidden = true;
  currentRepos = [];
  el.repos.innerHTML = "";
  el.reposNote.textContent = "";
  document.title = "GitHub Profile Finder";
  show("idle");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (location.hash) history.pushState(null, "", location.pathname + location.search);
  if (focus) el.input.focus();
}

el.clearBtn.addEventListener("click", () => resetToHome());

el.homeLink.addEventListener("click", (e) => {
  // Let cmd/ctrl/middle-click open a new tab the way any link would.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button ?? 0) !== 0) return;
  e.preventDefault();
  resetToHome();
});

el.repoSort.addEventListener("change", () => {
  try { localStorage.setItem(SORT_KEY, el.repoSort.value); } catch {}
  if (currentRepos.length) renderRepos(false, currentRepos.length);
});

el.clearRecent.addEventListener("click", () => {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
  renderRecent();
});

el.makeVideo.addEventListener("click", () => {
  const username = el.input.value.trim();
  if (username) makeVideo(username);
});

el.videoShare.addEventListener("click", shareVideo);
el.videoCopy.addEventListener("click", copyVideoLink);

el.themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

window.addEventListener("popstate", () => {
  const name = decodeURIComponent(location.hash.slice(1));
  if (name) search(name, { pushHash: false });
  else resetToHome({ focus: false });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== el.input) {
    e.preventDefault();
    el.input.focus();
    el.input.select();
  }
});

/* ---------- boot ---------- */

(async function init() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  applyTheme(saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));

  try {
    const s = localStorage.getItem(SORT_KEY);
    if (s) el.repoSort.value = s;
  } catch {}

  chips(el.suggestList, SUGGESTIONS);
  renderRecent();

  backend = await detectBackend();

  const initial = decodeURIComponent(location.hash.slice(1));
  if (initial) search(initial, { pushHash: false });
  else el.input.focus();
})();
