---
name: justified-gallery
description: |
  Configures Justified Gallery jQuery plugin for responsive image layouts on geleus.com.
  Use when: adding image galleries to posts or projects, modifying gallery options
  (row height, margins, last row behavior), loading gallery assets in HTML pages,
  or troubleshooting gallery rendering issues.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Justified Gallery

jQuery plugin (v3.7.0) vendored in `lib/justified-gallery/` that arranges images into equal-height justified rows. Initialization lives in `js/main.js:1-11` and targets `.article-gallery` containers.

**Current state:** The init code exists in `js/main.js` but NO pages currently load the plugin assets or use `.article-gallery`. The init is guarded by `if (!!$.prototype.justifiedGallery)` so it silently no-ops when the plugin JS isn't loaded.

## File Locations

| Asset | Path |
|-------|------|
| Plugin JS | `lib/justified-gallery/js/jquery.justifiedGallery.min.js` |
| Plugin CSS | `lib/justified-gallery/css/justifiedGallery.min.css` |
| Initialization | `js/main.js:1-11` (outside `$(document).ready()`) |
| Gallery target | `.article-gallery` CSS class |

## Current Initialization

```javascript
// js/main.js:1-11 — runs IMMEDIATELY, not inside $(document).ready()
if (!!$.prototype.justifiedGallery) {
  var options = {
    rowHeight: 140,
    margins: 4,
    lastRow: "justify"
  };
  $(".article-gallery").justifiedGallery(options);
}
```

## Adding a Gallery to a Page

Both the CSS and JS must be loaded. The JS must appear **after jQuery and before `js/main.js`** because the init runs immediately (not on DOM ready).

Existing post script section (from `posts/interactive-resume/index.html:329-333`):

```html
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>
<script src=/js/code-copy.js></script>
```

With gallery assets added:

```html
<!-- Add to <head> -->
<link rel="stylesheet" href="/lib/justified-gallery/css/justifiedGallery.min.css">

<!-- Script section — gallery JS inserted between jQuery and main.js -->
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/lib/justified-gallery/js/jquery.justifiedGallery.min.js></script>
<script src=/js/main.js></script>
<script src=/js/code-copy.js></script>
```

Gallery HTML in the post body:

```html
<div class="article-gallery">
  <a href="/posts/images/full-1.jpg">
    <img src="/posts/images/thumb-1.jpg" alt="Description">
  </a>
  <a href="/posts/images/full-2.jpg">
    <img src="/posts/images/thumb-2.jpg" alt="Description">
  </a>
</div>
```

## Configuration Options

| Option | Current Value | Purpose |
|--------|--------------|---------|
| `rowHeight` | `140` | Target pixel height per row |
| `margins` | `4` | Gap between images in px |
| `lastRow` | `"justify"` | Last row handling: `"justify"`, `"nojustify"`, `"left"`, `"center"`, `"right"`, `"hide"` |

## WARNING: Script Load Order

The init in `js/main.js` runs at parse time, NOT inside `$(document).ready()`. If `main.js` loads before the plugin, `$.prototype.justifiedGallery` is undefined and the guard silently skips — no errors, no gallery.

```html
<!-- BAD — gallery JS after main.js, init already ran and skipped -->
<script src=/js/main.js></script>
<script src=/lib/justified-gallery/js/jquery.justifiedGallery.min.js></script>

<!-- GOOD — gallery JS between jQuery and main.js -->
<script src=/lib/jquery/jquery.min.js></script>
<script src=/lib/justified-gallery/js/jquery.justifiedGallery.min.js></script>
<script src=/js/main.js></script>
```

## WARNING: Missing CSS Causes Invisible Images

The plugin CSS (`justifiedGallery.min.css`) sets gallery children to `opacity: 0.1` and transitions to `1.0` via `.entry-visible`. Without the CSS loaded, images stay at browser-default visibility but lose all layout positioning — they stack vertically with no justified behavior.

## See Also

- [patterns](references/patterns.md) — container markup, child elements, captions, anti-patterns
- [workflows](references/workflows.md) — step-by-step for adding galleries, config changes, troubleshooting

## Related Skills

- See the **jquery** skill for jQuery patterns and plugin guard conventions
- See the **html** skill for page structure and script loading order
- See the **css** skill for stylesheet management and hash coordination
- See the **hugo** skill for directory-per-page output convention

## Documentation Resources

> Fetch latest Justified Gallery documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "justified-gallery"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID
