---
name: html
description: |
  Structures static pages and semantic markup for the geleus.com portfolio site.
  Use when: editing HTML files, adding new pages or posts, modifying page structure,
  updating meta tags, fixing accessibility issues, or adding semantic markup.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# HTML Skill

This repo contains Hugo-generated static HTML — not Hugo templates. All pages are
standalone `index.html` files edited directly. Every page shares a common layout:
header with nav, content area, and footer. Blog posts use an extended layout with
a secondary header (`#header-post`), TOC, social sharing, and prev/next navigation.

## Page Types

There are four distinct page types, each with different HTML structure:

| Type | Example File | Header | Extra Scripts |
|------|-------------|--------|---------------|
| Homepage | `index.html` | `#header` | none |
| Content page | `about/index.html` | `#header` | none |
| Post | `posts/interactive-resume/index.html` | `#header-post` | `code-copy.js` |
| Listing | `posts/index.html`, `projects/index.html` | `#header` | none |

## Page Skeleton

Every page follows this structure. The CSS link hash (`styles.c05d68...`) must be
identical across all HTML files — see the **css** skill.

```html
<!DOCTYPE html>
<html lang="en-us">
<head>
  <link rel="preload" href="/lib/font-awesome/webfonts/fa-brands-400.woff2"
        as="font" type="font/woff2" crossorigin="anonymous">
  <link rel="preload" href="/lib/font-awesome/webfonts/fa-regular-400.woff2"
        as="font" type="font/woff2" crossorigin="anonymous">
  <link rel="preload" href="/lib/font-awesome/webfonts/fa-solid-900.woff2"
        as="font" type="font/woff2" crossorigin="anonymous">
  <link rel="preload" href="/lib/JetBrainsMono/web/woff2/JetBrainsMono-Regular.woff2"
        as="font" type="font/woff2" crossorigin="anonymous">
  <script type="text/javascript" src="https://latest.cactus.chat/cactus.js"></script>
  <link rel="stylesheet" href="https://latest.cactus.chat/style.css" type="text/css">
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Page Title | Vadim Pidoshva</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/css/styles.c05d68261bf...e822e66.css"
        integrity="sha512-wF1oJh..." crossorigin="anonymous">
  <link rel="icon" type="image/png" href="/images/favicon.ico">
</head>
<body class="max-width mx-auto px3 ltr">
  <div class="content index py4">
    <header id="header"><!-- shared nav --></header>
    <!-- page-specific content here -->
    <footer id="footer"><!-- shared footer --></footer>
  </div>
  <link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
  <script src=/lib/jquery/jquery.min.js></script>
  <script src=/js/main.js></script>
</body>
</html>
```

## Key Concepts

| Concept | Detail |
|---------|--------|
| Directory structure | Each page lives at `[section]/index.html` (Hugo convention) |
| Schema.org | Articles use `itemscope itemtype="http://schema.org/BlogPosting"` |
| Font preloads | Four woff2 fonts preloaded in every `<head>` with `crossorigin="anonymous"` |
| CSS integrity | Single hashed CSS file with SRI — hash must match across ALL pages |
| Script loading | jQuery + `js/main.js` at bottom of every page; posts also load `js/code-copy.js` |
| Post header | Posts use `#header-post` with a sticky footer nav, not the standard `#header` |
| Shared nav | Four links: Home (`/`), Projects (`/projects`), Resume (`https://geleus.io/`), About (`/about`) |

## Navigation Links (must match in header AND footer)

```html
<li><a href="/">Home</a></li>
<li><a href="/projects">Projects</a></li>
<li><a href="https://geleus.io/">Resume</a></li>
<li><a href="/about">About</a></li>
```

## SEO Meta Tags

Every page needs OG and Twitter meta tags. Posts use `og:type` of `article` with
`article:published_time`; other pages use `website`.

```html
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Description here" />
<meta property="og:type" content="website" />
<meta property="og:url" content="/page-path/" />
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="Page Title"/>
<link rel="canonical" href="/page-path/">
```

## See Also

- [patterns](references/patterns.md) — Semantic markup, accessibility, anti-patterns
- [workflows](references/workflows.md) — Adding pages, editing content, CSS hash updates

## Related Skills

- See the **css** skill for stylesheet patterns and the hashed filename convention
- See the **jquery** skill for DOM manipulation and event handling in `js/main.js`
- See the **hugo** skill for understanding the generated output structure

## Documentation Resources

> Fetch latest HTML documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "html mdn"
2. Prefer website documentation (IDs starting with `/websites/`) over source repos
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Recommended Queries:**
- "html semantic elements"
- "html meta tags open graph"
- "html accessibility aria"
