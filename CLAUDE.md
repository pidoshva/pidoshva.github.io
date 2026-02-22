# geleus.com - Personal Portfolio & Blog

Personal website and blog for Vadim Pidoshva, a Software Engineer based in Utah. The site showcases software projects, blog posts, and a resume. Hosted on GitHub Pages at geleus.com (also geleus.io for the interactive resume).

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Static Site Generator | Hugo 0.x | Generates the HTML output committed to this repo |
| Frontend | HTML, CSS, JavaScript | Static pages with responsive layout |
| JS Library | jQuery | DOM manipulation, responsive nav, scroll behavior |
| Icons | Font Awesome 5.x | UI icons throughout the site |
| Code Font | JetBrains Mono | Monospace font for code blocks |
| Gallery | Justified Gallery | Image gallery layout (jQuery plugin) |
| Comments | Cactus Chat | Matrix-based commenting system |
| Clipboard | clipboard.min.js | Code block copy functionality |
| Hosting | GitHub Pages | Static hosting with custom domain |
| Domain | geleus.com | Custom domain via CNAME |

## Critical: This Is Hugo Build Output

**This repository contains the compiled/generated static site, NOT the Hugo source.**

There are no Hugo templates, `config.toml`, `content/` markdown files, or `themes/` directory here. The Hugo source project lives elsewhere. All HTML files in this repo are generated output that gets deployed directly to GitHub Pages via the `main` branch.

When making changes:
- **Content edits** (post text, about page) can be done by editing the HTML files directly
- **Structural/template changes** should ideally be made in the Hugo source project and re-generated
- **Static assets** (JS, CSS, images) can be modified directly

## Project Structure

```
pidoshva.github.io/
├── about/                  # About page
│   └── index.html
├── categories/             # Hugo taxonomy (categories)
│   ├── index.html
│   └── index.xml
├── css/                    # Compiled stylesheet (hashed filename)
│   ├── styles.[hash].css
│   └── styles.css.map
├── images/                 # Site-wide images
│   ├── favicon.ico
│   └── logo.png
├── js/                     # JavaScript files
│   ├── code-copy.js        # Copy button for code blocks
│   ├── feather.min.js      # Feather icons (unused in current pages)
│   ├── main.js             # Responsive nav, scroll behavior, gallery
│   └── search.js           # Client-side search using XML feed
├── lib/                    # Third-party libraries (vendored)
│   ├── clipboard/          # clipboard.min.js
│   ├── font-awesome/       # Icons (CSS + webfonts)
│   ├── JetBrainsMono/      # Code font (ttf, woff, woff2, eot)
│   ├── jquery/             # jQuery
│   └── justified-gallery/  # Image gallery plugin
├── posts/                  # Blog posts (each in own directory)
│   ├── images/             # Shared post images
│   ├── interactive-resume/
│   ├── update-feb-2025/
│   ├── 2023_comeback/
│   ├── [other posts]/
│   ├── index.html          # Posts listing page
│   └── index.xml           # Posts RSS feed
├── projects/               # Project showcases (each in own directory)
│   ├── images/             # Shared project images
│   ├── utah-county-health-department-project/
│   ├── facial_recognition/
│   ├── image_compression/
│   ├── online_groceries/
│   ├── search_engine/
│   ├── this_website/
│   ├── uvsim/
│   ├── index.html          # Projects listing page
│   └── index.xml           # Projects RSS feed
├── resume/                 # Resume page (links to geleus.io)
│   └── index.html
├── tags/                   # Hugo taxonomy (tags: python, c++, matlab, etc.)
├── CNAME                   # Custom domain: geleus.com
├── index.html              # Homepage
├── index.xml               # Site-wide RSS feed
├── sitemap.xml             # Sitemap for SEO
└── README.md               # Repo readme
```

## Architecture Overview

The site follows Hugo's standard output structure where each page lives in its own directory as `index.html`. The homepage displays a short bio with social links (GitHub, email, Instagram) and a chronological list of blog posts. Navigation has four sections: Home, Projects, Resume, and About.

Posts are blog-style entries documenting project progress and personal updates. Projects are showcase pages describing completed work (tagged with technologies like Python, C++, MATLAB). The Resume link redirects externally to geleus.io, which hosts an interactive terminal-style resume.

All pages share a common layout with a header (logo + nav), content area, and footer. On mobile, the nav collapses into a hamburger menu. Post pages include additional features: previous/next navigation, social sharing buttons, table of contents, and a scroll-to-top button.

## Key JavaScript Modules

| File | Purpose |
|------|---------|
| `js/main.js` | Responsive hamburger menu, post page scroll behavior, Justified Gallery init |
| `js/search.js` | Client-side search against XML feed (from hexo-generator-search, adapted) |
| `js/code-copy.js` | Adds "copy" buttons to `<pre><code>` blocks |

## File & Content Naming

### File Naming
- Post directories: mixed convention - older posts use `snake_case` (`facial_recognition_posted/`), newer posts use `kebab-case` (`interactive-resume/`, `update-feb-2025/`)
- Project directories: mostly `snake_case` (`image_compression/`, `online_groceries/`), with one `kebab-case` (`utah-county-health-department-project/`)
- JS files: `kebab-case` (`code-copy.js`) or `camelCase` (`justifiedGallery.min.js` for vendored libs)
- CSS: single hashed file (`styles.[hash].css`)

### Code Naming (JavaScript)
- Functions: `camelCase` (`createCopyButton`, `searchFunc`, `stripHtml`, `getAllCombinations`)
- Variables: `camelCase` (`copyBtn`, `resetTimer`, `dataTitle`, `resultList`)
- jQuery selectors: string IDs/classes (`#header`, `.post`, `#nav-footer`)

## Deployment

The site deploys automatically via GitHub Pages from the `main` branch. The `CNAME` file maps the custom domain `geleus.com` to the GitHub Pages site.

To deploy changes:
1. Edit files directly in this repo (or regenerate from Hugo source)
2. Commit and push to `main`
3. GitHub Pages serves the updated site at geleus.com

## Navigation Structure

| Section | URL | Description |
|---------|-----|-------------|
| Home | `/` | Bio, social links, recent posts list |
| Projects | `/projects` | Portfolio of completed projects |
| Resume | `https://geleus.io/` | External link to interactive terminal resume |
| About | `/about` | Personal bio with photo |

## External Services

- **Cactus Chat** (`latest.cactus.chat`) - Matrix-based comment system loaded on all pages
- **geleus.io** - Separate site hosting the interactive terminal resume
- **GitHub** (`github.com/pidoshva`) - Source code for projects

## Content Tags

Projects and posts use these technology tags: `python`, `c++`, `matlab`, `html`, `css`, `json`.

## Notes for Development

- The CSS is a single compiled file with a content-hash in the filename. If you modify styles, the hash in the `<link>` tags across all HTML files must be updated to match.
- jQuery is used extensively in `main.js` and `search.js`. The site depends on it being loaded before those scripts.
- The `lib/` directory contains vendored third-party assets. These should not be modified directly; update by replacing with newer versions from upstream.
- All HTML pages include Font Awesome CSS and jQuery at the bottom of `<body>`. Post pages additionally load `code-copy.js`.
- The `search.js` file was adapted from hexo-generator-search and uses the `index.xml` RSS feed as its data source.
