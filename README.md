# NEET PG Mock Test

A full-length, timed NEET PG practice-exam simulator. Static site, zero build step — vanilla HTML/CSS/JS.

- 200 questions per attempt, randomly drawn from a larger question bank (`questions.json`), across 5 sections (A–E)
- 3.5 hour countdown timer, NEET-style marking (+4 / −1 / 0)
- Section & question navigator, answer review with correct/wrong/skipped filtering
- Every retake pulls a fresh random paper from the pool

## Project structure

```
index.html        entry point, loads styles.css and script.js
styles.css         styling
script.js          app logic (state machine + rendering, no framework/deps)
questions.json     question bank (fetched at runtime, cache-busted)
```

## Local development

Requires [Node.js](https://nodejs.org/) (for the dev server only — the app itself has no dependencies).

```bash
npm run dev
```

Then open http://localhost:5500.

You can also just open `index.html` directly, but serving it avoids any `fetch()`/CORS quirks with `file://` URLs in some browsers.

## Deployment

This is a fully static site — any static host works. No build step, no environment variables.

### GitHub Pages (included)

A workflow at `.github/workflows/deploy.yml` deploys automatically on every push to `main`.

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** → **Build and deployment** → set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually) — the site will be live at `https://<user>.github.io/<repo>/`.

### Netlify

`netlify.toml` is included (publish dir `.`). Either drag-and-drop the folder into Netlify, or connect the GitHub repo — no build command needed.

### Vercel

`vercel.json` is included. Import the repo in Vercel with framework preset "Other" — no build command needed.

### Any other static host

Upload `index.html`, `styles.css`, `script.js`, and `questions.json` as-is (they must stay in the same directory as each other).

## Updating content

- **Add/edit questions**: edit `questions.json`. Each entry: `{ "q": "...", "opts": ["...", "...", "...", "..."], "ans": 0, "id": "q0001", "subject": "..." }` where `ans` is the 0-indexed correct option.
- **Change styling/logic**: after editing `styles.css` or `script.js`, bump the `?v=...` query string in `index.html`'s `<link>`/`<script>` tags so browsers/CDNs don't serve a stale cached copy.
