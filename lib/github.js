/**
 * GitHub data fetching, shaped for the video.
 *
 * Runs server-side so an optional GITHUB_TOKEN can lift the rate limit from
 * 60 requests/hour to 5,000 without ever exposing the token to the browser.
 */

const API = "https://api.github.com";

/** How many repos we'll ask for byte-level language stats on. */
const MAX_LANGUAGE_CALLS = 10;
/** Below this much remaining quota we skip the extra calls and estimate instead. */
const QUOTA_FLOOR = 20;

const WINDOWS = [
  { days: 90, label: "last 90 days" },
  { days: 180, label: "last 6 months" },
  { days: 365, label: "last year" },
];

export class GitHubError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind;
    Object.assign(this, extra);
  }
}

function headers(token) {
  const h = { Accept: "application/vnd.github+json", "User-Agent": "github-profile-finder" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function api(path, token, state) {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining !== null) {
    state.remaining = Number(remaining);
    state.limit = Number(res.headers.get("x-ratelimit-limit"));
    state.reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
  }

  if (res.ok) return res.json();
  if (res.status === 404) throw new GitHubError("not-found", `No GitHub user found`);
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("rate-limited", "GitHub rate limit reached", { reset: state.reset });
  }
  throw new GitHubError("http", `GitHub returned ${res.status}`, { status: res.status });
}

/** Download the avatar and inline it, so the renderer never waits on the network. */
async function avatarDataUrl(url) {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}s=400`, {
      headers: { "User-Agent": "github-profile-finder" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Work out which languages someone has actually been writing lately.
 *
 * GitHub has no "languages in the last N months" endpoint, so we approximate:
 * take the repos pushed inside a recent window, then ask each one for its byte
 * breakdown. If the window is too quiet we widen it rather than show nothing.
 */
async function recentLanguages(login, repos, token, state) {
  let inWindow = [];
  let label = "all time";

  for (const w of WINDOWS) {
    const cutoff = Date.now() - w.days * 24 * 3600 * 1000;
    inWindow = repos.filter((r) => new Date(r.pushed_at).getTime() >= cutoff);
    if (inWindow.length >= 3) {
      label = w.label;
      break;
    }
  }
  if (inWindow.length === 0) {
    inWindow = repos.slice(0, MAX_LANGUAGE_CALLS);
    label = "all time";
  }

  const candidates = inWindow
    .slice()
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, MAX_LANGUAGE_CALLS);

  const totals = new Map();
  let precise = false;

  // Byte-accurate stats cost one request per repo, so only spend the quota if
  // we actually have it. Otherwise fall back to each repo's primary language.
  if (state.remaining === undefined || state.remaining > QUOTA_FLOOR + candidates.length) {
    precise = true;
    const results = await Promise.all(
      candidates.map((r) =>
        api(`/repos/${login}/${encodeURIComponent(r.name)}/languages`, token, state).catch(() => null)
      )
    );
    for (const bytes of results) {
      if (!bytes) continue;
      for (const [lang, n] of Object.entries(bytes)) {
        totals.set(lang, (totals.get(lang) ?? 0) + n);
      }
    }
  }

  if (totals.size === 0) {
    precise = false;
    // Estimate: weight each repo's primary language by its size on disk.
    for (const r of candidates) {
      if (!r.language) continue;
      totals.set(r.language, (totals.get(r.language) ?? 0) + Math.max(r.size ?? 0, 1));
    }
  }

  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  if (sum === 0) return { languages: [], windowLabel: label, precise };

  const languages = [...totals.entries()]
    .map(([name, bytes]) => ({ name, bytes, percent: (bytes / sum) * 100 }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5);

  return { languages, windowLabel: label, precise };
}

/** Everything the video needs, in one call. */
export async function getProfile(username, { token, maxRepos = 5 } = {}) {
  const state = {};
  const user = await api(`/users/${encodeURIComponent(username)}`, token, state);
  const allRepos = await api(
    `/users/${encodeURIComponent(user.login)}/repos?per_page=100&sort=pushed`,
    token,
    state
  );

  const owned = allRepos.filter((r) => !r.fork);
  const totalStars = owned.reduce((sum, r) => sum + r.stargazers_count, 0);

  const topRepos = owned
    .slice()
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, maxRepos)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      url: r.html_url,
    }));

  const { languages, windowLabel, precise } = await recentLanguages(user.login, owned, token, state);
  const avatar = await avatarDataUrl(user.avatar_url);

  return {
    user: {
      login: user.login,
      name: user.name || user.login,
      avatar,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      totalStars,
      createdAt: user.created_at,
      htmlUrl: user.html_url,
    },
    repos: topRepos,
    languages: languages.map(({ name, percent }) => ({ name, percent: Number(percent.toFixed(1)) })),
    windowLabel: precise ? windowLabel : `${windowLabel} (estimated)`,
    rate: state,
  };
}
