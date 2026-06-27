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

---

## 11. Appendix — exact geometry & math (replication spec)

Everything needed to reproduce the node animation **100%**, transcribed verbatim from
`js/spatial.js` (homepage app) and `js/cluster.js` (fallback-page background). The two files
share identical primitives, shape builders, `knn`, projection, and render math; they differ
only in interaction (app) vs. scroll-fade (background) and a couple of constants (noted in
§11.10). All canvas coordinates are in **CSS pixels** (the context is pre-scaled by `dpr` via
`ctx.setTransform(dpr,0,0,dpr,0,0)`); `dpr = min(devicePixelRatio, 2)`.

### 11.1 Global constants
```js
CAM = 3.2          // camera distance (perspective)
N   = 48           // node count — every shape MUST return exactly 48 points
T   = 0            // global time; T += 0.016 per frame (frozen under prefers-reduced-motion)
```

### 11.2 Primitives (shared, verbatim)
```js
// deterministic hash → pseudo-random in [0,1); same seed ⇒ same value (stable layouts)
function rand(s){ var x = Math.sin(s*127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// cubic ease in/out, used for both morph progress and edge crossfade
function easeIO(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

function lerp(a,b,t){ return a + (b-a)*t; }

// rotated-z (depth) → near-camera brightness factor in [0,1]
function nearOf(z){ var n = 1 - (z+1)/2.4; return n < 0 ? 0 : (n > 1 ? 1 : n); }
```

### 11.3 Shape builders (verbatim — each returns N=48 `{x,y,z}`)
The point set is **deterministic** (seeded `rand`), so the layout is identical every load.
```js
// home — chaotic ball: cube-root radius ≈ uniform volume density, anisotropic scale + jitter
function clusterPos(){
  var p=[];
  for(var i=0;i<N;i++){
    var r=Math.cbrt(rand(i*5+1))*1.0,
        a=rand(i*5+2)*6.2832,            // azimuth 0..2π
        b=Math.acos(2*rand(i*5+3)-1);    // inclination (uniform on sphere)
    var x=r*Math.sin(b)*Math.cos(a)*1.3, // x stretched ×1.3
        y=r*Math.cos(b)*0.85,            // y squashed ×0.85
        z=r*Math.sin(b)*Math.sin(a)*1.1; // z ×1.1
    x+=(rand(i*5+4)-0.5)*0.3; y+=(rand(i*5+5)-0.5)*0.3;  // ±0.15 jitter
    p.push({x:x,y:y,z:z});
  }
  return p;
}

// about — double helix: 24 pairs, 2.3 turns, height 1.95, radius 0.52, strands π apart
function helixPos(){
  var p=[], pairs=N/2;                    // 24
  for(var k=0;k<pairs;k++){
    var tt=k/(pairs-1), a=tt*Math.PI*2*2.3, y=(tt-0.5)*1.95, r=0.52;
    p.push({x:r*Math.cos(a),         y:y, z:r*Math.sin(a)});
    p.push({x:r*Math.cos(a+Math.PI), y:y, z:r*Math.sin(a+Math.PI)});
  }
  return p;
}

// goodies — 4×4×3 cube lattice, spans x,y = 1.55, z = 1.25, centered at origin
function latticePos(){
  var p=[], nx=4, ny=4, nz=3;
  for(var x=0;x<nx;x++) for(var y=0;y<ny;y++) for(var z=0;z<nz;z++)
    p.push({ x:(x/(nx-1)-0.5)*1.55, y:(y/(ny-1)-0.5)*1.55, z:(z/(nz-1)-0.5)*1.25 });
  return p;
}

// blog — 8×6 undulating field; y animates with time t (call with t=T each frame)
function wavePos(t){
  var p=[], nx=8, nz=6;
  for(var i=0;i<nx;i++) for(var j=0;j<nz;j++){
    var x=(i/(nx-1)-0.5)*1.95, z=(j/(nz-1)-0.5)*1.5;
    p.push({ x:x, y:Math.sin(x*3+t*1.6)*0.24 + Math.cos(z*3+t*1.2)*0.24, z:z });
  }
  return p;
}

// fallback /blog/post.html only (cluster.js) — (p,q)=(2,3) torus knot
function knotPos(){
  var p=[], pp=2, qq=3;
  for(var i=0;i<N;i++){
    var u=i/N*Math.PI*2, r=0.5*(2+Math.cos(qq*u));
    p.push({ x:r*Math.cos(pp*u)*0.6, y:r*Math.sin(pp*u)*0.6, z:0.58*Math.sin(qq*u) });
  }
  return p;
}
```

### 11.4 Edge graph — `knn` (verbatim)
For each node, connect to its `k` nearest neighbours by squared distance; undirected edges are
de-duplicated by a `lo_hi` key. Returns `[[lo,hi], …]`.
```js
function knn(pos,k){
  var edges=[], seen={};
  for(var a=0;a<pos.length;a++){
    var d=[];
    for(var b=0;b<pos.length;b++){ if(a===b) continue;
      var dx=pos[a].x-pos[b].x, dy=pos[a].y-pos[b].y, dz=pos[a].z-pos[b].z;
      d.push({b:b, dd:dx*dx+dy*dy+dz*dz});
    }
    d.sort(function(p,q){return p.dd-q.dd;});
    for(var e=0;e<k;e++){ var bi=d[e].b, lo=Math.min(a,bi), hi=Math.max(a,bi), key=lo+'_'+hi;
      if(!seen[key]){ seen[key]=1; edges.push([lo,hi]); } }
  }
  return edges;
}
```
**`k` per shape:** home `knn(c,3)`, about `knn(h,2)`, goodies `knn(g,3)`, blog `knn(w,3)`,
lab/knot `knn(k,2)` (cluster.js), background field `knn(BGFIELD,1)`.

### 11.5 Background parallax field (verbatim)
78 points on a spherical shell (radius `1.5 + 1.7·cbrt(u)`), wired with `k=1`:
```js
BGFIELD = (function(){
  var p=[];
  for(var i=0;i<78;i++){
    var u=rand(i+7), v=rand(i+77), w=rand(i+777);
    var r=1.5+1.7*Math.cbrt(u), a=v*6.2832, b=Math.acos(2*w-1);
    p.push({ x:r*Math.sin(b)*Math.cos(a), y:r*Math.cos(b), z:r*Math.sin(b)*Math.sin(a) });
  }
  return p;
})();
BGEDGES = knn(BGFIELD, 1);
```
It is rotated on its own slow camera and rendered dim, **behind** the cluster (see §11.8).

### 11.6 Rotation + perspective projection (verbatim)
```js
// yaw about the Y axis, then pitch about the X axis
function rotP(p, yaw, pitch){
  var c=Math.cos(yaw), s=Math.sin(yaw), x1=p.x*c - p.z*s, z1=p.x*s + p.z*c;
  var cp=Math.cos(pitch), sp=Math.sin(pitch);
  return { x:x1, y:p.y*cp - z1*sp, z:p.y*sp + z1*cp };
}
```
Screen mapping for a rotated point `r`:
```
f      = CAM / (CAM + r.z)                 // perspective divide
scale  = min(W,H) * sf * zoom              // sf = (W < 700 ? 0.46 : 0.33)
screenX = cx + r.x * f * scale             // cx = W/2 + camShiftX   (camShiftX = 0 in cluster.js)
screenY = cy + r.y * f * scale             // cy = H/2
```
Background field uses a separate, pushed-back camera: `fcamF = 5`, `ff = fcamF/(fcamF + r.z)`,
`fbs = min(W,H)*0.52`, rotated by `fby = T*0.03` (yaw) and `fbp = -0.18` (pitch).

### 11.7 Morph + dynamic blog (verbatim logic)
On `setShape(key)`: `fromPos = clone(posCur)`, `toPos = SHAPES[key].pos`, `morphT = 0`.
Each frame:
```js
if (morphT < 1){
  morphT = Math.min(1, morphT + 0.024);     // 0.022 in cluster.js
  var e = easeIO(morphT);
  for (i) posCur[i] = lerp(fromPos[i], toPos[i], e);  // per-axis
} else if (curKey === 'blog' && !reduced){
  posCur = wavePos(T);                       // live field once settled
}
// edge crossfade during a morph:
var me = morphT < 1 ? easeIO(morphT) : 1;
drawEdges(fromEdges, alpha*(1-me));          // only while morphT < 1
drawEdges(toEdges,   alpha*me);
```

### 11.8 Render pipeline (exact draw math, per frame)
Order: clear → backdrop image → background field → cluster edges → pulses → nodes → (app) labels.

- **Backdrop** `buildBg()` (pre-rendered once per resize): vertical linear gradient
  `#0f1110 → #0a0b0a`; radial vignette from `(0.5W, 0.42H, r=min(W,H)·0.18)` to
  `(0.5W, 0.5H, r=max(W,H)·0.78)`, `rgba(0,0,0,0) → rgba(0,0,0,0.5)`.
- **Background field** per node depth `fn = 1 - (z+3.2)/6.4` (clamped ≥0):
  edges `rgba(133,148,133, 0.05+fn·0.09)` (cluster.js: `rgba(124,132,124, 0.02+fn·0.04)`),
  nodes radius `0.9+fn·1.5` `rgba(143,175,120, 0.08+fn·0.2)` (cluster.js: `0.8+fn·1.3`, `0.04+fn·0.13`).
- **Cluster edges** per edge `nr = nearOf((zA+zB)/2)`:
  `lineWidth = 0.7 + nr·1.4`, stroke `rgba(143,175,120, (0.1 + nr·0.5)·aMul)`.
- **Pulses** (skipped under reduced motion) per edge index `e`:
  `ph = (T·0.55 + e·0.1973) mod 1`; point `= lerp(A, B, ph)`;
  `nr = nearOf(zA + (zB-zA)·ph)`; radius `1.1 + nr·1.7`;
  fill `rgba(224,236,210, (0.3 + nr·0.55)·me)` (cluster.js omits the `·me`).
- **Nodes** drawn far→near (sort by `z` descending): `nr = nearOf(z)`, `r = 1.7 + nr·2.6`;
  if `nr > 0.62` a radial glow of radius `r·3` `rgba(168,200,145, 0.22·nr → 0)`;
  core `rgba(168,200,145, 0.42 + nr·0.55)`.
- **Labeled page-nodes** (app only): for each `PAGE_LIST` node, `rr = 3 + nr·2.4`;
  glow radius `rr·3.4` `rgba(168,200,145, 0.32+0.3·nr → 0)`; white core `rgba(224,236,210,1)` radius `rr`;
  if active, ring stroke at `rr+5` `rgba(168,200,145,0.9)` width 1.4; label text
  `${(11.5+nr·2)}px ui-monospace…` `rgba(230,232,228, active?0.98:0.5+nr·0.4)` at `(x+rr+5, y+3.5)`.
  Hover pick = nearest page node with squared screen distance `< 460`.

### 11.9 Camera dynamics & input (app, `spatial.js`)
```
initial:        yaw = 0.6, pitch = -0.3
auto-rotate:    if home & !dragging & !hovering:  tgtYaw += 0.0045   (per frame)
easing:         yaw   += (tgtYaw   - yaw)   * 0.07
                pitch += (tgtPitch - pitch) * 0.07
                camShiftX += (tgtShiftX - camShiftX) * 0.09
                zoom      += (tgtZoom    - zoom)      * 0.09
drag:           tgtYaw   += dx * 0.006
                tgtPitch  = clamp(tgtPitch + dy*0.006, -1.2, 1.2)
tap vs drag:    treat as a click (open hovered node / go home) if total moved < 6 px
drawer open:    tgtShiftX = (W > 760 ? -W*0.18 : 0);  tgtZoom = 1.1   (else 0 / 1.0)
```
`cluster.js` (background) has **no input**: constant `pitch = -0.3`, `yaw += 0.0045` per frame.

### 11.10 `spatial.js` vs `cluster.js` — the only differences
| | `spatial.js` (homepage app) | `cluster.js` (fallback background) |
|---|---|---|
| Shapes | home, about, goodies, blog | home, about, goodies, blog, **lab=knot** |
| Interaction | drag-rotate, click nodes, drawers, overlays | none (decorative) |
| Camera | eased yaw/pitch/shift/zoom + auto-rotate | fixed pitch −0.3, constant yaw spin |
| Morph step | `morphT += 0.024` | `morphT += 0.022` (cluster→page on load) |
| Page select | `PAGE_LIST` + `#hash` routing | `<body data-shape>` |
| Pulse alpha | `×me` (morph-aware) | no `me` factor |
| Field colors | `rgba(133,148,133,…)`/brighter | `rgba(124,132,124,…)`/dimmer |
| Visibility | full-screen `<canvas id=spatialCanvas>` | injected fixed `.topo-bg`, `z-index:-1`, **scroll-fade** |
| Scroll fade | n/a | `opacity = top - (top-min)·min(1, scrollY/dist)`; home `top1.0,min0.12,dist560`; others `top0.22,min0.08,dist260` |

### 11.11 Per-page mapping (the tech behind each page's nodes)
| Page | Engine | shape key / `data-shape` | Builder | k | Motion |
|---|---|---|---|---|---|
| `/` home | spatial.js | `home` | `clusterPos` | 3 | auto-rotate + pulses + parallax field |
| `/#about` | spatial.js | `about` | `helixPos` | 2 | morph-in + pulses (spins via drag) |
| `/#goodies` | spatial.js | `goodies` | `latticePos` | 3 | morph-in + pulses |
| `/#blog` | spatial.js | `blog` | `wavePos(T)` | 3 | live undulating field + pulses |
| `/goodies/` | cluster.js | `goodies` | `latticePos` | 3 | background spin + pulses + scroll-fade |
| `/blog/` | cluster.js | `blog` | `wavePos(T)` | 3 | live field + scroll-fade |
| `/blog/post.html` | cluster.js | `lab` | `knotPos` | 2 | background spin + pulses + scroll-fade |

> Replication note: because every position comes from the seeded `rand` and fixed builders,
> dropping these functions into a fresh `<canvas>` with the projection (§11.6) and render
> (§11.8) reproduces the exact look. The only non-deterministic inputs are viewport size
> (`W,H,dpr`), time `T`, and user drag.
