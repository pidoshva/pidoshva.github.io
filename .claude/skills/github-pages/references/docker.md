# Docker Reference

## Contents
- Current State
- Local Preview Without Docker
- When Docker Adds Value

## Current State

This repo has **no Docker usage** and does not need any. The site is pre-built static HTML served by GitHub Pages — no server, no build pipeline, no runtime.

## Local Preview Without Docker

For previewing changes before pushing to `main`, use a one-liner static server from the repo root:

```bash
# Python (built-in, no install needed)
python3 -m http.server 8000
# Visit http://localhost:8000

# Node.js alternative
npx serve .
# Visit http://localhost:3000
```

This mirrors what GitHub Pages does: serve files as-is from the repo root. Test navigation at `http://localhost:8000/posts/`, `http://localhost:8000/about/`, etc.

## When Docker Adds Value

| Scenario | Use Docker? | Better Alternative |
|----------|-------------|-------------------|
| Preview HTML locally | No | `python3 -m http.server 8000` |
| Reproducible Hugo builds | Maybe | Pin Hugo version in GitHub Actions |
| Team needs identical build env | Yes | Single-stage Dockerfile with Hugo |
| Run link checkers locally | No | `npx lychee './**/*.html'` |

Docker only makes sense if the Hugo source is moved into this repo and you need reproducible builds across machines:

```bash
# Simple static file server for testing (if you prefer Docker)
docker run --rm -p 8080:80 -v "$(pwd):/usr/share/nginx/html:ro" nginx:alpine
```

### WARNING: Overcomplicating Static Site Deployment

**The Problem:**

Adding Docker Compose with nginx, certbot, and build containers for a site that GitHub Pages already serves with free TLS and CDN.

**Why This Breaks:**
1. GitHub Pages handles TLS, CDN, and serving — adding Docker duplicates all of it
2. Multi-container setups add image management, registry costs, and ops burden
3. Troubleshooting shifts from "check CNAME and push" to debugging container orchestration

**The Fix:**

Keep deployment on GitHub Pages. If you need a local preview, use `python3 -m http.server`. Docker is a tool for solving real problems — a static site on GitHub Pages is not one of them.
