# geleus.com

Personal site and open-source hub for Vadim Pidoshva — Full Stack Engineer, Utah.

**Live:** https://geleus.com

The homepage is a single interactive cluster of nodes on a `<canvas>` that **reshapes
itself for every section** — click a node (or the nav) and it morphs into that section's
shape while the content slides in. Built with vanilla JS and a hand-rolled 3D scene on a
2D canvas. No framework, no build step.

## Layout

- **`/`** — the spatial app (`js/spatial.js`): morphing node cluster, side drawer for
  about/goodies/blog, full-screen overlay for the journal, blog posts, and repo READMEs.
- **`/goodies/`, `/blog/`, `/blog/post.html`** — fallback pages (normal HTML for links + SEO)
  with an animated cluster background (`js/cluster.js`).
- **Résumé** — external link to [geleus.io](https://geleus.io).

## Tech

Vanilla HTML/CSS/JS · `<canvas>` 2D · JetBrains Mono + Font Awesome · `marked` + `highlight.js`
· GitHub Pages. A weekly GitHub Action summarizes my GitHub activity (Python + Claude) into the
journal.

## Docs

- [`CLAUDE.md`](CLAUDE.md) — orientation + conventions (start here).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — full deep dive: engine internals, CSS, data/automation,
  and a cookbook for common edits.

## Develop

No build step. `python3 -m http.server` and open `localhost:8000`. Edit → bump the `?v=` cache
version on any changed JS/CSS → commit → push `main`.
