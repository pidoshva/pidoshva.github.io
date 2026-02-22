# geleus.com - Resource Center for Engineers

Personal resource center and open source hub for Vadim Pidoshva, a Software Engineer based in Utah. Hosted on GitHub Pages at geleus.com. Interactive terminal resume at geleus.io.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | HTML, CSS, vanilla JS | Static pages, no build step, no framework |
| Icons | Font Awesome 5.x | UI icons throughout the site |
| Font | JetBrains Mono | Monospace font used site-wide |
| Hosting | GitHub Pages | Static hosting from `main` branch |
| Domain | geleus.com | Custom domain via CNAME |
| APIs | GitHub API, jogruber contributions API | Repo cards and contribution graph |

## Design

- **Dark terminal aesthetic**: `#1d1f21` background, `#2bbc8a` green accent, `#d480aa` pink accent
- **JetBrains Mono** monospace font everywhere
- **Terminal-style headings**: `$ whoami`, `$ ls ~/projects`, `$ cat ~/blog`
- **No jQuery** — all vanilla JS

## Project Structure

```
pidoshva.github.io/
├── index.html              # Homepage: bio, contribution graph, nav cards
├── goodies/index.html      # Repo cards from GitHub API
├── blog/index.html         # Blog (empty state for now)
├── css/styles.css          # Hand-written CSS with CSS variables
├── js/
│   ├── nav.js              # Hamburger menu + active nav link
│   ├── contributions.js    # GitHub contribution heatmap
│   └── goodies.js          # Repo cards + clipboard copy
├── images/
│   ├── favicon.ico
│   └── logo.png
├── lib/
│   ├── font-awesome/       # Icons (CSS + webfonts)
│   └── JetBrainsMono/      # Font files (woff2, woff, ttf, eot)
├── CNAME                   # Custom domain: geleus.com
├── sitemap.xml             # Sitemap (3 pages)
└── README.md
```

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero with `$ whoami`, GitHub contribution graph, nav cards |
| Goodies | `/goodies/` | Open source repo cards with git clone copy-to-clipboard |
| Blog | `/blog/` | Empty state with blinking cursor, ready for future posts |
| Resume | nav link | External link to `https://geleus.io/` (interactive terminal resume) |

## Key JavaScript Modules

| File | Purpose |
|------|---------|
| `js/nav.js` | Hamburger toggle + active nav link highlighting (~15 lines) |
| `js/contributions.js` | Fetches GitHub contributions, renders CSS Grid heatmap, localStorage caching (1hr TTL) |
| `js/goodies.js` | Fetches GitHub repos, renders cards with language/stars/forks, clipboard copy for clone URLs |

## GitHub API Integration

### Contribution Graph (Homepage)
- **API**: `https://github-contributions-api.jogruber.de/v4/pidoshva?y=last`
- **Rendering**: CSS Grid, 7 rows x auto columns, 10px squares
- **Colors**: custom green scale (`#161b22` → `#0a3d1f` → `#147a3e` → `#2bbc8a` → `#5ae0b0`)
- **Caching**: localStorage key `geleus_contrib`, 1hr TTL

### Repo Cards (Goodies)
- **API**: `https://api.github.com/users/pidoshva/repos?sort=updated&per_page=30` (60 req/hr unauthenticated)
- **Filters**: excludes forks and `pidoshva.github.io`
- **Features**: language badge, stars, forks, "updated X ago", `git clone` URL copy button
- **Caching**: localStorage key `geleus_repos`, 1hr TTL
- **Security**: HTML escaping on all user-generated content (repo descriptions)

## Code Naming (JavaScript)
- Functions: `camelCase` (`escapeHtml`, `timeAgo`, `formatDate`, `getCached`, `setCache`)
- Variables: `camelCase` (`CACHE_KEY`, `CACHE_TTL`, `LANG_COLORS`)
- All JS in IIFEs to avoid global scope pollution
- DOM queries: `document.getElementById`, `document.querySelector`

## Deployment

Push to `main` branch → GitHub Pages auto-deploys at geleus.com.

## CSS Architecture

Single file `css/styles.css` using CSS custom properties (variables) defined in `:root`. No build step, no preprocessor. Mobile breakpoint at 640px with hamburger nav.

## Notes for Development

- **No build step**: edit HTML/CSS/JS directly, commit, push
- **Shared layout**: all 3 pages share the same header/footer HTML (duplicated, not templated)
- **Font Awesome** is loaded in `<head>` on every page
- **JetBrains Mono** is preloaded via `<link rel="preload">`
- The `lib/` directory contains vendored assets — update by replacing with newer upstream versions
- All API data is cached in localStorage; clear `geleus_contrib` and `geleus_repos` keys to force refresh
