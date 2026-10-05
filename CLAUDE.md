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

## What this site is now (spatial v2, October 2026)

The **homepage (`/`) is an interactive app**, not a normal page: a full-viewport `<canvas>`
rendering one cluster of **96 nodes** on a **scrubbable timeline of five sections**
(home → about → goodies → blog → journal). Wheel / swipe / arrow keys / clicking a lit node
scrub it; the cluster pours (per-node staggered) from one shape into the next — nebula,
torus knot, nested crystal, standing wave, spine — and snaps to the nearest section.
Translucent faces, depth of field, a cursor lens, motion trails, lightning bolts and a deep
parallax field dress it. Content lives in a **floating glass window** that is *part of the
scene*: draggable, resizable (8 handles), remembered in `localStorage`; the cluster reflows
into the free space beside it and its corners tether to the nearest nodes. Blog posts and
repo READMEs open in a **full-screen reader**. All driven by `js/spatial.js`, with geometry
and draw passes shared via `js/geo.js` — see [`ARCHITECTURE.md §3`](ARCHITECTURE.md).

`/goodies/`, `/blog/`, `/blog/post.html` are **fallback pages** (normal scrolling HTML for
deep links + SEO) that use `js/cluster.js` (same shapes/look, non-interactive) as a background.

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
| `index.html` | the spatial app (canvas, HUD nav, section rail, window, reader overlay) |
| `js/geo.js` | ★ shared geometry + draw passes (`window.GELEUS.geo`) — load before either engine |
| `js/spatial.js` | ★ homepage engine: timeline scrub, morph, window, nav, hash routing, reader |
| `js/cluster.js` | animated background for fallback pages (`<body data-shape>`), built on geo.js |
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
- **localStorage keys** (clear to force refresh): `geleus_repos`, `geleus_contrib`, `geleus_profile`,
  `geleus_win` (the homepage window's position/size).
- **geo.js is shared.** Any change to a shape builder or draw pass affects BOTH the homepage and the
  fallback backgrounds — bump `geo.js?v=` in all four HTML files.
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
check: cluster spins/drags; wheel scrubs the morph and snaps; each nav item / rail tick / lit node
opens its window with live content (journal = tree + heatmap); the window drags and resizes and
the cluster reflows; a blog card and a repo "readme" each open the full-screen reader; `Esc`/back
work; fallback pages still load. (Headless Chrome misrenders narrow viewports — check mobile on a
real device. Also: `requestAnimationFrame` pauses in a hidden tab, so the window only opens once
the morph has *landed* — a background tab looks "stuck" until it is shown.)
