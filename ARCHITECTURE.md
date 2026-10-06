# geleus.com — Architecture

In-depth reference for editing and extending the site. For a quick orientation read
[`CLAUDE.md`](CLAUDE.md); this file is the deep dive. Everything here reflects the
**spatial v2 rebuild** (October 2026): the homepage is a single interactive 3D node
cluster on a scrubbable section timeline with a floating content window; the old multi-page
layout survives only as fallback pages.

---

## 1. Mental model

- **`/` (homepage)** is a self-contained **app**: a full-viewport `<canvas>` rendering
  one cluster of **96 nodes** on a **timeline of five sections** (home, about, goodies,
  blog, journal). Scrolling/swiping/keys/clicking **scrub** the timeline and the cluster
  **morphs into a different shape per section**. Content opens in a **floating glass
  window** that is part of the scene (draggable, resizable, remembered); blog posts and
  repo READMEs open in a **full-screen reader**. Driven by `js/spatial.js` on top of the
  shared `js/geo.js`.
- **`/goodies/`, `/blog/`, `/blog/post.html`** are **fallback pages** — normal scrolling
  HTML kept for deep links, bookmarks, and SEO. They use `js/cluster.js` as an animated
  *background* (not interactive). They are what crawlers and no-JS visitors get.
- **Content is real HTML/Markdown**, fetched at runtime and injected into root elements
  by small per-feature modules (`goodies.js`, `blog.js`, `summary.js`, `contributions.js`,
  `profile.js`). The homepage app and the fallback pages **share these same modules**.
- **No framework, no build step.** Hand-written HTML/CSS/JS served straight off GitHub
  Pages from `main`. All JS is in IIFEs; shared globals live under `window.GELEUS`.

```
visitor → / ─────────────► index.html + geo.js + spatial.js (the app)
                              ├─ window sections → goodies.js / blog.js inject into #repo-root / #blog-list-root
                              │                    summary.js + contributions.js inject into #summary-root / #contrib-root (journal)
                              └─ reader overlay  → window.GELEUS.loadPost / loadReadme
visitor → /goodies/ etc ──► fallback page + geo.js + cluster.js background + same modules
weekly cron ─────────────► scripts/weekly-summary.py → data/weekly-summaries.json (committed by bot)
```

---

## 2. File map

```
pidoshva.github.io/
├── index.html                 # THE APP (spatial v2 homepage)
├── goodies/index.html         # fallback page (repo cards)
├── blog/index.html            # fallback page (post list)
├── blog/post.html             # fallback page (single post reader, ?slug=)
├── blog/posts.json            # blog post metadata (index)
├── blog/posts/*.md            # blog post bodies (Markdown)
├── css/styles.css             # ALL styles (single file, CSS variables, no preprocessor)
├── js/
│   ├── geo.js                 # ★ SHARED geometry + draw passes (window.GELEUS.geo) — load first
│   ├── spatial.js             # ★ homepage app: timeline scrub, morph, window, nav, reader
│   ├── cluster.js             # animated background for fallback pages (per-page shape), on geo.js
│   ├── topo.js                # LEGACY background (kept, unused — safe to ignore)
│   ├── resume.js              # terminal résumé (section 5): content + commands; lazy-loaded with lib/jquery*
│   ├── goodies.js             # repo cards; exposes window.GELEUS.loadReadme
│   ├── blog.js                # post list + reader; exposes window.GELEUS.loadPost
│   ├── summary.js             # weekly-summary tree (#summary-root)
│   ├── contributions.js       # contribution heatmap (#contrib-root)
│   ├── profile.js             # syncs hero name/bio from GitHub (.hero h1 / .hero .bio)
│   ├── lang-colors.js         # window.GELEUS.LANG_COLORS (load BEFORE goodies.js)
│   └── nav.js                 # hamburger + active link — FALLBACK PAGES ONLY
├── data/
│   ├── weekly-summaries.json  # generated journal data (committed by the bot)
│   └── notes.md               # transient: manual notes folded into next summary, then cleared
├── scripts/weekly-summary.py  # weekly journal generator (GitHub API + Claude)
├── .github/workflows/weekly-summary.yml  # Saturday cron + manual dispatch
├── lib/                       # vendored deps: marked, hljs (atom-one-dark), font-awesome 5.15, JetBrainsMono
├── images/ (favicon, logo)
├── CNAME (geleus.com) · sitemap.xml
├── CLAUDE.md · ARCHITECTURE.md · README.md
```

---

## 3. The spatial home app

### 3.1 DOM contract (`index.html`)

Everything the app reads is keyed by these ids/attributes — **renaming any of them
requires a matching change in `js/spatial.js`**:

| Element | Role |
|---|---|
| `canvas#spatialCanvas` | render target (fixed, full viewport) |
| `.frame` | four viewfinder corner brackets (decorative) |
| `.hud-top > .brand` | "geleus" wordmark (links to `/`) |
| `.hud-nav button[data-node="…"]` | nav; `data-node` ∈ `home,about,goodies,blog,journal,resume` |
| `.rail .tick[data-i="0..5"]` + `.tick-dot` + `#railDot` | section rail (the timeline); leader lines are drawn to each `.tick-dot`; `#railDot` is the progress dot |
| `.hero-id.hero` → `#eyebrow`, `h1`, `.role-line`, `#status` | identity block; `.hero h1` is synced by `profile.js`; `#status` is the typed section description |
| `.tele` → `#tLinks/#tFaces/#tMorph/#tRot/#tFps` | live telemetry (desktop only) |
| `#hint` | first-use hint; fades after the first scrub |
| `#win` | **the window**; `.open` toggles; `#winBar` (drag handle, `#winTag`, `#winDim`, `#winFit`, `#winClose`), `#winBody` (scrolls), `.h[data-d=n|s|e|w|ne|nw|se|sw]` resize handles |
| `#win section[data-page="1..5"]` | window sections (about=1, goodies=2, blog=3, journal=4, resume=5); only the active one is shown |
| `#repo-root` / `#blog-list-root` / `#summary-root` / `#contrib-root` / `#resume-root` | module injection roots inside the window sections |
| `#postOverlay` + `#postClose` + `#post-overlay-content` | full-screen **reader** for blog posts AND repo READMEs (`.reader-overlay`) |
| `#contrib-tooltip` | hover tooltip used by `contributions.js` |

**Script load order** (matters — `geo.js` before `spatial.js`; `lang-colors` before `goodies`;
`marked`+`hljs` before `blog`/`goodies`):
`geo.js → spatial.js → lang-colors.js → marked → hljs → goodies.js → blog.js → summary.js → contributions.js → profile.js`.
`nav.js` is **not** loaded here.

### 3.2 The engine (`js/spatial.js` on `js/geo.js`)

**Shared core (`geo.js`, `window.GELEUS.geo`).** Deterministic geometry and the per-frame draw
passes used by both the app and the fallback background: `N = 96` nodes, `CAM = 3.4`, `rand`,
`knn`, `trisOf` (every triangle whose three sides are edges → translucent faces),
the five shape builders, `buildShapes()` (adds `tris`, `eset`), `bgField(90)`, `rotP`, the depth
colour LUT `col(nr)` (far steel `104,122,138` → near moss `168,200,145`), and draw passes
`drawDeepField / drawFaces / drawEdges / drawPulses / drawNodes`, the bolt layer
(`boltLayer / stepBolts / closestUnlinked`), `makeGrain`, `buildVignette`. Exact math: §11.

**Sections = the timeline.** `SEC[i]` (index = position on the timeline):

| i | key | shape | pitch | window |
|---|---|---|---|---|
| 0 | `home` | `nebula` — chaotic ball, knn 3 | −0.28 | closed |
| 1 | `about` | `knot` — (2,3) torus knot, chain + 2 cross-links | −0.55 | about text + links |
| 2 | `goodies` | `crystal` — 3 nested icosphere shells | −0.22 | `#repo-root` |
| 3 | `blog` | `field` — 12×8 standing wave (`dynamic`, rebuilt each frame) | −0.6 | `#blog-list-root` |
| 4 | `journal` | `spine` — trunk 16 + 5 branches each | −0.08 | `#summary-root` + `#contrib-root` |
| 5 | `resume` | `helix` — double helix, 48 rungs, 2.3 turns | −0.35 | `#resume-root` (terminal) |

`ANCH = [5, 20, 41, 63, 84, 70]` pins each section's **lit, labelled node** to a fixed node index so
it rides every morph.

**Résumé terminal (section 5).** Nothing terminal-related is in the initial page load. The first
time `settle(5)` opens the window, `loadResume()` fetches, in order, `lib/jquery.terminal/*.css`,
`lib/jquery/jquery.min.js`, `lib/jquery.terminal/{jquery.terminal.min,less.min,autocomplete_menu}.js`
and `js/resume.js`, then calls `window.GELEUS.initResume(#resume-root)`. `resume.js` holds the
content (jquery.terminal `[[b;#hex;]…]` markup via the `h/k/s/f` palette helpers), the command
`switch`, and exposes `resumeResize()` (called by `applyWin`) and `resumeFocus()`. Its `startx`,
`exit`, `hub`/`home`, `goodies`, `blog`, `journal` commands call `window.GELEUS.goSection(key)`.
Keys typed into the terminal are left alone by the app's keydown handler, except `Esc` (→ home).
geleus.io redirects to `/#resume`.

**Demo mode (the story).** Typing `demo` in the terminal (suggested in its greeting and `help`)
calls `window.GELEUS.startDemo()`. Chapters live in `window.GELEUS.resumeStory` (`js/resume.js`,
`{eyebrow, title, lines[]}`, bottom of the helix → top, sourced from the résumé). While playing
(`body.demo`): the window, identity block, telemetry and hint fade out and the rail dims; the
caption card `#demoCap` (`#demoN`, `#demoTitle`, `#demoLines`, `#demoBar`) types each line in;
the **frontier** `demo.frontier` eases toward `(i+1)/n` and every node with model `y` above it
(screen: below it) is lit, a band of ±0.06 around it is "hot" (`bright[k] = 1.5` → bigger, bloom),
the rest dims to 0.12 — passed as the `br` array to the geo.js draw passes; pulses run on lit links
only (every edge, `T·1.8`); a ring expands from the frontier at each chapter beat; the camera orbits
(`tgtYaw += 0.005`), pitch −0.15, and `demoLayout()` keeps the frontier near `0.42·H` at
`base·1.3` scale. Auto-advance after `clamp(3800 + chars·42, 6000, 16000)` ms (progress bar);
**Space / → / Enter / click** next, **←** back, **p** pause, **Esc** exit. Leaving the section ends it.
On completion the window returns and the terminal echoes "demo complete". The terminal is
`disable()`d during the demo so Space doesn't type into it. Reduced motion: no typing/easing.

**Timeline scrub.** `tp` is the target position (0..4), `p` eases toward it (`p += (tp−p)·0.075`).
Wheel: `tp += deltaY·0.0014` (ignored over `#win`/`.reader-overlay` so content scrolls); touch
vertical drag: `tp −= dy·0.004`; both snap to `round(tp)` 360 ms after the last input via `go()`.
Keys: arrows / PageUp/Down step, `1–6` jump, `Esc` closes the reader, else goes home.
`go(i, silent)` sets `tp`, updates nav/rail/eyebrow/status (`liveUpdate`), hides stale window
content (`settle(-1)`), and pushes history unless `silent`.

**Morph.** With `i = floor(p)`, `f = p − i`: node `k` lerps `posAt(i)[k] → posAt(i+1)[k]` by
`easeIO(clamp((f − DEL[k]) / 0.6, 0, 1))`, `DEL[k] = rand(k·3.3+9)·0.4` — a per-node delay so the
cluster "pours". Faces + edges of both shapes crossfade by `easeIO(f)`. Pulses and bolts run only
when settled.

**Window layout.** `layoutTarget()` returns the cluster centre + scale: home → viewport centre,
`base = min(W,H)·(W<700 ? .42 : .34)`; a section on desktop → the **largest free region** beside
the window (left / right / above / below, judged by `min(w,h)`), kept clear of the HUD strip (72 px)
and the identity block (its measured top − 10), scale `clamp(m·0.43, base·0.4, base)` so the
cluster leans slightly under the glass; mobile → centre raised by `0.16·H`. `cx/cy/scale` ease
at 0.08. The window itself: `WIN {x,y,w,h}`, default `w = clamp(0.48W, 420, 760)`,
`h = clamp(0.74H, 340, 900)`, `x = max(16, W − w − 190)` (clears the rail); dragged by `#winBar`,
resized by the 8 handles (min 320×240, 16 px viewport margin), `fit` shrinks to content,
persisted as JSON in `localStorage.geleus_win` (validated against the viewport on load).

**Render loop** (`draw()`, per frame): ease `p/yaw/pitch/cx/cy/scale` → build `cur` positions →
trail-clear (`rgba(14,16,15, ta)`, `ta = clamp(1 − speed·2.4, 0.28, 1)`, i.e. motion trails when
moving) → vignette → deep field (mouse parallax `(mouse − centre)·0.02`) → project + **cursor
lens** (nodes within 150 px of the pointer are pushed `((1−d/R)²·26)` px away, offsets ease 0.18)
→ faces → edges → pulses (every 3rd edge) → nodes (depth of field) → bolts → **anchors** (glow,
white core, pulsing ring when active, label `NN key`, elbow **leader line** to its rail tick) →
**window tethers** (each window corner → nearest node with `nearOf ≥ 0.3`, dashed, alpha by
distance; the active anchor → title bar dock point, solid) → grain (alpha 0.055) → `settle()`
→ rail dot → telemetry (every 6 frames) → `measure()` (every 30 frames).

**Settle.** `settle(i)` runs with `i = tp` once `|p − tp| < 0.02` and `tp` is integral, else `−1`.
`i ≤ 0` closes the window; otherwise it shows `section[data-page=i]`, sets `#winTag`, opens the
window. Because this is frame-driven, a **hidden tab** (rAF paused) keeps its old state until shown.

**Tunable constants** (all in `spatial.js` unless noted):

| Constant | Default | Effect |
|---|---|---|
| `N` / `CAM` (geo.js) | 96 / 3.4 | node count / camera distance |
| auto-rotate | `tgtYaw += 0.0035` | idle spin (home, not dragging/hovering) |
| scrub gain | wheel `0.0014`, touch `0.004`, snap `360 ms` | scroll feel |
| ease | `p 0.075`, `yaw 0.07`, `pitch 0.05`, layout `0.08` | responsiveness |
| `DEL` spread | `rand·0.4`, window `0.6` | how staggered the morph is |
| trails | `ta = clamp(1 − speed·2.4, .28, 1)` | afterimage strength |
| lens | `R = 150`, push `26` | cursor repulsion |
| hover pick | 22 px | lit-node click radius |
| bolts | `boltLayer(2, 0.8)`, `lim = scale·0.2` | node↔node arcs (one layer now) |
| grain | `0.055` | film grain alpha |

### 3.3 Navigation, routing, overlays

- **`go(i, silent)`** is the single entry point. Nav buttons, rail ticks, lit nodes, keys, and the
  scrub snap all call it. It pushes `#key` (or the bare path for home) unless `silent`.
- **Deep links / history:** on load `keyFromHash()` maps `#about|#goodies|#blog|#journal|#resume` to the
  index and the app starts *on* that section (`p = tp = i`, no morph); `popstate` → `go(idx, true)`.
- **Clicking the canvas** (pointer-up with < 6 px movement): a hovered lit node opens its section;
  empty space returns home. Mouse drag rotates (`tgtYaw += dx·0.006`, `userPitch ±1`); on touch a
  vertical drag scrubs and a horizontal one rotates.
- **Journal** is section 4 — the window holds the weekly-summary tree **and** the contributions
  heatmap (same modules as before, no separate overlay).
- **Blog posts & repo READMEs** open in the shared `#postOverlay` reader. `spatial.js` intercepts
  clicks inside `#win`: `.repo-expand-btn` in the **capture phase** + `stopPropagation` (so
  `goodies.js`'s inline expander does NOT also fire) → `openReadme(repo, branch)` →
  `window.GELEUS.loadReadme`; `.blog-card` → `openPost(slug)` → `window.GELEUS.loadPost`, falling
  back to `/blog/post.html?slug=` if the hook is unavailable. `Esc` precedence: reader → home.
- **Accessibility / motion:** `prefers-reduced-motion` freezes `T`, makes `p = tp` (instant
  morph), disables auto-rotate, pulses, bolts, trails and the typing effect; the window and
  reader still work. `#win` toggles `aria-hidden`.

---

## 4. CSS (`css/styles.css`, single file)

- **Scoping:** all spatial-app rules are under **`body.spatial`** (set on `index.html` only),
  so the fallback pages are untouched. `body.spatial` is `height:100dvh; overflow:hidden`
  (the app doesn't scroll; `#winBody` and the reader scroll internally).
- **Design tokens** in `:root` (charcoal/grey/moss): `--bg #1a1c1b`, `--surface #232624`,
  `--text #e6e8e4`, `--text-dim #9aa09a`, `--text-faint`, `--moss #8faf78`, `--moss-bright #a8c891`,
  `--border`/`--border-2`, fonts `--font-sans` / `--font-mono` (JetBrains Mono — vendored weights
  are Regular/Medium/Bold/ExtraBold only). Contribution ramp `--contrib-0..4`. **The canvas palette
  is inlined as `rgba()` in `geo.js`/`spatial.js` and must be kept in sync by hand.**
- **Key classes:** `.frame` (corner brackets), `.hud-top`/`.hud-nav` (top bar), `.rail`/`.tick`/
  `.rail-dot` (section rail), `.hero-id` (identity: `.eyebrow`, `h1`, `.role-line`, `.status`+`.caret`),
  `.tele` (telemetry), `.hint`, `.win`/`.win-bar`/`.win-body`/`.win-head`/`.win-sub`/`.win-links`/
  `.h-*` (the window), `.journal-contrib`, `.reader-overlay`/`.reader-inner`/`.reader-close` (reader).
- **Window glass:** `.win { background: rgba(16,18,17,.5); backdrop-filter: blur(5px) }` — deliberately
  translucent so the cluster shows through; `.win.moving` drops the blur while dragging/resizing for
  smoothness. The window's `left/top/width/height` are inline styles set by JS.
- **Reader backdrop:** `.reader-overlay { background: rgba(12,14,13,.95); blur(22px) }` — near-opaque
  on purpose (earlier 0.62 let background text bleed through).
- **Mobile (`@media max-width:760px`, matches `spatial.js` `W > 760`):** the rail becomes a
  dots-only horizontal strip whose `top` is set by `spatial.js` (`measure()`) from the measured,
  possibly wrapped, header; telemetry + hint hide; the window becomes a **bottom sheet**
  (`height:62%`, `background .84`, no drag/resize handles, close label swaps to "✕ close" via
  `.lbl-desktop/.lbl-mobile`); `body.win-open` (toggled in `settle()`) fades the identity block
  so it never bleeds through the sheet. The cluster then fits the band between the rail and the
  sheet top (`H·0.38`) — see `layoutTarget()`. Touch: vertical drag scrubs (`−dy·0.006`),
  horizontal rotates, and a tap picks the nearest lit node on release (`pickAnchor`).
- Window content reuses existing component styles (`.repo-card/.blog-card/.timeline-tree/.contrib-*`);
  inside the window the repo/blog grids are `repeat(auto-fill, minmax(240px, 1fr))`.

---

## 5. Content modules & their contracts

Each module is an IIFE that finds its root element and renders into it. They run on every
page that contains their root — that's how the **same** code serves the app window/reader
and the fallback pages. Shared hooks live on `window.GELEUS`.

| Module | Renders into | Data source | Cache | Notes |
|---|---|---|---|---|
| `goodies.js` | `#repo-root` | `api.github.com/users/pidoshva/repos` | `localStorage geleus_repos` (1h) | only repos with topic **`goodie`**; exposes `window.GELEUS.loadReadme(repo,branch,el)`; inline README expansion still used on `/goodies/` |
| `blog.js` | `#blog-list-root` (list), `#post-root` (fallback page) | `/blog/posts.json` + `/blog/posts/<slug>.md` | **`cache:'no-cache'`** (revalidate) | exposes `window.GELEUS.loadPost(slug,el)`; `renderPost(slug,root,{updateMeta,footer})` is the core; cards link to `/blog/post.html?slug=` |
| `summary.js` | `#summary-root` | `/data/weekly-summaries.json` | — | year→month→week collapsible tree |
| `contributions.js` | `#contrib-root` (+ `#contrib-tooltip`) | jogruber `…/v4/pidoshva?y=last` | `localStorage geleus_contrib` (1h) | last 12 months; cells use `--contrib-0..4` |
| `profile.js` | `.hero h1`, `.hero .bio` | `api.github.com/users/pidoshva` | `localStorage geleus_profile` (1h) | updates the name only on the app (there's no `.bio`, so the tagline stays) |
| `lang-colors.js` | — | static | — | sets `window.GELEUS.LANG_COLORS`; **must load before `goodies.js`** |
| `nav.js` | header/hamburger | — | — | fallback pages only |

> **The blog-content caching gotcha:** `.md`/`.json` are fetched with `cache:'no-cache'`
> so edits show up after a normal refresh. If you ever drop that option, edits will appear
> "stuck" because the browser/CDN serves a stale file.

---

## 6. Fallback pages & `cluster.js`

`goodies/index.html`, `blog/index.html`, `blog/post.html` are classic header/nav/main/footer
pages. They set `<body data-shape="…">` and load `js/geo.js` + `js/cluster.js`, which injects a
fixed full-viewport background canvas (class `.topo-bg`, `z-index:-1`, `pointer-events:none`) that:
morphs from the nebula into the page's shape on load (`goodies`→crystal, `blog`→field, `lab`
(post)→knot, `journal`→spine, `home`→nebula), rotates slowly, follows the mouse with a little
parallax, and reuses every geo.js draw pass (faces, depth of field, pulses, bolts, grain).
It **fades on scroll** so text stays readable (`top 0.42 → min 0.16` over 260 px; home `1.0 → 0.12`
over 560 px). `cluster.js` has **no shape code of its own** — all geometry lives in `geo.js`.
Optional hooks (used by the geleus.io résumé, which vendors `geo.js` + `cluster.js`):
`<body data-bg-fade="off">` disables the scroll-fade; `window.GELEUS.clusterLayout(W,H)` may return
`{cx, cy, s}` to place/scale the cluster (eased at 0.08); `window.GELEUS.clusterHook(ctx, sp, W, H, T)`
draws over the cluster each frame (`sp` = projected points).
`topo.js` is the previous contour background — **kept but no longer referenced** anywhere.

---

## 7. Data & automation

**Blog** — `blog/posts.json` is the index; each entry:
```json
{ "slug": "kebab-case", "title": "…", "date": "YYYY-MM-DD", "excerpt": "…", "tags": ["…"], "draft": false }
```
Body lives at `blog/posts/<slug>.md`. Newest-first by `date`; `draft:true` hides from the list.
Slugs must match `^[a-z0-9][a-z0-9-]*$`.

**Weekly journal** — `data/weekly-summaries.json` (`{ "summaries": [ … ] }`) is generated, not
hand-edited. Each entry has `week_start/week_end`, `summary`, `highlights[]`, `repos[]`,
`prs[]` (with `org`/`state`/**`role`**), `repo_orgs`, `repo_languages`, `languages[]`, and `stats
{commits,prs,repos_active}`. Rendered by `summary.js`.

**Authored vs reviewed (important).** Each PR carries a `role`: `author` (the user wrote it) or
`reviewer` (they only commented/approved someone else's PR). It's resolved from the PR author
login, because the GitHub `involves:` search query mixes both in with no flag. The Haiku prompt
feeds **two separate PR lists** ("authored" vs "only reviewed") with strict verb rules — authorship
verbs (Shipped/Implemented/Built/Fixed) for commits + authored PRs, "Reviewed" for reviewer-only
PRs, never blended into one bullet. `summary.js`'s `HIGHLIGHT_KEYWORDS` already colour-codes these
verbs (ship vs merge), so no JS change was needed. `stats.prs` counts **only authored** PRs (a
separate `prs_reviewed` count is tracked). If the journal text ever blurs the two again, the fix
lives in this prompt, not the front-end.

`scripts/weekly-summary.py`: pulls the week's commits + PRs from the GitHub API (matching by
login **or** known emails in `USER_EMAILS`), tags each PR's `role`, sends them to **Claude Haiku**
for a short summary + highlights, backfills any missing weeks, folds in `data/notes.md` (then
clears it), and writes the JSON. Note: regenerating *old* weeks would need a `..week_end` upper
bound on the PR query (the live run has none) — not yet added; existing entries predate the
authored/reviewed split. Env: `ANTHROPIC_API_KEY` (required), `GH_PAT` (higher rate limits / SSO
for org repos), `TRIGGER`. `.github/workflows/weekly-summary.yml` runs it **Saturday ~5am UTC**
and on manual dispatch, committing as `geleus-bot`. Pushing code does **not** refresh the
journal — run `gh workflow run weekly-summary.yml` or wait for the cron.

---

## 8. Conventions

- **Cache-busting (important):** browsers cache JS/CSS hard. Every versioned asset is linked
  with `?v=N` in the HTML. **Bump `N` whenever you edit that file**, or stale assets get
  served (this caused repeated "still broken" reports). Bump across every HTML file that
  references the asset. Current snapshot (will drift — treat the *rule* as the source of truth):
  `styles.css?v=30`, `geo.js?v=3` (all four pages), `spatial.js?v=13`, `resume.js?v=2` (lazy), `goodies.js?v=5`, `blog.js?v=3`,
  `contributions.js?v=8`, `cluster.js?v=17` (fallback pages). `summary.js`, `profile.js`, `lang-colors.js`, `nav.js`,
  and `lib/*` are currently unversioned. Blog **content** (`.md`/`.json`) is handled by the
  `cache:'no-cache'` fetch instead of a version query.
- **localStorage keys** (clear to force a refresh): `geleus_repos`, `geleus_contrib`, `geleus_profile`,
  `geleus_win` (homepage window rect `{x,y,w,h}`).
- **JS style:** every file is an IIFE; no globals except the `window.GELEUS` namespace;
  `camelCase`; `getElementById`/`querySelector`. HTML-escape any user/API content.
- **No build step.** Edit → bump `?v=` → commit → push to `main` → GitHub Pages deploys.
- **Canvas palette** is duplicated as literals in `geo.js`/`spatial.js`; keep it in sync
  with `:root` if you change colors.

---

## 9. Cookbook — how to edit common things

**Add a blog post**
1. Create `blog/posts/<slug>.md` (body only; no need for an `# H1` — the reader shows the title).
2. Prepend an entry to `blog/posts.json` (`slug`, `title`, `date`, `excerpt`, `tags`, `draft:false`).
3. Commit + push. No version bump needed (content uses `no-cache`). It appears in the blog
   window/list and opens in the full-screen reader.

**Change the tagline / identity**
- Edit `.role-line` / `h1` in `index.html`. Note `profile.js` overwrites `.hero h1` from GitHub —
  keep the tagline as `.role-line` (not `.bio`) so it isn't overwritten.

**Add a section to the timeline**
1. In `geo.js`: add a shape builder returning **exactly 96** `{x,y,z}` + an edge list, and register
   it in `buildShapes()` (faces/eset are derived automatically). Bump `geo.js?v=` in all four pages.
2. In `spatial.js`: append `{ key, n:'05', shape, pitch, desc }` to `SEC`, add an unused node index
   to `ANCH`, and extend the `/^[1-5]$/` key shortcut if you want one.
3. In `index.html`: add `<button data-node="key">` to `.hud-nav`, a `.tick[data-i="5"]` to `.rail`,
   and a `<section data-page="5">` inside `#winBody` (include a root element if a module should fill it).
4. Bump `spatial.js?v=` and `styles.css?v=` if you touched CSS.

**Add an external link (like resume)** — nav button only; special-case its `data-node` in the nav
click handler in `spatial.js` (no shape, no rail tick).

**Retune the look** — constants in §3.2: spin (`0.0035`), scrub gain/snap, easing, `DEL` stagger,
trails, lens, bolts, grain (spatial.js); face/edge/node alphas and the depth LUT (geo.js — affects
the fallback pages too). Bump the matching `?v=`.

**Change the window defaults** — `defaultWin()` / `clampWin()` in `spatial.js`; the free-region
rules in `layoutTarget()`. Visitors' saved rects live in `localStorage.geleus_win`.

**Change colors** — edit `:root` tokens in `css/styles.css` AND the inlined `rgba()` literals in
`geo.js`/`spatial.js`. Bump `styles.css?v=` (and the JS versions).

**Edit a fallback page's background shape** — change `<body data-shape="…">`
(`home/about/goodies/blog/lab/journal`) in that page; the mapping is `PAGE_SHAPE` in `cluster.js`,
the shapes are in `geo.js`.

**Refresh the journal manually** — `gh workflow run weekly-summary.yml` (needs the repo secrets).

---

## 10. Deploy & verify

- **Deploy:** commit to `main`; GitHub Pages serves it in ~1–2 min. Hard-refresh (`Cmd+Shift+R`)
  if you forgot to bump a `?v=`.
- **Verify locally:** `python3 -m http.server` in the repo root, open `localhost:8000`.
  Useful deep links: `/#goodies`, `/#blog`, `/#journal`. Headless screenshot, e.g.
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --window-size=1280,860 --virtual-time-budget=3000 --screenshot=out.png http://localhost:8000/index.html#journal`.
  (Note: headless Chrome renders narrow-viewport/responsive layout unreliably — verify mobile on a real device.)
- **Smoke check after changes:** home cluster spins + drags; the wheel scrubs the morph and snaps;
  each nav item / rail tick / lit node opens its window with live content (journal = tree + heatmap);
  the window drags/resizes and the cluster reflows; a blog card and a repo "readme" each open the
  full-screen reader; `Esc`/back work; fallback pages still load.
- **Demo smoke:** on `/#resume` type `demo` → window fades, helix lights from the bottom, captions
  type; Space advances, Esc returns the window and the terminal still accepts input.
- **Testing gotcha:** `requestAnimationFrame` is paused in a hidden/background tab, and the window
  only opens once the morph has landed — so a tab driven by automation while hidden looks "stuck".
  Keep the tab visible (or interleave screenshots) when smoke-testing with browser automation.

---

## 11. Appendix — exact geometry & math (replication spec)

Everything needed to reproduce the node animation **100%**, transcribed from `js/geo.js`
(shared), `js/spatial.js` (homepage app) and `js/cluster.js` (fallback background). All canvas
coordinates are **CSS pixels** (context pre-scaled by `dpr = min(devicePixelRatio, 2)` via
`ctx.setTransform(dpr,0,0,dpr,0,0)`).

### 11.1 Global constants (geo.js)
```js
N   = 96     // node count — every shape MUST return exactly 96 points
CAM = 3.4    // camera distance (perspective)
T   = 0      // per engine; T += 0.016 per frame (frozen under prefers-reduced-motion)
```

### 11.2 Primitives (verbatim)
```js
function rand(s){ var x = Math.sin(s*127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v,a,b){ return v < a ? a : (v > b ? b : v); }
function easeIO(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
function nearOf(z){ return clamp(1 - (z+1)/2.4, 0, 1); }   // rotated depth → near-camera factor
```

### 11.3 Graph helpers (verbatim logic)
- **`knn(pos, k, skip)`** — for each node, its `k` nearest by squared distance, excluding
  `a === b` and pairs where `skip(a,b)` is true; undirected, deduped by `lo_hi` key → `[[lo,hi],…]`.
- **`trisOf(edges)`** — every triple `a<b<c` with all three sides present in the edge set → faces.
  `buildShapes()` keeps at most the first 260.
- **`buildShapes()`** → `{ nebula, knot, crystal, field, spine, helix }`, each `{ pos, edges, tris, eset }`;
  `field` also has `dynamic: true` (its `pos` is regenerated each frame with `field(T)`).

### 11.4 Shape builders (each returns N = 96 points)
```js
// nebula (home) — chaotic ball: cube-root radius (uniform volume), anisotropic scale, ±0.15 jitter
r = cbrt(rand(i*5+1)); a = rand(i*5+2)·2π; b = acos(2·rand(i*5+3) − 1)
x = r·sin b·cos a·1.35 + (rand(i*5+4)−.5)·.3 ; y = r·cos b·.9 + (rand(i*5+5)−.5)·.3 ; z = r·sin b·sin a·1.15
edges = knn(pos, 3)

// knot (about) — (P,Q) = (2,3) torus knot, R = .74, rr = .3, lying in the x–z plane
t = i/N·2π ; r = R + rr·cos(Q t)
x = r·cos(P t) ; y = rr·sin(Q t)·1.2 ; z = r·sin(P t)
edges = chain [k, k+1 mod N]  ∪  knn(pos, 2, skip: ring distance ≤ 3)

// crystal (goodies) — three nested shells. icosphere() = icosahedron (12 verts, 20 faces)
// subdivided once, midpoints normalised → 42 verts, 120 edges, 80 faces.
pos[0..41]  = icosphere verts · 1.02
pos[42..83] = icosphere verts rotated about Y by 0.62 rad · 0.58
pos[84..95] = the 12 icosahedron verts rotated about Y by 1.1 rad · 0.24
edges = icosphere edges on both shells (offset +42)  ∪  knn(core12, 5) (+84)
      ∪  spokes: for o = 0,3,6,…,39 → nearest inner-shell vertex

// field (blog) — 12×8 grid (FX=12, FZ=8), y animates with t
x = (i/(FX−1) − .5)·2.15 ; z = (j/(FZ−1) − .5)·1.5
y = sin(x·2.6 + t·1.5)·.22 + cos(z·3 + t·1.1)·.2 + sin((x+z)·1.8 − t·.9)·.1
edges (fixed): (i,j)–(i+1,j), (i,j)–(i,j+1), (i,j)–(i+1,j+1)   // grid + one diagonal → triangle mesh

// spine (journal) — trunk of 16 + 5 branches each
trunk k: y = (k/15 − .5)·2.1 ; x = sin(y·1.7)·.1 ; z = cos(y·1.3)·.08 ; edge [k−1,k]
branch (k,j), s = k·9 + j·3:  a = rand(s+1)·2π ; len = .2 + rand(s+2)·.6 ; tilt = .06 + rand(s+3)·.2
  pos = trunk[k] + (cos a·len,  tilt·len·2,  sin a·len) ; edge [k, idx]

// helix (resume) — double helix: 48 rungs, 2.3 turns, radius .55, height 2.0
rung k: tt = k/47 ; a = tt·2π·2.3 ; y = (tt − .5)·2.0
  pos[2k]   = (.55·cos a,     y, .55·sin a)
  pos[2k+1] = (.55·cos(a+π),  y, .55·sin(a+π))
edges = rungs [2k, 2k+1]  ∪  strand chains [2k−2, 2k], [2k−1, 2k+1]  ∪  knn(pos, 1, skip: |a−b| ≤ 3)
```
Counts: nebula 184 edges / 79 faces · knot 216 / 48 · crystal 284 / 180 · field 249 / 154 · spine 95 / 0 · helix 203 / 61.

### 11.5 Background parallax field (`bgField(90)`)
```js
u = rand(i+7), v = rand(i+77), w = rand(i+777); r = 1.5 + 1.8·cbrt(u); a = v·2π; b = acos(2w−1)
pos = (r·sin b·cos a, r·cos b, r·sin b·sin a);  edges = knn(pos, 1)
```
Drawn by `drawDeepField(ctx, bg, W, H, T, px, py, reduced)`: own camera `fby = T·0.03` (yaw;
`0.4` under reduced motion), pitch `−0.18`, `ff = 5/(5+z)`, `fbs = min(W,H)·0.52`,
screen `= centre + r·ff·fbs − (px,py)·ff` where `(px,py) = (mouse − centre)·0.02` (parallax).
Depth `fn = 1 − (z+3.3)/6.6`: edges `rgba(120,134,124, .04+fn·.08)`, dots radius `.8+fn·1.4`
`rgba(143,175,120, .06+fn·.18)`.

### 11.6 Rotation + projection (verbatim)
```js
function rotP(p, yaw, pitch){           // yaw about Y, then pitch about X
  var c=Math.cos(yaw), s=Math.sin(yaw), x1=p.x*c - p.z*s, z1=p.x*s + p.z*c;
  var cp=Math.cos(pitch), sp=Math.sin(pitch);
  return { x:x1, y:p.y*cp - z1*sp, z:p.y*sp + z1*cp };
}
f = CAM/(CAM + r.z);  screenX = cx + r.x·f·scale;  screenY = cy + r.y·f·scale
// app: (cx, cy, scale) come from layoutTarget() (§3.2), eased at 0.08
// background: cx = W/2, cy = H/2, scale = min(W,H)·(W<700 ? .46 : .33)
```
The projected point keeps `rx, ry, z` (rotated coords) for face shading.

### 11.7 Morph (app: timeline; background: load-in)
```js
DEL[k] = rand(k·3.3 + 9)·0.4                          // per-node delay
e_k    = easeIO(clamp((f − DEL[k]) / 0.6, 0, 1))      // f = progress 0..1
cur[k] = lerp(A[k], B[k], e_k)                        // per axis
ef     = easeIO(f)                                    // faces + edges crossfade weight
// app:  f = p − floor(p), p += (tp − p)·0.075 each frame (p = tp under reduced motion)
// bg:   f = morphT, morphT += 0.014 per frame, nebula → page shape once on load
```

### 11.8 Draw passes (geo.js, exact per-frame math)
Order (app): trail-clear → vignette → deep field → faces → edges → pulses → nodes → bolts →
anchors + leader lines → window tethers → grain. (Background: same minus anchors/tethers.)
- **Trail clear**: `fillRect` with `rgba(14,16,15, ta)`; app `ta = clamp(1 − speed·2.4, .28, 1)`,
  `speed = |tp−p|·1.6 + |tgtYaw−yaw|·0.9`; background `ta = 0.45` while morphing, else 1.
- **Vignette** (pre-rendered per resize): radial `(0.5W, 0.45H, r = min·0.2) → (0.5W, 0.5H, r = max·0.8)`,
  `rgba(10,12,11,0) → rgba(8,9,9,.62)`.
- **Depth colour** `col(nr)` = 11-step LUT `lerp((104,122,138) → (168,200,145), nr)`.
- **Faces** (`drawFaces`, weight `w`): view-space normal `n = (b−a) × (c−a)` on `(rx,ry,z)`,
  `sh = |n.z|/|n|`, `nr = nearOf(mean z)`; fill `rgba(col(nr), (.018 + .09·sh)·(.35 + .65·nr)·w)`.
- **Edges** (`drawEdges`): `nr = nearOf((zA+zB)/2)`, `lineWidth = .5 + nr·1.3`,
  stroke `rgba(col(nr), (.07 + nr·.42)·w)`.
- **Pulses** (`drawPulses`, every 3rd edge, settled only): `ph = (T·.5 + q·.1973) mod 1`,
  point `lerp(A,B,ph)`, radius `1 + nr·1.5`, fill `rgba(224,236,210, .25 + nr·.5)`.
- **Nodes** (`drawNodes`, far→near): `nr = nearOf(z)`, `rr = 1.4 + nr·2.6`, `c = col(nr)`.
  `nr < .4` → out-of-focus disc: radial r 4.5 `rgba(c,.28) → 0` only.
  `nr > .66` → bloom: radial `rr·3.2` `rgba(c, .26·nr) → 0`. Then core `rgba(c, .4 + nr·.6)` radius `rr`.
- **Anchors** (app): `rq = 2.6 + nq·2.2`; glow `rq·3.6` `rgba(168,200,145, act ? .55 : .3) → 0`;
  core `rgba(230,240,222,1)`; active ring at `rq + 5 + sin(3T)·1.2` `rgba(168,200,145,.9)` w1.2;
  label `500 11px JetBrains Mono` `rgba(230,232,228, act ? .98 : .42 + nq·.3)` at `(x+rq+7, y+4)`;
  leader to the rail tick: desktop `node → (tick.x−56, node.y) → (tick.x−38, tick.y) → (tick.x−8, tick.y)`,
  mobile `node → (node.x, tick.y+40) → (tick.x, tick.y+26) → (tick.x, tick.y+8)`; active solid
  `rgba(143,175,120,.6)`, others dashed `[2,5]` `rgba(120,134,124,.16)`. Hover pick radius 22 px.
- **Window tethers** (app, desktop, window open): each corner → nearest node with `nearOf ≥ .3`,
  dashed `[3,5]`, alpha `clamp(1 − d/(min(W,H)·.7), .08, .5)`, 5 px square at the corner (alpha +.3);
  active anchor → `(WIN.x, WIN.y + 18)` solid `rgba(168,200,145,.75)` w1.2 + 3 px dot.
- **Grain**: 140×140 random grey tile (`120..255`) as a repeating pattern, `globalAlpha .055` (bg `.05`).

### 11.9 Camera & input (app)
```
initial:   yaw = 0.6, pitch = −0.28, p = tp = index-from-hash
idle:      tgtYaw += 0.0035 (home, not dragging, nothing hovered)
ease:      yaw += (tgtYaw − yaw)·0.07 ; pitch += (SEC.pitch + userPitch − pitch)·0.05
mouse:     tgtYaw += dx·0.006 ; userPitch = clamp(userPitch + dy·0.006, −1, 1)
touch:     |dy| > |dx| ? scrub(−dy·0.006) : tgtYaw += dx·0.007
wheel:     scrub(deltaY·0.0014) ; snap to round(tp) after 360 ms
tap:       moved < 6 px → open the anchor within 22 px of the release point, else home
lens:      d < 150 → push (1 − d/150)²·26 px radially ; offsets ease 0.18
```
Background (`cluster.js`): `yaw += 0.0035`/frame, pitch `−0.3`, both nudged by the eased mouse
parallax (`yaw + px·0.01`, `pitch + py·0.006`), no other input.

### 11.10 `spatial.js` vs `cluster.js`
| | `spatial.js` (homepage app) | `cluster.js` (fallback background) |
|---|---|---|
| Shapes | all five, on a scrubbable timeline | one per page via `data-shape` (`PAGE_SHAPE`), morph-in from nebula |
| Interaction | scrub, drag-rotate, lit nodes, window, reader | mouse parallax only |
| Camera | eased yaw/pitch + layout-driven centre/scale | fixed pitch, constant spin, viewport centre |
| Morph | `p → tp` ease 0.075, staggered | `morphT += 0.014`, staggered |
| Extras | anchors, leader lines, window tethers, telemetry | scroll-fade (`opacity = top − (top−min)·min(1, scrollY/dist)`) |
| Bolts | one node↔node layer `boltLayer(2, .8)`, `lim = scale·0.2` | same |

### 11.11 Per-page mapping
| Page | Engine | shape | Motion |
|---|---|---|---|
| `/` | spatial.js | nebula | idle spin + pulses + bolts + parallax field |
| `/#about` | spatial.js | knot | scrub-in, window |
| `/#goodies` | spatial.js | crystal | scrub-in, window (`#repo-root`) |
| `/#blog` | spatial.js | field (live) | scrub-in, window (`#blog-list-root`) |
| `/#journal` | spatial.js | spine | scrub-in, window (`#summary-root` + `#contrib-root`) |
| `/#resume` | spatial.js | helix | scrub-in, window (`#resume-root` terminal, lazy-loaded) |
| `/goodies/` | cluster.js | crystal | morph-in + spin + scroll-fade |
| `/blog/` | cluster.js | field (live) | morph-in + scroll-fade |
| `/blog/post.html` | cluster.js | knot (`lab`) | morph-in + spin + scroll-fade |

### 11.12 Lightning bolts (geo.js, exact)
One layer per engine: `boltLayer(max = 2, cd = 0.8)`, `SPARK = 0.42 s`. Per frame when settled:
`stepBolts(ctx, st, () => closestUnlinked(sp, eset, scale·0.2, W, H), T)`.
- **closestUnlinked(pts, eset, lim, W, H)**: min squared screen distance over on-screen pairs
  (`[-48, W+48] × [-48, H+48]`) `a<b` with `eset[a+'_'+b]` unset; returns `{A,B}` if `< lim²`.
- **stepBolts**: `cd −= 0.016`; if `cd ≤ 0` and `s.length < max`: on a hit push
  `{ax,ay,bx,by, life:0, seed: rand(T·1.7 + A.x·0.013 + B.y·0.017)·1000}` and `cd = 0.3 + rand(T·3.1)·0.7`;
  on a miss `cd = 0.08`. Advance `life += 0.016`, cull at `≥ SPARK`, else `drawBolt`.
- **drawBolt**: `p = life/SPARK`, `fs = seed + floor(life·90)`, envelope
  `env = (p < .16 ? p/.16 : 1 − (p−.16)/.84)` clamped ≥ 0, × `(.85 + .15·rand(fs+11))`.
  5-segment polyline with perpendicular jitter `(rand(fs + s·4.7 + pass·.5) − .5)·len·.3·(1 − |2t−1|)`;
  passes `[2.6, '120,146,170', .26]` then `[.9, '198,212,226', .6]` (alpha × env), round caps;
  endpoint flashes radius `1.5 + 1.5·env` `rgba(180,198,214, .45·env)`.

> Non-deterministic inputs: `W,H,dpr`, time `T`, pointer, the saved window rect, and which pairs
> drift within `lim`. Everything else is seeded, so dropping `geo.js` into a fresh canvas with the
> projection (§11.6) and passes (§11.8) reproduces the exact look.
