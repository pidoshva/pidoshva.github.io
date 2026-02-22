# CSS Patterns Reference

## Contents
- Component Selector Map
- Dark Theme Rules
- Responsive Navigation CSS
- Post Page Fixed Elements
- Anti-Patterns

## Component Selector Map

ID selectors scope major layout regions. Class selectors handle reusable patterns.

| Selector | Scope | File presence |
|----------|-------|---------------|
| `#header` | Logo + nav bar | All pages |
| `#header-post` | Fixed right sidebar (nav, share, TOC) | Post pages only |
| `#footer` | Copyright + nav links | All pages |
| `#footer-post` | Mobile bottom bar | Post pages only |
| `#nav-footer` | Mobile nav inside `#footer-post` | Post pages only |
| `.post-list` | Chronological post listing | `index.html`, `posts/index.html` |
| `.project-list` | Project showcase listing | `projects/index.html` |
| `article .content` | Post body — scoped heading, image, blockquote styles | Post pages |

## Dark Theme Rules

Body-level rules in `css/styles.[hash].css` establish the dark foundation:

```css
html { border-top: 2px solid #c9cacc; }
body {
  background-color: #1d1f21;
  color: #c9cacc;
  font-size: 14px;
  font-family: "JetBrains Mono", monospace;
  line-height: 1.725;
}
```

**Contrast hierarchy:** `#eee` (headings) > `#c9cacc` (body text) > `#666` (muted/dates/footer). Green `#2bbc8a` is reserved for interactive elements only. Pink `#d480aa` appears exclusively on hover states.

## Responsive Navigation CSS

Desktop nav renders inline items separated by dotted borders. Mobile hides items and shows a hamburger icon. The `.responsive` class is toggled by jQuery in `js/main.js` (see the **jquery** skill).

```css
@media screen and (max-width: 480px) {
  #header #nav ul li { display: none; border-right: 0; }
  #header #nav ul li.icon {
    position: absolute; top: 77px; right: 1rem;
    display: inline-block;
  }
  #header #nav ul.responsive li { display: block; }
  #header #nav li:not(:first-child) {
    padding-top: 1rem; padding-left: 70px; font-size: 1rem;
  }
}
```

## Post Page Fixed Elements

Post pages (`posts/*/index.html`) use two fixed-position UI regions absent from other pages:

**`#header-post`** — fixed top-right sidebar:
- `#menu` container with nav links and action icons (initially `visibility: hidden`)
- `#toc` with table of contents (hidden below `1199px`)
- `#share` with social sharing links
- `#actions` with prev/next/top/share icons (hidden below `900px`)

**`#footer-post`** — fixed bottom bar for mobile:
- `#nav-footer`, `#toc-footer`, `#share-footer` panels toggled by jQuery onclick handlers
- `#actions-footer` with Menu/TOC/Share/Top buttons
- Hidden above `500px` via `#footer-post-container { display: none }`

## Anti-Patterns

### WARNING: Inline Styles in Post HTML

**The Problem:**

```html
<!-- BAD — found across post pages like posts/interactive-resume/index.html -->
<a id="top-icon-tablet" href="#" style="display:none;">
<div id="nav-footer" style="display: none">
<div id="share" style="display: none">
```

**Why This Breaks:**
1. Cannot be overridden from `css/styles.[hash].css` without `!important`
2. Invisible to CSS-only searches when debugging layout issues
3. Duplicated identically across all post HTML files — no single source of truth

**The Fix:** Move initial visibility to the stylesheet using the existing ID selectors:

```css
#top-icon-tablet, #nav-footer, #share, #toc-footer, #share-footer { display: none; }
```

**When You Might Be Tempted:** Quick visibility toggles. The IDs already exist in the stylesheet — use them.

### WARNING: Editing the Minified CSS File Directly

**The Problem:** The stylesheet is a single minified line. A misplaced character corrupts the entire file, and git diffs show the whole line as changed.

**The Fix:** Pretty-print first, edit, then re-minify. See [workflows](workflows.md) for the procedure. For structural changes, modify the Hugo source and regenerate.

### WARNING: Creating Additional CSS Files

**The Problem:** A new `<link>` tag must be added to all 34 HTML files. Missing one causes inconsistent styling on that page.

**The Fix:** Append new rules to the existing stylesheet instead. If a page-specific style is truly needed, use an inline `<style>` in that page's `<head>` — but NEVER for shared styles.
