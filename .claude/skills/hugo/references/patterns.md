# Hugo Output Patterns

## Contents
- Post Article Structure
- Archive Listing Patterns
- RSS Feed Entries
- Anti-Patterns

## Post Article Structure

Every post and project page uses Schema.org `BlogPosting` with `itemprop` attributes.
Post pages use `#header-post` (sticky menu with actions), not `#header` (static nav).

```html
<article class="post" itemscope itemtype="http://schema.org/BlogPosting">
  <header>
    <h1 class="posttitle" itemprop="name headline">Update February 2025</h1>
    <div class="meta">
      <div class="postdate">
        <time datetime="2025-02-24T13:08:25-07:00" itemprop="datePublished">2025-02-24</time>
      </div>
    </div>
  </header>
  <div class="content" itemprop="articleBody">
    <!-- Rendered HTML content -->
  </div>
</article>
```

Post pages also include a mobile footer toolbar at `#footer-post-container` with
four toggle buttons (`#menu-toggle`, `#toc-toggle`, `#share-toggle`, `#top`) that
show/hide `#nav-footer`, `#toc-footer`, and `#share-footer` sections. See the
**jquery** skill for the scroll-driven show/hide logic in `js/main.js`.

## Archive Listing Patterns

Posts archive (`/posts/index.html`) groups entries by year with `<h2>` headings:

```html
<div id="archive">
  <ul class="post-list">
    <h2>2025</h2>
    <li class="post-item">
      <div class="meta">
        <time datetime="2025-03-12T00:38:03-06:00" itemprop="datePublished">2025-03-12</time>
      </div>
      <span><a href="/posts/interactive-resume/">Interactive Resume Added</a></span>
    </li>
    <h2>2023</h2>
    <!-- older posts -->
  </ul>
</div>
```

Projects listing (`/projects/index.html`) uses a different format with technology
tags and summaries — no year grouping:

```html
<li>
  <a href="/projects/utah-county-health-department-project/">Utah County Health Department Project</a>
  <div class="hn-tag-list"><span class="hn-tag">[python]</span></div>
  <div class="hn-summary">Short description of the project.</div>
</li>
```

The homepage (`/index.html`) section `#writing` mirrors the posts archive format
but includes all posts as a flat list without year headings.

## RSS Feed Entries

Feeds at `/index.xml`, `/posts/index.xml`, and `/projects/index.xml` use RSS 2.0
with Atom namespace. Add new entries at the top of `<channel>` (most recent first):

```xml
<item>
  <title>Interactive Resume Added</title>
  <link>/posts/interactive-resume/</link>
  <pubDate>Wed, 12 Mar 2025 00:38:03 -0600</pubDate>
  <guid>/posts/interactive-resume/</guid>
  <description>Post summary text here.</description>
</item>
```

NEVER use absolute URLs with domain — Hugo generates root-relative paths (`/posts/...`).
The `<guid>` matches the `<link>` value exactly.

## Anti-Patterns

### WARNING: Editing CSS Without Updating All Hash References

Modifying `/css/styles.[hash].css` without updating the filename and every `<link>`
tag that references it across all HTML files.

**Why This Breaks:**
1. SRI integrity check fails — browser **refuses to load** the stylesheet entirely
2. Every page renders as unstyled HTML
3. Browser caching by old filename means visitors see broken pages even after you fix the hash

**The Fix:** Before editing CSS, run `Grep` for `styles\.` in `*.html` to inventory
every reference. After renaming, update all `href` and `integrity` values.

### WARNING: Loading Scripts Before jQuery

`js/main.js` and `js/search.js` use `$()` jQuery calls. Placing them before
`/lib/jquery/jquery.min.js` causes `$ is not defined` errors, breaking navigation,
hamburger menu, scroll behavior, and gallery initialization.

**The Fix:** Always maintain the load order at end of `<body>`:
Font Awesome CSS, then jQuery, then `main.js`, then page-specific scripts.

### WARNING: Using Absolute Domain URLs in Internal Links

Using `https://geleus.com/posts/...` instead of `/posts/...` breaks local preview,
is inconsistent with all existing Hugo-generated links, and makes domain migration
painful. The only absolute external URL in navigation is `https://geleus.io/` for
the Resume link.
