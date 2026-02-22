# Page Types & Metadata Reference

## Contents
- Article vs List Page Types
- Required Meta Tags
- Taxonomy Pages
- Social Sharing URLs
- Pagination Redirects

## Article vs List Page Types

Pages split into two categories based on their header element and OpenGraph type:

**Article pages** (`#header-post`, `og:type = article`):
`/posts/*/index.html`, `/projects/*/index.html`, `/about/index.html`, `/resume/index.html`

**List pages** (`#header`, `og:type = website`):
`/index.html`, `/posts/index.html`, `/projects/index.html`, `/tags/*/index.html`, `/categories/index.html`

Article pages include `article:published_time`, `article:modified_time`, and
`article:section` meta properties. List pages omit these.

## Required Meta Tags

Every page MUST include this base set in `<head>`:

```html
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Page Title | Vadim Pidoshva</title>
<link rel="canonical" href="/posts/interactive-resume/">
<meta name="description" content="I&#39;m a Software Engineer in Utah">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="all,follow">
<meta name="googlebot" content="index,follow,snippet,archive">
<meta name="generator" content="Hugo 0.101.0" />
<meta property="og:title" content="Interactive Resume Added" />
<meta property="og:type" content="article" />
<meta property="og:url" content="/posts/interactive-resume/" />
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="Interactive Resume Added"/>
<link rel="shortcut icon" href="/images/favicon.ico">
```

Article pages add these after the base set:
```html
<meta property="article:section" content="posts" />
<meta property="article:published_time" content="2025-03-12T00:38:03-06:00" />
<meta property="article:modified_time" content="2025-03-12T00:38:03-06:00" />
```

The `canonical` and `og:url` values MUST match. Both use root-relative paths.

## Taxonomy Pages

Tags live at `/tags/[tag-name]/index.html` with matching `/tags/[tag-name]/index.xml`
feeds. Active tags: `python`, `c++`, `matlab`, `html`, `css`, `json`.

Tag pages display the tag in brackets as their title:
```html
<title>[python] - Vadim Pidoshva</title>
<meta property="og:title" content="[python]" />
```

Categories exist at `/categories/` but are currently empty — no posts use categories.

WARNING: When adding a new tag, create BOTH the `index.html` and `index.xml` files.
Missing the XML feed breaks RSS readers that filter by tag. Use an existing tag
directory (e.g., `/tags/python/`) as the template for both files.

## Social Sharing URLs

Post pages include 8 sharing buttons (Facebook, Twitter, LinkedIn, Pinterest,
Email, Pocket, Reddit, Hacker News). Share URLs use percent-encoded root-relative
paths — NEVER raw paths with spaces or special characters:

```html
<!-- Encoded slug in all share URLs -->
<a href="http://www.facebook.com/sharer.php?u=%2fposts%2finteractive-resume%2f">
<a href="https://twitter.com/intent/tweet?url=%2fposts%2finteractive-resume%2f&text=Interactive%20Resume%20Added">
<a href="http://www.linkedin.com/shareArticle?url=%2fposts%2finteractive-resume%2f&title=Interactive%20Resume%20Added">
```

Share buttons appear in two locations per post page: `#share` (desktop header
actions) and `#share-footer` (mobile footer toolbar). Both must be updated when
adding a new post.

## Pagination Redirects

Hugo generates `/posts/page/1/index.html` as a redirect to `/posts/`:

```html
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=/posts/">
<link rel="canonical" href="/posts/">
```

This is a one-page redirect only — the site has no multi-page pagination. Do not
add pagination pages manually; they exist solely as Hugo build artifacts.
