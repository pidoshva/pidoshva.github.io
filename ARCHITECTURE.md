# geleus.com — Architecture

In-depth reference for editing and extending the site. For a quick orientation read
[`CLAUDE.md`](CLAUDE.md); this file is the deep dive. Everything here reflects the
**spatial rebuild** (June 2026): the homepage is now a single interactive 3D node
cluster, and the old multi-page layout survives only as fallback pages.

---

## 1. Mental model

- **`/` (homepage)** is a self-contained **app**: a full-viewport `<canvas>` rendering
  one cluster of 48 nodes. The cluster **morphs into a different shape per section**,
  and content opens in a right-hand **drawer** (about/goodies/blog) or a **full-screen
  overlay** (journal, blog posts, repo READMEs). Driven entirely by `js/spatial.js`.
- **`/goodies/`, `/blog/`, `/blog/post.html`** are **fallback pages** — normal scrolling
  HTML kept for deep links, bookmarks, and SEO. They use `js/cluster.js` as an animated
  *background* (not interactive). They are what crawlers and no-JS visitors get.
- **Content is real HTML/Markdown**, fetched at runtime and injected into root elements
  by small per-feature modules (`goodies.js`, `blog.js`, `summary.js`, `contributions.js`,
  `profile.js`). The homepage app and the fallback pages **share these same modules**.
- **No framework, no build step.** Hand-written HTML/CSS/JS served straight off GitHub
  Pages from `main`. All JS is in IIFEs; shared globals live under `window.GELEUS`.

```
visitor → / ─────────────► index.html + spatial.js (the app)
                              ├─ drawer pages   → goodies.js / blog.js inject into #repo-root / #blog-list-root
                              ├─ journal overlay → summary.js + contributions.js inject into #summary-root / #contrib-root
                              └─ post/readme overlay → window.GELEUS.loadPost / loadReadme
visitor → /goodies/ etc ──► fallback page + cluster.js background + same modules
weekly cron ─────────────► scripts/weekly-summary.py → data/weekly-summaries.json (committed by bot)
```

---

## 2. File map

```
pidoshva.github.io/
├── index.html                 # THE APP (spatial homepage)
├── goodies/index.html         # fallback page (repo cards)
├── blog/index.html            # fallback page (post list)
├── blog/post.html             # fallback page (single post reader, ?slug=)
├── blog/posts.json            # blog post metadata (index)
├── blog/posts/*.md            # blog post bodies (Markdown)
├── css/styles.css             # ALL styles (single file, CSS variables, no preprocessor)
├── js/
│   ├── spatial.js             # ★ homepage app: cluster engine + nav + overlays
│   ├── cluster.js             # animated background for fallback pages (per-page shape)
│   ├── topo.js                # LEGACY background (kept, unused — safe to ignore)
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
| `canvas#spatialCanvas` | render target |
| `.hud-top > .brand` | "geleus" wordmark (links to `/`) |
| `.hud-nav button[data-node="…"]` | nav buttons; `data-node` ∈ `home,about,goodies,blog,resume` |
| `#readout` + `#rNodes/#rEdges/#rYaw/#rPit/#rEffect/#rEffectD` | live HUD readout (desktop only) |
| `.hero-id.hero` → `h1`, `.role-line` | identity block. `.hero h1` is synced by `profile.js` |
| `#journalTrigger` | top-center arrow → opens journal overlay |
| `#panel` | right drawer; gets `.open` class |
| `.drawer-page[data-page="about\|goodies\|blog"]` | drawer sections (only the active one is shown) |
| `#repo-root` / `#blog-list-root` | injection roots inside the goodies/blog drawer pages |
| `#journalOverlay` + `#journalClose` | full-screen journal overlay; `.open` toggles |
| `#summary-root` / `#contrib-root` | journal content (tree + heatmap), inside the journal overlay |
| `#postOverlay` + `#postClose` + `#post-overlay-content` | full-screen reader for blog posts AND repo READMEs |
| `#contrib-tooltip` | hover tooltip used by `contributions.js` |

**Script load order** (matters — `lang-colors` before `goodies`; `marked`+`hljs` before
`blog`/`goodies` so Markdown + highlighting are available):
`spatial.js → lang-colors.js → marked → hljs → goodies.js → blog.js → summary.js → contributions.js → profile.js`.
`nav.js` is **not** loaded here.

### 3.2 The engine (`js/spatial.js`, ~vanilla IIFE)

**Geometry.** A fixed set of `N = 48` nodes. Each "shape" is just a list of `N` target
positions plus a nearest-neighbour edge list (`knn(pos, k)`):

| Shape key | Builder | k | `desc` | Used by |
|---|---|---|---|---|
| `home` | `clusterPos()` — chaotic ball | 3 | cluster | home node |
| `about` | `helixPos()` — double helix | 2 | helix | about node |
| `goodies` | `latticePos()` — 4×4×3 cube | 3 | lattice | goodies node |
| `blog` | `wavePos(t)` — 8×6 undulating field (`dynamic:true`, recomputed each frame) | 3 | field | blog node |

`SHAPES = { home, about, goodies, blog }`. (There is **no** `resume`/`journal` shape —
see below.) To add a section shape, add a builder + a `SHAPES` entry (see Cookbook §9).

**Labeled page-nodes.** `PAGE_LIST` pins each clickable label to a *fixed node index* so
the label rides the morph:
```js
PAGE_LIST = [ ['home',3], ['about',12], ['goodies',22], ['blog',33], ['resume',43] ]
RESUME_URL = 'https://geleus.io/'   // resume is an EXTERNAL link, not a shape/drawer
```

**Render loop** (`draw()`, via `requestAnimationFrame`):
1. auto-rotate yaw (home only, when not dragging/hovering) and ease `yaw/pitch/camShiftX/zoom` toward targets;
2. if mid-morph, lerp `posCur` from `fromPos`→`toPos` with `easeIO`; blog re-derives `wavePos(T)` each frame once settled;
3. draw pre-rendered backdrop (`buildBg`), then the dim parallax **BGFIELD** (78 nodes), then cluster edges (cross-faded during a morph), then **pulses** travelling along edges, then depth-sorted nodes, then the 5 labeled page-nodes (glow + text);
4. update the `#readout`.

**Projection** is hand-rolled: rotate by yaw/pitch, perspective-divide by `CAM`, scale by
`min(W,H) * sf` where `sf = W<700 ? 0.46 : 0.33`.

**Tunable constants** (top of file unless noted):

| Constant | Default | Effect |
|---|---|---|
| `N` | 48 | node count (all shapes must return N points) |
| `CAM` | 3.2 | camera distance (smaller = more perspective) |
| `sf` | 0.46 / 0.33 | cluster scale on mobile / desktop |
| auto-rotate | `tgtYaw += 0.0045` | idle spin speed (home only) |
| morph speed | `morphT += 0.024` | reshape duration (~per frame) |
| `BGFIELD` count | 78 | background field density |
| field alpha | edges `0.05+fn*0.09`, nodes `0.08+fn*0.2` | background visibility |
| pulse | `T*0.55 + e*0.1973` phase; alpha `0.3+nr*0.55` | energy dots brightness/speed |
| drawer shift | `tgtShiftX = -W*0.18` (desktop), `tgtZoom = 1.1` | how far the cluster slides when a drawer opens |
| hover pick | squared-dist `< 460` | click target radius for page-nodes |

### 3.3 Navigation, routing, overlays

- **`goPage(key)`** is the single entry point for navigation. `resume` → `window.open(RESUME_URL)`
  and returns (no morph). Otherwise → `applyState(key)` + `history.pushState('#'+key)`.
- **`applyState(key)`** morphs the cluster (`setShape`), highlights the nav button, and
  opens/closes the drawer (`#panel.open`, shifts the camera on desktop).
- **Deep links / history:** on load `keyFromHash()` reads `location.hash` (`#goodies`, `#about`,
  …); `popstate` re-applies on back/forward; `#journal` auto-opens the journal overlay.
- **Triggers:** top nav buttons, **clicking a labeled node in the cluster** (pointer-up with
  little movement → `goPage(hoveredPage)`), the journal arrow, and `Esc`/backdrop/close-chevron
  to dismiss overlays. `Esc` precedence: post overlay → journal overlay → back to home.
- **Journal** is a full-screen overlay (NOT a node or drawer). The top-center `#journalTrigger`
  opens `#journalOverlay`, which contains the weekly-summary tree **and** the contributions
  heatmap at the bottom. (This is why journal/contributions are not in `PAGE_LIST`.)
- **Blog posts & repo READMEs** open in the shared `#postOverlay`. `spatial.js` intercepts
  clicks inside `#panel`:
  - `.repo-expand-btn` → **capture phase** + `stopPropagation` (so `goodies.js`'s own inline
    handler does NOT also fire) → `openReadme(repo, branch)` → `window.GELEUS.loadReadme(...)`.
  - `.blog-card` → `openPost(slug)` → `window.GELEUS.loadPost(slug, ...)`; falls back to
    navigating to `/blog/post.html?slug=` if the hook is unavailable.
- **Accessibility / motion:** `prefers-reduced-motion` freezes time `T`, forces `morphT=1`,
  and disables pulses + auto-rotate (single static frame); overlays still open.

---

## 4. CSS (`css/styles.css`, single file)

- **Scoping:** all spatial-app rules are under **`body.spatial`** (set on `index.html` only),
  so the fallback pages are untouched. `body.spatial` is `height:100vh; overflow:hidden`
  (the app doesn't scroll; the drawer and overlays scroll internally).
- **Design tokens** in `:root` (charcoal/grey/moss): `--bg #1a1c1b`, `--surface #232624`,
  `--text #e6e8e4`, `--text-dim #9aa09a`, `--moss #8faf78`, `--moss-bright #a8c891`,
  `--border`/`--border-2`, fonts `--font-sans` / `--font-mono` (JetBrains Mono). Contribution
  ramp `--contrib-0..4` (moss scale). **The canvas palette is inlined as `rgba()` in `spatial.js`
  / `cluster.js` and must be kept in sync with these by hand.**
- **Key classes:** `.hud-top`/`.hud-nav` (fixed top bar), `.hud-corner` (readout, hidden ≤720px),
  `.hero-id` (fixed bottom-left identity), `.journal-trigger` (top-center pill), `.panel`+`.drawer-*`
  (right drawer), `.journal-overlay`/`.journal-overlay-inner`/`.journal-close`/`.journal-head`/`.journal-contrib`
  (full-screen overlays — `#postOverlay` reuses `.journal-overlay`).
- **Overlay backdrop:** `.journal-overlay { background: rgba(12,14,13,.95); backdrop-filter: blur(22px) }`
  — near-opaque on purpose (earlier 0.62 let background text bleed through and overlap the title).
- **Mobile (`@media max-width:640px`):** `.hud-top` becomes `display:block` so the nav wraps onto
  its own line under the brand (nav dots hidden to save width); the drawer goes **full-width and
  more translucent** (`.panel { width:100%; background: rgba(16,18,17,.58) }`) so the cluster shows
  through. Further tightening at `max-width:360px`.
- Drawer content reuses existing component styles (`.repo-card/.blog-card/.timeline-tree/.contrib-*`).

---

## 5. Content modules & their contracts

Each module is an IIFE that finds its root element and renders into it. They run on every
page that contains their root — that's how the **same** code serves the app drawers/overlays
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
pages. They set `<body data-shape="…">` and load `js/cluster.js`, which injects a fixed
full-viewport background canvas (class `.topo-bg`, `z-index:-1`, `pointer-events:none`) that:
renders the per-page shape (`goodies`→lattice, `blog`→field, post→`lab` knot), flows pulses,
has a deep field, and **fades on scroll** so text stays readable. `cluster.js` is a slimmed,
non-interactive cousin of `spatial.js` (it has its own copy of the shape builders + `knn`).
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
`prs[]` (with `org`/`state`), `repo_orgs`, `repo_languages`, `languages[]`, and `stats
{commits,prs,repos_active}`. Rendered by `summary.js`.

`scripts/weekly-summary.py`: pulls the week's commits + PRs from the GitHub API (matching by
login **or** known emails in `USER_EMAILS`), sends them to **Claude Haiku** for a short
summary + highlights, backfills any missing weeks, folds in `data/notes.md` (then clears it),
and writes the JSON. Env: `ANTHROPIC_API_KEY` (required), `GH_PAT` (higher rate limits / SSO
for org repos), `TRIGGER`. `.github/workflows/weekly-summary.yml` runs it **Saturday ~5am UTC**
and on manual dispatch, committing as `geleus-bot`. Pushing code does **not** refresh the
journal — run `gh workflow run weekly-summary.yml` or wait for the cron.

---

## 8. Conventions

- **Cache-busting (important):** browsers cache JS/CSS hard. Every versioned asset is linked
  with `?v=N` in the HTML. **Bump `N` whenever you edit that file**, or stale assets get
  served (this caused repeated "still broken" reports). Bump across every HTML file that
  references the asset. Current snapshot (will drift — treat the *rule* as the source of truth):
  `styles.css?v=23`, `spatial.js?v=6`, `goodies.js?v=2`, `blog.js?v=3`, `contributions.js?v=8`,
  `cluster.js?v=9` (fallback pages). `summary.js`, `profile.js`, `lang-colors.js`, `nav.js`,
  and `lib/*` are currently unversioned. Blog **content** (`.md`/`.json`) is handled by the
  `cache:'no-cache'` fetch instead of a version query.
- **localStorage keys** (clear to force a refresh): `geleus_repos`, `geleus_contrib`, `geleus_profile`.
- **JS style:** every file is an IIFE; no globals except the `window.GELEUS` namespace;
  `camelCase`; `getElementById`/`querySelector`. HTML-escape any user/API content.
- **No build step.** Edit → bump `?v=` → commit → push to `main` → GitHub Pages deploys.
- **Canvas palette** is duplicated as literals in `spatial.js`/`cluster.js`; keep it in sync
  with `:root` if you change colors.

---

## 9. Cookbook — how to edit common things

**Add a blog post**
1. Create `blog/posts/<slug>.md` (body only; no need for an `# H1` — the reader shows the title).
2. Prepend an entry to `blog/posts.json` (`slug`, `title`, `date`, `excerpt`, `tags`, `draft:false`).
3. Commit + push. No version bump needed (content uses `no-cache`). It appears in the blog
   drawer/list and opens in the full-screen reader.

**Change the tagline / identity**
- Edit `.role-line` / `h1` in `index.html`. Note `profile.js` overwrites `.hero h1` from GitHub —
  keep the tagline as `.role-line` (not `.bio`) so it isn't overwritten.

**Add a nav item / section to the app**
1. Add `<button data-node="X">X</button>` to `.hud-nav` in `index.html`.
2. Add a `<section class="drawer-page" data-page="X">…</section>` in `#panel` (include a root
   element if a module should fill it).
3. In `spatial.js`: add a shape builder + `SHAPES.X = {pos, edges: knn(pos,k), desc}` and add
   `['X', <index>]` to `PAGE_LIST` (pick an unused node index 0–47).
4. Bump `spatial.js?v=` and `styles.css?v=` if you touched CSS.

**Add an external link node (like resume)** — add the button/`PAGE_LIST` entry, then special-case
it in `goPage()` like `resume` (open a URL and return early; no `SHAPES` entry needed).

**Retune the look** — edit the constants in §3.2: cluster density (`N`), spin (`0.0045`), morph
speed (`0.024`), background visibility (field alphas), pulses, drawer slide (`-W*0.18`). Bump `spatial.js?v=`.

**Change colors** — edit `:root` tokens in `css/styles.css` AND the inlined `rgba()` literals in
`spatial.js`/`cluster.js`. Bump `styles.css?v=` (and the JS versions).

**Edit a fallback page's background shape** — change `<body data-shape="…">` (`home/about/goodies/blog/lab`)
in that page; shapes are defined in `cluster.js`.

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
- **Smoke check after changes:** home cluster spins + drags; each nav node morphs + opens its
  drawer with live content; the journal arrow opens the overlay (tree + heatmap); a blog card
  and a repo "readme" each open the full-screen reader; `Esc`/back work; fallback pages still load.
