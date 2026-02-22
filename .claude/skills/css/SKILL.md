---
name: css
description: |
  Handles compiled stylesheets, responsive design, and layout for geleus.com.
  Use when: modifying styles, fixing layout issues, adjusting responsive breakpoints,
  changing colors or typography, or updating the CSS hash across HTML files.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# CSS Skill

This site uses a single minified CSS file at `css/styles.[hash].css` — compiled from the Hugo source project. The stylesheet combines Basscss-inspired utility classes with ID-scoped component styles. All 34 HTML files reference the same hashed filename with an SRI `integrity` attribute. Any CSS modification triggers a multi-file update.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| background | `#1d1f21` | Page background, search input |
| text | `#c9cacc` | Body text, default link color |
| accent-green | `#2bbc8a` | Nav links, h1, interactive elements |
| accent-pink | `#d480aa` | Link hover underlines, tag links, TOC hover |
| heading | `#eee` | h2, h3 headings |
| muted | `#666` | Dates, footer, borders |
| blockquote | `#ccffb6` | Blockquote text and quote mark |

## Responsive Breakpoints

| Breakpoint | Key behavior change |
|------------|---------------------|
| `480px` | Nav collapses to hamburger, padding shrinks, post-list stacks |
| `500px` | `#header-post` visible, `#footer-post-container` hidden |
| `540px` | `.image-wrap` switches to flex row |
| `900px` | Desktop menu/actions visible, tablet icons hidden |
| `1199px` | Sidebar TOC appears on wide screens |

## Layout Architecture

Every page uses this body class chain defined in the HTML:

```html
<body class="max-width mx-auto px3 ltr">
  <div class="content index py4">
```

`max-width` caps at `48rem`. `mx-auto` centers. `px3` adds `2rem` horizontal padding (drops to `1rem` below `480px`). `py4` adds `4rem` vertical padding (drops to `2rem` below `480px`).

Post pages add two fixed-position elements absent from other pages:
- `#header-post` — right sidebar with nav, share buttons, TOC (hidden below `500px`)
- `#footer-post` — mobile bottom bar with menu/TOC/share toggles (hidden above `500px`)

## Link Underline Technique

Links use `background-image` gradients instead of `text-decoration` for pixel-precise underline positioning:

```css
.content a {
  background-image: linear-gradient(transparent, transparent 5px, #c9cacc 5px, #c9cacc);
  background-position: bottom;
  background-size: 100% 6px;
  background-repeat: repeat-x;
}
.content a:hover {
  background-image: linear-gradient(transparent, transparent 4px, #d480aa 4px, #d480aa);
}
```

Icon links (`.icon` class) and heading links suppress this underline with `background: none`.

## Utility Classes (Basscss)

Spacing scale: `0` = `0`, `1` = `0.5rem`, `2` = `1rem`, `3` = `2rem`, `4` = `4rem`.
Prefixes: `m` (margin), `p` (padding). Axes: `x`, `y`, `t`, `r`, `b`, `l`. Negative margins: `mxn1`–`mxn4`.

## WARNING: CSS Hash Update Required

Every CSS modification requires renaming the file and updating 34 HTML `<link>` tags plus their `integrity` attributes. Missing even one file causes that page to render unstyled.

See [workflows](references/workflows.md) for the step-by-step hash update procedure.

## See Also

- [patterns](references/patterns.md) — component selectors, dark theme, anti-patterns
- [workflows](references/workflows.md) — CSS edit procedure, hash update, responsive testing

## Related Skills

- See the **html** skill for page structure and the `<link>` tags that reference this stylesheet
- See the **jquery** skill for DOM-dependent style toggling (`js/main.js`)
- See the **font-awesome** skill for icon CSS loaded via `lib/font-awesome/css/all.min.css`
- See the **justified-gallery** skill for gallery layout styles in `lib/justified-gallery/`
- See the **hugo** skill for how the CSS is originally compiled from source

## Documentation Resources

> Fetch latest CSS documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "css" or "mdn css"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Recommended Queries:**
- "css media queries"
- "css flexbox layout"
- "css subresource integrity"
