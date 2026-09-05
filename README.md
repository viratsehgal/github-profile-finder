# GitHub Profile Finder

Search any GitHub user by username and see their profile, stats and top repositories.
Plain HTML/CSS/JS — no dependencies, no build step.

## Run

Open `index.html` directly, or serve the folder:

```bash
python3 serve.py 8765
```

Then visit http://localhost:8765

`serve.py` is just `http.server` with caching turned off — without it, browsers
keep serving stale `app.js` / `styles.css` after you edit them.

## Features

- Search by username (also accepts `@name` or a full `github.com/name` URL)
- Profile card: avatar, name, bio, join date, location, company, blog, email, X handle
- Stats: followers, following, public repos, gists
- Top 12 non-forked repos, sortable by stars / recently updated / name, with language colors
- Shareable URLs — the username lives in the hash (`#torvalds`), back/forward works
- Click **Profile Finder** in the header (or the &times; in the field) to clear the search and return home
- Animated gradient backdrop, disabled under `prefers-reduced-motion`
- Recent searches (localStorage), light/dark theme, `/` to focus the search box
- Distinct handling for "user not found", rate limiting (with reset time), and network errors
- Remaining API quota shown in the footer

## Rate limits

Unauthenticated GitHub API requests are capped at **60/hour per IP**. Each search costs
two requests (user + repos). The app surfaces the remaining quota and tells you when it resets.
