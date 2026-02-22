---
name: github-pages
description: |
  Configures GitHub Pages static site hosting, custom domain setup, and deployment workflows for geleus.com.
  Use when: managing CNAME records, deploying to GitHub Pages, troubleshooting domain issues,
  updating sitemap.xml or RSS feeds, coordinating CSS hash changes across HTML files,
  or adding GitHub Actions workflows for the site.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# GitHub Pages Skill

This repo **is** the deployed site. Hugo 0.101.0 build output is committed directly to `main`, and GitHub Pages serves it at `geleus.com`. No GitHub Actions, no build step on push, no Docker. Deployment = push to `main`.

## Deploy a Content Change

Step-by-step for the most common operation — editing or adding content:

1. Edit the target HTML file (e.g., `posts/update-feb-2025/index.html`)
2. If a new page was added, update these files:
   - `sitemap.xml` — add a `<url>` block with root-relative `<loc>`
   - `index.xml` — add an `<item>` to the site-wide RSS feed
   - `posts/index.xml` or `projects/index.xml` — add `<item>` to the section feed
   - `posts/index.html` or `projects/index.html` — add link on the listing page
   - `index.html` — add entry to the homepage post list if it's a post
3. Stage changed files and push to `main`

```bash
git add posts/my-new-post/index.html sitemap.xml index.xml posts/index.xml posts/index.html index.html
git commit -m "Add new post: my-new-post"
git push origin main
```

GitHub Pages picks up changes within ~60 seconds.

## CNAME and Custom Domain

The file `CNAME` at repo root must contain exactly `geleus.com` — one line, no trailing whitespace.

```bash
# Verify DNS points to GitHub Pages
dig geleus.com +short
# Expected: 185.199.108.153 (or other GitHub Pages IPs)
```

### WARNING: CNAME Deletion

Removing or renaming `CNAME` causes the site to fall back to `pidoshva.github.io`. All `geleus.com` links break immediately, and DNS propagation delays mean recovery isn't instant. Always verify `CNAME` is tracked:

```bash
git ls-files CNAME
# Must output: CNAME
```

## CSS Hash Coordination

The single stylesheet uses a content hash in its filename. Currently 34 HTML files reference it with an SRI `integrity` attribute:

```html
<link rel="stylesheet" href="/css/styles.c05d68261bf...e66.css"
      integrity="sha512-wF1oJhvwhqnX...">
```

When modifying CSS:

1. Replace `css/styles.[old-hash].css` with the new file
2. Use Grep to find all 34 HTML files referencing the old hash
3. Update every `<link>` tag's `href` and `integrity` attributes
4. Verify zero references to the old hash remain before committing

See the **css** skill for the complete hash update workflow.

## Sitemap and RSS Feeds

### Adding a page to sitemap.xml

Insert a `<url>` block using root-relative paths (no domain prefix — matches Hugo's output):

```xml
<url>
  <loc>/posts/my-new-post/</loc>
  <lastmod>2026-02-21T00:00:00-07:00</lastmod>
</url>
```

### RSS feed files

| Feed | Scope |
|------|-------|
| `index.xml` | All content site-wide |
| `posts/index.xml` | Blog posts only |
| `projects/index.xml` | Projects only |

When adding a post, update both `index.xml` and `posts/index.xml`. For projects, update `index.xml` and `projects/index.xml`.

## Deployment Checklist

Copy this checklist when deploying changes:
- [ ] All 34 HTML files have matching CSS hash in `<link>` tags
- [ ] `CNAME` exists at repo root containing `geleus.com`
- [ ] `sitemap.xml` updated if pages were added or removed
- [ ] RSS feeds updated if posts or projects changed
- [ ] Listing pages (`posts/index.html`, `index.html`) updated
- [ ] Commit pushed to `main`
- [ ] Verified site loads at `https://geleus.com` after push

## Validation Loop

1. Push changes to `main`
2. Wait ~60 seconds for GitHub Pages to deploy
3. Visit `https://geleus.com` and check changed pages
4. If 404: verify `CNAME` exists and directory has `index.html`
5. If unstyled: check CSS hash matches across HTML files
6. Fix issues and push again; repeat until clean

```bash
# Force a rebuild without content changes
git commit --allow-empty -m "Trigger GitHub Pages rebuild"
git push origin main
```

## See Also

- [deployment](references/deployment.md) — Troubleshooting and domain verification
- [ci-cd](references/ci-cd.md) — Adding GitHub Actions workflows
- [docker](references/docker.md) — Local preview options (not used in production)

## Related Skills

- See the **hugo** skill for page structure and the directory-per-page convention
- See the **html** skill for page markup, meta tags, and `<head>` structure
- See the **css** skill for stylesheet management and the hash update workflow
