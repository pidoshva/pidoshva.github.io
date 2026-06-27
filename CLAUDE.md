# geleus.com — project guide

Personal site / open-source hub for Vadim Pidoshva (Full Stack Engineer, Utah).
Static site on **GitHub Pages** at **geleus.com**, deployed from `main`. No framework,
no build step. Interactive terminal résumé lives separately at geleus.io.

> **Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full deep dive** (engine internals,
> CSS, data/automation, and a "how to edit common things" cookbook). This file is the
> orientation; ARCHITECTURE.md is the reference.
>
> The **exact node-animation math** — every shape builder formula, the `rand`/`knn`/projection/
> morph/pulse/field equations, and a per-page mapping, transcribed verbatim and 100% replicable
> — is in **[ARCHITECTURE.md §11](ARCHITECTURE.md#11-appendix--exact-geometry--math-replication-spec)**.

## What this site is now (post June-2026 rebuild)

The **homepage (`/`) is an interactive app**, not a normal page: a full-viewport `<canvas>`
rendering one cluster of 48 nodes that **morphs into a different shape per section**, with
content in a right **drawer** (about/goodies/blog) or a **full-screen overlay** (journal,
blog posts, repo READMEs). All driven by `js/spatial.js`. Occasional minimal, desaturated
**lightning bolts** arc between unconnected nodes/dots that drift close (three layers:
dot↔dot, dot↔cluster, node↔node) — see [`ARCHITECTURE.md §3.2 + §11.12`](ARCHITECTURE.md).

`/goodies/`, `/blog/`, `/blog/post.html` are **fallback pages** (normal scrolling HTML for
deep links + SEO) that use `js/cluster.js` as an animated *background*.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | hand-written HTML/CSS/vanilla JS, no framework/build |
| Rendering | hand-rolled 3D on a 2D `<canvas>` (no WebGL/Three.js) |
| Fonts/icons | JetBrains Mono, Font Awesome 5.15 (vendored in `lib/`) |
| Markdown/code | `marked` + `highlight.js` (vendored in `lib/`) |
| APIs | GitHub REST (repos/profile), jogruber contributions API |
| Automation | `scripts/weekly-summary.py` + GitHub Actions + Claude Haiku |
| Hosting | GitHub Pages (`main`), custom domain via `CNAME` |

## Design

Minimalist **charcoal / grey / moss** (tokens in `css/styles.css` `:root`: `--bg #1a1c1b`,
`--surface #232624`, `--text #e6e8e4`, `--moss #8faf78`). Sans for UI, JetBrains Mono for
HUD/code/labels. The canvas palette is duplicated as `rgba()` literals in the JS — keep in sync.

## Key files

| File | Purpose |
|---|---|
| `index.html` | the spatial app (canvas, HUD nav, drawer, overlays) |
| `js/spatial.js` | ★ homepage engine: shapes, morph, nav, hash routing, overlays |
| `js/cluster.js` | animated background for fallback pages (`<body data-shape>`) |
| `js/goodies.js` | repo cards (`#repo-root`); `window.GELEUS.loadReadme` |
| `js/blog.js` | post list/reader (`#blog-list-root`/`#post-root`); `window.GELEUS.loadPost` |
| `js/summary.js` | weekly-summary tree (`#summary-root`) |
| `js/contributions.js` | contribution heatmap (`#contrib-root` + `#contrib-tooltip`) |
| `js/profile.js` | syncs hero name/bio from GitHub (`.hero h1` / `.hero .bio`) |
| `js/lang-colors.js` | `window.GELEUS.LANG_COLORS` (load before `goodies.js`) |
| `js/nav.js` | hamburger + active link — **fallback pages only** |
| `js/topo.js` | LEGACY background, kept but unreferenced |
| `css/styles.css` | all styles; spatial app scoped under `body.spatial` |
| `blog/posts.json` + `blog/posts/*.md` | blog content |
| `data/weekly-summaries.json` | generated journal data (bot-committed) |
| `scripts/weekly-summary.py` · `.github/workflows/weekly-summary.yml` | weekly journal automation |

## Conventions (do not break)

- **Cache-busting:** JS/CSS are linked with `?v=N`. **Bump `N` in every HTML file that
  references a file whenever you edit it** — otherwise browsers serve stale assets. (Blog
  `.md`/`.json` instead use `cache:'no-cache'` fetches, so content edits need no bump.)
- **All JS in IIFEs**; shared state only via `window.GELEUS`. `camelCase`. HTML-escape API content.
- **DOM contracts:** modules find fixed ids (`#repo-root`, `#blog-list-root`, `#summary-root`,
  `#contrib-root`, etc.) — renaming an id means updating the module too.
- **localStorage keys** (clear to force refresh): `geleus_repos`, `geleus_contrib`, `geleus_profile`.
- **Deploy:** edit → bump `?v=` → commit → push `main`. GitHub Pages auto-deploys (~1–2 min).
- Pushing code does **not** refresh the journal — run `gh workflow run weekly-summary.yml` or wait for Saturday's cron.
- **Journal authorship:** the journal distinguishes PRs you *authored* (Shipped/Implemented/…) from
  PRs you *only reviewed* (Reviewed). Each PR has a `role`; `stats.prs` counts authored only. If the
  wording ever blurs the two, fix the prompt in `scripts/weekly-summary.py` (see ARCHITECTURE.md §7).

## Common edits → see ARCHITECTURE.md §9 cookbook

Add a blog post, add/rename a nav section + shape, retune the cluster, change colors, refresh
the journal — all have step-by-step recipes in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Verify

`python3 -m http.server` → `localhost:8000` (try `/#goodies`, `/#blog`, `/#journal`). Smoke
check: cluster spins/drags, each nav node morphs + opens live content, the journal arrow opens
the tree + heatmap overlay, a blog card and a repo "readme" each open the full-screen reader,
`Esc`/back work, fallback pages still load. (Headless Chrome misrenders narrow viewports —
check mobile on a real device.)
