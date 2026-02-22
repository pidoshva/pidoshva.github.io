# HTML Workflows Reference

## Contents
- Adding a New Blog Post
- Adding a New Project Page
- Editing Page Content Safely
- Updating the CSS Hash Across All Pages

## Adding a New Blog Post

Copy this checklist and track progress:
- [ ] Step 1: Create directory and HTML file
- [ ] Step 2: Set meta tags and canonical URL
- [ ] Step 3: Add post entry to homepage listing
- [ ] Step 4: Add post entry to posts archive listing
- [ ] Step 5: Update `posts/index.xml` and `sitemap.xml`

### Step 1: Create directory and HTML file

New posts use `kebab-case` directories. Copy the most recent post as a template:

```bash
mkdir posts/my-new-post/
cp posts/interactive-resume/index.html posts/my-new-post/index.html
```

Blog posts use `#header-post` (not `#header`), include `js/code-copy.js`, and have
a sticky footer nav with TOC, sharing buttons, and prev/next links. Using an
existing post as the base ensures all of this is present.

### Step 2: Set meta tags and canonical URL

Edit these fields in the new `posts/my-new-post/index.html`:
- `<title>` — format: `Post Title | Vadim Pidoshva`
- `<link rel="canonical" href="/posts/my-new-post/">`
- `og:title`, `og:description`, `og:url`, `og:type` (use `article`)
- `article:published_time` and `article:modified_time` — ISO 8601 format
- `twitter:title`, `twitter:description`
- `<h1 class="posttitle" itemprop="name headline">` — the visible title
- `<time datetime="..." itemprop="datePublished">` — the visible date

### Step 3: Add post entry to homepage listing

Edit `index.html`. Insert a new `<li>` at the **top** of `<ul class="post-list">`
(inside `<section id="writing">`):

```html
<li class="post-item">
  <div class="meta"><time datetime="2026-02-21 00:00:00 -0700 MST" itemprop="datePublished">2026-02-21</time></div>
  <span><a href="/posts/my-new-post/">My New Post Title</a></span>
</li>
```

### Step 4: Add post entry to posts archive listing

Edit `posts/index.html`. If the year group already exists, insert the `<li>` after
the year's `<h2>`. If it is a new year, add a new `<h2>2026</h2>` before the entry:

```html
<h2>2026</h2>

<li class="post-item">
  <div class="meta">
    <time datetime="2026-02-21 00:00:00 -0700 MST" itemprop="datePublished">2026-02-21</time>
  </div>
  <span>
    <a class="" href="/posts/my-new-post/"> My New Post Title </a>
  </span>
</li>
```

### Step 5: Update feeds and sitemap

Add an `<item>` entry to `posts/index.xml` and a `<url>` entry to `sitemap.xml`.
See the **hugo** skill for XML feed structure.

## Adding a New Project Page

Copy this checklist and track progress:
- [ ] Step 1: Create directory `projects/[project_name]/index.html`
- [ ] Step 2: Copy `about/index.html` as the base template (standard page layout)
- [ ] Step 3: Update meta tags (title, OG, canonical, description)
- [ ] Step 4: Replace `<article>` content with project description
- [ ] Step 5: Add project entry to `projects/index.html` listing
- [ ] Step 6: Update `sitemap.xml`

### Step 5 detail: project listing entry

Edit `projects/index.html`. Add a new `<li>` to the existing unordered list:

```html
<li>
  <a href="/projects/new_project/">New Project Name</a>
  <div class="hn-tag-list">
    <span class="hn-tag">[python]</span>
  </div>
  <div class="hn-summary">One-line description of the project.</div>
</li>
```

Project directories traditionally use `snake_case` (e.g., `image_compression/`,
`online_groceries/`). Newer entries may use `kebab-case`.

## Editing Page Content Safely

Editable content lives inside `<div class="content" itemprop="articleBody">`. NEVER
modify shared components (header, footer, font preloads, CSS link) in only one file.

### Procedure

1. Read the target file first to understand the existing structure
2. Locate the content div: search for `itemprop="articleBody"` or the main content area
3. Make edits only within the content area
4. If the edit touches shared components, find ALL affected files:

```
Use Grep to search for the component being changed:
  pattern: 'id="header"' across all *.html files
```

5. Verify rendering in a browser. Check mobile layout (hamburger menu toggle).

### Shared components that must stay in sync across ALL pages

| Component | How to find affected files |
|-----------|--------------------------|
| Header nav links | Grep for `id="header"` in `*.html` |
| Footer nav links | Grep for `id="footer"` in `*.html` |
| CSS link tag | Grep for `styles.` in `*.html` |
| Font preloads | Grep for `rel="preload"` in `*.html` |
| Cactus Chat script | Grep for `cactus.chat` in `*.html` |

## Updating the CSS Hash Across All Pages

When the CSS file at `css/styles.[hash].css` changes, every HTML file that
references it must be updated. The filename contains a content hash and the `<link>`
tag includes an SRI integrity attribute.

Copy this checklist and track progress:
- [ ] Step 1: Identify the new CSS filename in `css/`
- [ ] Step 2: Generate new SRI hash
- [ ] Step 3: Find all HTML files referencing the old hash
- [ ] Step 4: Replace old href and integrity values in every file
- [ ] Step 5: Verify no files still reference the old hash

### Step 2: Generate SRI hash

```bash
openssl dgst -sha512 -binary css/styles.NEW_HASH.css | openssl base64 -A
```

### Step 3: Find all files

```
Use Grep: pattern 'styles\.' glob '*.html' to list all affected files.
```

### Step 4: Replace in all files

Use the Edit tool on each file, or for bulk replacement:

```bash
# After confirming the exact old and new values
sed -i '' 's/OLD_HASH/NEW_HASH/g' $(grep -rl "OLD_HASH" --include="*.html" .)
```

### Validation loop

1. Replace the hash in all files
2. Verify: `grep -r "OLD_HASH" --include="*.html" .` should return no results
3. If any files still reference the old hash, update them and repeat step 2
4. Only commit when zero files reference the old hash

See the **css** skill for stylesheet modification patterns.
