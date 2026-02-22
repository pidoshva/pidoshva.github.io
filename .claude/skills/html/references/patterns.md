# HTML Patterns Reference

## Contents
- Semantic Article Markup
- Post List Item Pattern
- Project List Item Pattern
- Accessibility Conventions
- WARNING: Inline Event Handlers
- WARNING: Logo as Background Image
- WARNING: Unquoted Attribute Values
- WARNING: Wrong Schema Type on Non-Blog Pages

## Semantic Article Markup

Blog posts and project pages wrap content in schema.org microdata. This structure
is used in `posts/interactive-resume/index.html` and all files under `projects/`:

```html
<article class="post" itemscope itemtype="http://schema.org/BlogPosting">
  <header>
    <h1 class="posttitle" itemprop="name headline">Post Title</h1>
    <div class="meta">
      <div class="postdate">
        <time datetime="2025-03-12T00:38:03-06:00"
              itemprop="datePublished">2025-03-12</time>
      </div>
    </div>
  </header>
  <div class="content" itemprop="articleBody">
    <!-- post body here -->
  </div>
</article>
```

The `<time>` element with ISO 8601 `datetime` is critical for SEO. Always include
`itemprop="datePublished"` on posts.

## Post List Item Pattern

Used in both `index.html` (homepage) and `posts/index.html`. Newest posts go first.

```html
<li class="post-item">
  <div class="meta">
    <time datetime="2025-03-12 00:38:03 -0600 MDT"
          itemprop="datePublished">2025-03-12</time>
  </div>
  <span><a href="/posts/interactive-resume/">Interactive Resume Added</a></span>
</li>
```

## Project List Item Pattern

Used in `projects/index.html`. Technology tags use bracket notation `[python]`.

```html
<li>
  <a href="/projects/uvsim/">UVSim</a>
  <div class="hn-tag-list">
    <span class="hn-tag">[python]</span>
    <span class="hn-tag">[c++]</span>
  </div>
  <div class="hn-summary">Short project description.</div>
</li>
```

Valid tags: `python`, `c++`, `matlab`, `html`, `css`, `json`.

## Accessibility Conventions

Maintain these patterns consistently across all pages:

- Icon-only links get `aria-label`:
  `<a href="..." aria-label="github">` (see `index.html:94`)
- Decorative icons get `aria-hidden="true"`:
  `<i class="fas fa-bars fa-2x" aria-hidden="true"></i>` (see every `#header`)
- External links use `target="_blank" rel="noopener"` to prevent reverse tabnapping
- Footer navigation is wrapped in `<nav>` (see `index.html:202`)
- Homepage sections use `<section>` with IDs: `#about`, `#writing`

## WARNING: Inline Event Handlers

**The Problem:**

```html
<!-- BAD - inline jQuery in onclick, found in some post pages -->
<a href="#" onclick="$('html, body').animate({ scrollTop: 0 }, 'fast');">
  <i class="fas fa-chevron-up fa-lg"></i>
</a>
```

**Why This Breaks:**
1. Mixes behavior with markup — impossible to test or maintain separately
2. Depends on jQuery being loaded before the element renders
3. CSP (Content Security Policy) blocks inline handlers in strict environments

**The Fix:**

```html
<!-- GOOD - semantic button, event bound in js/main.js -->
<button id="scroll-top" class="scroll-top-btn" hidden aria-label="Scroll to top">
  <i class="fas fa-chevron-up fa-lg" aria-hidden="true"></i>
</button>
```

Bind the event in `js/main.js` (see the **jquery** skill).

## WARNING: Logo as Background Image

**The Problem:**

Every page contains this in the `#header` block:

```html
<!-- BAD - invisible to screen readers and search engines -->
<div id="logo" style="background-image: url(/images/logo.png)"></div>
```

**Why This Breaks:**
1. Screen readers cannot announce background images
2. Search engines cannot index or attribute the image
3. Users cannot right-click to save or open the image

**The Fix:**

```html
<!-- GOOD - semantic image with alt text -->
<img id="logo" src="/images/logo.png" alt="Vadim Pidoshva logo" width="48" height="48">
```

Use `object-fit` in CSS for sizing instead of `background-size`.

## WARNING: Unquoted Attribute Values

**The Problem:**

Found at the bottom of every page (e.g., `index.html:222-224`):

```html
<!-- BAD - missing quotes -->
<link rel="stylesheet" href=/lib/font-awesome/css/all.min.css>
<script src=/lib/jquery/jquery.min.js></script>
<script src=/js/main.js></script>
```

**Why This Breaks:**
1. Attributes with spaces, `&`, or `=` will silently break parsing
2. Inconsistent with the `<head>` section which uses double quotes throughout
3. Some HTML minifiers and parsers handle unquoted values unpredictably

**The Fix:** Always use double quotes on attribute values to match the `<head>`
convention. If editing these lines in any page, quote them.

## WARNING: Wrong Schema Type on Non-Blog Pages

**The Problem:**

`about/index.html` and project pages use `itemtype="http://schema.org/BlogPosting"`
even though they are not blog posts.

**Why This Breaks:**
1. Search engines misclassify content in rich results
2. Structured data validators flag the type mismatch

**The Fix:** Use `WebPage` for the about page, `SoftwareSourceCode` for project
pages. Only use `BlogPosting` on actual posts under `posts/`.
