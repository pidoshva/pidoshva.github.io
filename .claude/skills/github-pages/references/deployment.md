# Deployment Reference

## Contents
- Deployment Model
- Domain and DNS Verification
- Page URL Structure
- Troubleshooting Common Failures

## Deployment Model

```
Hugo source (separate repo) → build → commit HTML to pidoshva.github.io → push main → live at geleus.com
```

The `main` branch IS the deployment artifact. Every file in the repo is served as-is by GitHub Pages. No build step runs on GitHub's side.

## Domain and DNS Verification

### Verifying the full chain

```bash
# 1. Confirm CNAME file content
cat CNAME
# Must output exactly: geleus.com

# 2. Verify DNS resolution to GitHub Pages
dig geleus.com +short
# Expected: one or more of 185.199.108-111.153

# 3. Verify HTTPS and response
curl -sI https://geleus.com | head -5
# Should show HTTP/2 200 with server: GitHub.com

# 4. Verify custom domain isn't returning the wrong site
curl -s https://geleus.com | grep '<title>'
# Expected: <title>Vadim Pidoshva</title>
```

### DO: Use root-relative paths everywhere

All canonical URLs and internal links in this site use root-relative paths. This is correct:

```html
<!-- GOOD — works with any domain, matches Hugo output -->
<link rel="canonical" href="/about/">
<a href="/projects">Projects</a>
```

### DON'T: Hardcode the GitHub Pages subdomain

```html
<!-- BAD — breaks if domain changes, defeats CNAME purpose -->
<link rel="canonical" href="https://pidoshva.github.io/about/">
```

The only absolute external URL in nav is the resume link to `https://geleus.io/` in the header and footer navigation across all pages.

## Page URL Structure

Every page lives in its own directory as `index.html` (Hugo's default output). GitHub Pages serves `example.com/about/` by returning `about/index.html`.

Current top-level routes:

| URL | File | Notes |
|-----|------|-------|
| `/` | `index.html` | Homepage with bio and post list |
| `/about/` | `about/index.html` | Personal bio page |
| `/posts/` | `posts/index.html` | Blog post listing |
| `/projects/` | `projects/index.html` | Project showcase listing |
| `/resume/` | `resume/index.html` | Shows resume image (nav links to geleus.io) |
| `/categories/` | `categories/index.html` | Hugo taxonomy page |
| `/tags/` | `tags/index.html` | Hugo taxonomy page |

Individual posts and projects follow the same pattern: `/posts/interactive-resume/` serves `posts/interactive-resume/index.html`.

### Adding a new page

1. Create the directory: `posts/my-post/`
2. Create `posts/my-post/index.html` using an existing post as template (e.g., copy from `posts/interactive-resume/index.html`)
3. Update the CSS `<link>` tag to reference the current hash filename
4. Add entry to `sitemap.xml`, RSS feeds, and listing pages (see main SKILL.md checklist)

## Troubleshooting Common Failures

| Symptom | Likely Cause | Diagnostic Command | Fix |
|---------|-------------|-------------------|-----|
| Site shows GitHub 404 | CNAME missing or DNS broken | `git ls-files CNAME && dig geleus.com +short` | Restore CNAME, verify DNS A/CNAME records |
| Pages render unstyled | CSS hash mismatch | `grep -c "styles\." index.html` (should be 1) | Update all 34 HTML files with correct hash |
| Old content after push | GitHub Pages cache | Wait 1-10 minutes | Empty commit to force rebuild |
| HTTPS cert error | Domain just changed | `curl -vI https://geleus.com 2>&1 \| grep SSL` | Wait up to 24h for GitHub TLS provisioning |
| 404 on specific page | Missing `index.html` in directory | `ls posts/my-post/` | Create the directory and `index.html` |
| RSS feed not updating | Forgot to edit feed XML | `grep "my-post" posts/index.xml` | Add `<item>` block to relevant feed files |

### Force rebuild

```bash
git commit --allow-empty -m "Trigger GitHub Pages rebuild"
git push origin main
```
