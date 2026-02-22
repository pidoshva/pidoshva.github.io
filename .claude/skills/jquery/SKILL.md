---
name: jquery
description: |
  Manipulates DOM elements, handles responsive navigation, scroll behavior, and AJAX data fetching using jQuery.
  Use when: editing js/main.js, js/search.js, adding interactive behavior to pages, working with Justified Gallery plugin, modifying hamburger menu, scroll listeners, or AJAX-based search.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# jQuery in geleus.com

jQuery is the primary DOM library for this static portfolio site. It powers responsive navigation (`js/main.js`), AJAX-based search (`js/search.js`), and plugin initialization (Justified Gallery). Vendored at `lib/jquery/jquery.min.js`, loaded on every page via a `<script>` tag after `</body>`. The `js/code-copy.js` module uses vanilla JS intentionally — not all interactivity requires jQuery.

## Script Loading Order

Every HTML page loads scripts in this exact order after `</body>`:

```html
<!-- Every page -->
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>
<!-- Post pages only -->
<script src=/js/code-copy.js></script>
```

jQuery **must** load before `main.js` and `search.js`. See the **html** skill for the full page template.

## Key Concepts

| Concept | File | Example |
|---------|------|---------|
| `$(document).ready()` | `js/main.js:13` | Wraps all page-init logic |
| `$.ajax()` with XML | `js/search.js:52` | Fetches `index.xml` RSS feed for search |
| `$(window).on("scroll")` | `js/main.js:58,86` | Two handlers: nav hide/show + footer toggle |
| `.css("visibility")` toggle | `js/main.js:44` | Post desktop menu show/hide |
| `$().map().get()` | `js/search.js:57` | Transforms XML nodes to plain JS objects |
| Plugin prototype guard | `js/main.js:4` | `!!$.prototype.justifiedGallery` before init |
| Inline `onclick` handlers | Post HTML templates | `$('#nav-footer').toggle()`, scroll-to-top |

## Inline jQuery in HTML

Post pages use inline `onclick` attributes that call jQuery directly:

```html
<!-- posts/*/index.html — footer action buttons -->
<a id="menu-toggle" onclick="$('#nav-footer').toggle();return false;">Menu</a>
<a id="toc-toggle" onclick="$('#toc-footer').toggle();return false;">TOC</a>
<a id="share-toggle" onclick="$('#share-footer').toggle();return false;">Share</a>
<a id="top" onclick="$('html, body').animate({ scrollTop: 0 }, 'fast');">Top</a>
```

These depend on jQuery being loaded. If jQuery fails to load, these buttons silently break.

## Three Navigation Contexts

| Context | Elements | File/Location | Behavior |
|---------|----------|---------------|----------|
| Site-wide | `#header > #nav` | `js/main.js:18` | Hamburger toggle via `.responsive` class |
| Post desktop | `#menu`, `#menu-icon` | `js/main.js:27-78` | Visibility toggle + scroll-based hide |
| Post mobile | `#footer-post`, `#actions-footer` | `js/main.js:84-111` | Show on upscroll, hide on downscroll |

## Quick Patterns

### Page-Specific Feature Guard

```javascript
// js/main.js — only run on pages with .post element
if ($(".post").length) {
  var menu = $("#menu");
  var nav = $("#menu > #nav");
  var menuIcon = $("#menu-icon, #menu-icon-tablet");
  // ... post-specific logic
}
```

### Plugin Init with Prototype Check

```javascript
// js/main.js:4-11 — runs before $(document).ready()
if (!!$.prototype.justifiedGallery) {
  $(".article-gallery").justifiedGallery({ rowHeight: 140, margins: 4, lastRow: "justify" });
}
```

## See Also

- [patterns](references/patterns.md) — DOM selection, event handling, AJAX, anti-patterns
- [workflows](references/workflows.md) — adding features, modifying nav, adding plugins

## Related Skills

- See the **javascript** skill for vanilla JS patterns used in `js/code-copy.js`
- See the **justified-gallery** skill for the image gallery jQuery plugin
- See the **html** skill for page structure and script tag placement
- See the **css** skill for styling the elements jQuery manipulates

## Documentation Resources

> Fetch latest jQuery documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "jquery"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Recommended Queries:**
- "jquery ajax"
- "jquery event handling"
- "jquery scroll events"
