---
name: font-awesome
description: |
  Manages Font Awesome 5.15.0 Free icon system vendored in lib/font-awesome/.
  Use when: adding, changing, or removing icons from HTML pages, fixing icon
  rendering issues, updating icon accessibility attributes, working with social
  sharing buttons, or modifying navigation icons (hamburger menu, chevrons,
  back-to-top).
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Font Awesome Skill

Font Awesome 5.15.0 Free is vendored at `lib/font-awesome/` with CSS at
`lib/font-awesome/css/all.min.css` and webfonts at `lib/font-awesome/webfonts/`.
Only two icon families are used: **Solid** (`fas`) for UI icons and **Brands** (`fab`)
for platform logos. No `far` (regular) icons exist in the markup. Icons are purely
declarative HTML — no JavaScript rendering, no CSS pseudo-element icons.

## Quick Start

### Standalone Icon Link

```html
<a class="icon" target="_blank" rel="noopener" href="https://github.com/pidoshva/" aria-label="github">
  <i class="fab fa-github" aria-hidden="true"></i>
</a>
```

### Icon with Size Modifier (Post Pages)

```html
<i class="fas fa-bars fa-lg" aria-hidden="true"></i>
```

## Loading Pattern (Every HTML Page)

Three woff2 fonts preloaded in `<head>`, stylesheet at bottom of `<body>`:

```html
<!-- In <head> — all pages -->
<link rel="preload" href="/lib/font-awesome/webfonts/fa-brands-400.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/lib/font-awesome/webfonts/fa-regular-400.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="/lib/font-awesome/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin="anonymous">

<!-- Bottom of <body>, before jQuery and js/main.js -->
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
```

Note: the stylesheet `href` is unquoted in all HTML files — a Hugo template artifact.

## Icon Inventory

**17 unique icons** across 30+ HTML files:

| Icon | Class | Where Used |
|------|-------|------------|
| Hamburger menu | `fas fa-bars` | All pages (nav header) |
| Back to top | `fas fa-chevron-up` | Post pages (`#actions`, `#actions-footer`) |
| Previous post | `fas fa-chevron-left` | Post pages (`#actions` sidebar) |
| Next post | `fas fa-chevron-right` | Post pages (`#actions` sidebar) |
| Email | `fas fa-envelope` | `index.html` social + post share panels |
| Share toggle | `fas fa-share-alt` | Post pages (`#actions`, `#actions-footer`) |
| TOC toggle | `fas fa-list` | Post pages (`#actions-footer`) |
| GitHub | `fab fa-github` | `index.html` social links |
| Instagram | `fab fa-instagram` | `index.html` social links |
| Facebook | `fab fa-facebook` | Post share panels (`#share`, `#share-footer`) |
| Twitter | `fab fa-twitter` | Post share panels |
| LinkedIn | `fab fa-linkedin` | Post share panels |
| Pinterest | `fab fa-pinterest` | Post share panels |
| Reddit | `fab fa-reddit` | Post share panels |
| Tumblr | `fab fa-tumblr` | Post share panels |
| Hacker News | `fab fa-hacker-news` | Post share panels |
| Pocket | `fab fa-get-pocket` | Post share panels |

## Key Rules

1. **Always `aria-hidden="true"`** on `<i>` tags — icons are decorative
2. **Always `aria-label`** on the parent `<a>` — provides accessible name
3. **Wrap in `<a class="icon">`** — the `.icon` class removes link underline and sets hover color
4. **`fas` for UI, `fab` for brands** — wrong prefix renders a blank square
5. **Size modifiers**: `fa-lg` on post action bars, `fa-2x` on non-post hamburger menus only

## See Also

- [patterns](references/patterns.md) — icon markup patterns and anti-patterns
- [workflows](references/workflows.md) — adding, changing, and auditing icons

## Related Skills

- See the **html** skill for page structure and batch-editing `<head>` preload tags
- See the **css** skill for `.icon` class styling and hover state colors
- See the **jquery** skill for inline `onmouseover`/`onclick` handlers on post page icons

## Documentation Resources

> Fetch latest Font Awesome documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "font-awesome"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repos
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/fontawesome` _(1063 snippets, High reputation)_

**Recommended Queries:**
- "font awesome 5 icon classes solid brands"
- "font awesome accessibility aria-hidden screen reader"
- "font awesome sizing fa-lg fa-2x fa-3x"
