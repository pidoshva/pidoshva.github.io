# Asset Modules & Loading Reference

## Contents
- Script Loading Order
- Font Preloading
- External Services
- Vendored Library Map

## Script Loading Order

Scripts load at the end of `<body>` in a strict dependency order. Breaking this
order causes `$ is not defined` errors. See the **jquery** skill for `main.js` internals.

**All pages (end of `<body>`):**
```html
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>
```

**Post pages append after `main.js`:**
```html
<script src=/js/code-copy.js></script>
```

Dependency chain:

| Module | Path | Depends On | Loaded On |
|--------|------|------------|-----------|
| Font Awesome CSS | `/lib/font-awesome/css/all.min.css` | nothing | all pages |
| jQuery | `/lib/jquery/jquery.min.js` | nothing | all pages |
| main.js | `/js/main.js` | jQuery | all pages |
| code-copy.js | `/js/code-copy.js` | nothing (vanilla JS) | post pages only |
| search.js | `/js/search.js` | jQuery | loaded dynamically |

`code-copy.js` is vanilla JS (no jQuery dependency). It adds copy buttons to all
`<pre><code>` blocks using `navigator.clipboard.writeText()`. The **jquery** skill
documents the `main.js` hamburger menu and scroll behavior.

## Font Preloading

Four fonts are preloaded in `<head>` on every page to prevent render-blocking FOIT:

```html
<link rel="preload" href="/lib/font-awesome/webfonts/fa-brands-400.woff2"
      as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/lib/font-awesome/webfonts/fa-regular-400.woff2"
      as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/lib/font-awesome/webfonts/fa-solid-900.woff2"
      as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/lib/JetBrainsMono/web/woff2/JetBrainsMono-Regular.woff2"
      as="font" type="font/woff2" crossorigin="anonymous">
```

`crossorigin="anonymous"` is required on all font preloads — without it, the browser
fetches the font twice (once for preload, once for actual use by CSS `@font-face`).
See the **font-awesome** skill for icon class usage and the **css** skill for
JetBrains Mono code block styling.

## External Services

Two external services load in `<head>` on every page:

```html
<script type="text/javascript" src="https://latest.cactus.chat/cactus.js"></script>
<link rel="stylesheet" href="https://latest.cactus.chat/style.css" type="text/css">
```

Cactus Chat (Matrix-based comments) loads asynchronously and does not block rendering.
No local fallback exists — if the CDN is unreachable, comments silently fail to appear.

## Vendored Library Map

All third-party code lives in `/lib/`. NEVER modify vendored files directly — update
by replacing entire directories with newer upstream versions.

```
lib/
├── clipboard/                          # clipboard.min.js
├── font-awesome/                       # v5.x icon library
│   ├── css/all.min.css                 # loaded at end of <body>
│   └── webfonts/                       # woff, woff2, eot, ttf, svg
├── JetBrainsMono/                      # monospace code font
│   └── web/woff2/JetBrainsMono-Regular.woff2
├── jquery/                             # jQuery core
│   └── jquery.min.js                   # loaded before all custom scripts
└── justified-gallery/                  # image gallery jQuery plugin
    ├── jquery.justifiedGallery.min.js  # initialized in main.js on .article-gallery
    └── justifiedGallery.min.css
```

See the **justified-gallery** skill for gallery initialization. The gallery plugin
is loaded conditionally by `main.js` only when `.article-gallery` elements exist on
the page.

### WARNING: Patching Vendored Libraries

Editing files inside `/lib/` directly (e.g., fixing a jQuery plugin bug) creates
invisible tech debt. The next library update silently overwrites your patch with no
merge conflict or warning.

**The Fix:** Create a separate override file (e.g., `/js/gallery-overrides.js`) loaded
after the vendored script. For actual bugs, upgrade to a version that includes the fix.
