// GitHub repo cards with expandable README
(function () {
  const USERNAME = 'pidoshva';
  // per_page=100 so a `goodie` repo can never fall off the end of the list just
  // because other repos were pushed to more recently.
  const API_URL = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=100`;
  const CACHE_KEY = 'geleus_repos';
  const CACHE_VERSION = 2;   // bump to invalidate every visitor's cached payload
  const CACHE_TTL = 300000;  // 5 min — how long we serve the cache without revalidating
  const REQUIRED_TOPIC = 'goodie';

  // Language colors — shared via lang-colors.js, fallback to empty
  const LANG_COLORS = (window.GELEUS && window.GELEUS.LANG_COLORS) || {};

  // Cache for fetched READMEs (in-memory, per session)
  const readmeCache = {};

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  // Only the fields the cards actually use. The raw API payload is ~10x larger,
  // which risks blowing the localStorage quota and silently losing the cache.
  function slim(repos) {
    return repos.map(r => ({
      name: r.name,
      html_url: r.html_url,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      updated_at: r.updated_at,
      clone_url: r.clone_url,
      default_branch: r.default_branch,
      topics: r.topics || []
    }));
  }

  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      // Older/unknown shapes are dropped rather than trusted — otherwise a cache
      // written by a previous version keeps serving its stale topic lists.
      if (c.v !== CACHE_VERSION || !Array.isArray(c.data)) return null;
      return { data: c.data, etag: c.etag || null, fresh: Date.now() - c.ts <= CACHE_TTL };
    } catch { return null; }
  }

  function setCache(data, etag) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        v: CACHE_VERSION, data, etag: etag || null, ts: Date.now()
      }));
    } catch { /* ignore */ }
  }

  function fetchReadme(repoName, defaultBranch) {
    if (readmeCache[repoName]) return Promise.resolve(readmeCache[repoName]);

    const url = `https://raw.githubusercontent.com/${USERNAME}/${repoName}/${defaultBranch}/README.md`;
    return fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      // Non-standard filename or case (readme.md, README.markdown, …):
      // let the API resolve whichever file GitHub treats as the readme.
      .catch(() =>
        fetch(`https://api.github.com/repos/${USERNAME}/${repoName}/readme`, {
          headers: { Accept: 'application/vnd.github.raw+json' }
        }).then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
      )
      .then(md => {
        readmeCache[repoName] = md;
        return md;
      });
  }

  function slugify(text) {
    return text.toLowerCase().trim()
      .replace(/[^\w\- ]+/g, '')
      .replace(/\s+/g, '-');
  }

  // Make a rendered README behave inside the site: absolutize relative
  // asset/link paths, and keep TOC anchors from touching location.hash
  // (the spatial app routes on the hash).
  function prepareReadme(container, repoName, branch) {
    const rawBase = `https://raw.githubusercontent.com/${USERNAME}/${repoName}/${branch}/`;
    const blobBase = `https://github.com/${USERNAME}/${repoName}/blob/${branch}/`;
    const isExternal = s => /^(https?:)?\/\//i.test(s) || s.startsWith('data:') || s.startsWith('mailto:');

    container.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (src && !isExternal(src)) img.src = rawBase + src.replace(/^\.?\//, '');
    });

    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      if (!h.id) h.id = slugify(h.textContent);
    });

    container.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) {
        a.addEventListener('click', e => {
          e.preventDefault();
          const target = container.querySelector('#' + CSS.escape(href.slice(1)));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else if (!isExternal(href)) {
        a.href = blobBase + href.replace(/^\.?\//, '');
        a.target = '_blank';
        a.rel = 'noopener';
      }
    });
  }

  function toggleReadme(card, repoName, defaultBranch) {
    const existing = card.querySelector('.repo-readme');
    const btn = card.querySelector('.repo-expand-btn');

    // Collapse if already open
    if (existing) {
      existing.remove();
      btn.classList.remove('expanded');
      btn.querySelector('i').className = 'fas fa-chevron-down';
      btn.querySelector('.btn-text').textContent = 'readme';
      return;
    }

    // Show loading
    btn.classList.add('expanded');
    btn.querySelector('i').className = 'fas fa-spinner fa-spin';
    btn.querySelector('.btn-text').textContent = 'loading...';

    fetchReadme(repoName, defaultBranch)
      .then(md => {
        const readme = document.createElement('div');
        readme.className = 'repo-readme post-content';
        readme.innerHTML = marked.parse(md);
        prepareReadme(readme, repoName, defaultBranch);
        card.appendChild(readme);
        if (window.hljs) {
          readme.querySelectorAll('pre code').forEach(function (block) {
            hljs.highlightElement(block);
          });
        }
        btn.querySelector('i').className = 'fas fa-chevron-up';
        btn.querySelector('.btn-text').textContent = 'collapse';
      })
      .catch(() => {
        const readme = document.createElement('div');
        readme.className = 'repo-readme';
        readme.innerHTML = '<p class="readme-error">Could not load README.</p>';
        card.appendChild(readme);
        btn.querySelector('i').className = 'fas fa-chevron-up';
        btn.querySelector('.btn-text').textContent = 'collapse';
      });
  }

  function render(repos) {
    const root = document.getElementById('repo-root');
    if (!root) return;

    const filtered = repos.filter(r => (r.topics || []).includes(REQUIRED_TOPIC));

    if (filtered.length === 0) {
      root.innerHTML = '<div class="goodies-loading">No repos found.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'repo-grid';

    filtered.forEach(repo => {
      const card = document.createElement('div');
      card.className = 'repo-card';

      const langColor = LANG_COLORS[repo.language] || '#8b949e';
      const langHtml = repo.language
        ? `<span class="lang-badge"><span class="lang-dot" style="background:${langColor}"></span>${escapeHtml(repo.language)}</span>`
        : '';

      const desc = repo.description ? escapeHtml(repo.description) : '<em style="color:var(--text-dim)">No description</em>';
      const cloneUrl = repo.clone_url;

      card.innerHTML = `
        <h3><a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener">${escapeHtml(repo.name)}</a></h3>
        <div class="description">${desc}</div>
        <div class="repo-meta">
          ${langHtml}
          ${repo.stargazers_count ? `<span class="stat"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>` : ''}
          ${repo.forks_count ? `<span class="stat"><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>` : ''}
          <span class="stat">updated ${timeAgo(repo.updated_at)}</span>
        </div>
        <div class="clone-row">
          <code class="clone-url">git clone ${escapeHtml(cloneUrl)}</code>
          <button class="clone-btn" data-url="${escapeHtml(cloneUrl)}" aria-label="Copy clone URL">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <button class="repo-expand-btn" data-repo="${escapeHtml(repo.name)}" data-branch="${escapeHtml(repo.default_branch)}" aria-label="Toggle README">
          <i class="fas fa-chevron-down"></i> <span class="btn-text">readme</span>
        </button>
      `;

      grid.appendChild(card);
    });

    root.innerHTML = '';
    root.appendChild(grid);

    // Event delegation
    grid.addEventListener('click', e => {
      // Clone button
      const cloneBtn = e.target.closest('.clone-btn');
      if (cloneBtn) {
        const url = cloneBtn.dataset.url;
        navigator.clipboard.writeText(`git clone ${url}`).then(() => {
          cloneBtn.classList.add('copied');
          cloneBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => {
            cloneBtn.classList.remove('copied');
            cloneBtn.innerHTML = '<i class="fas fa-copy"></i>';
          }, 2000);
        });
        return;
      }

      // Expand button
      const expandBtn = e.target.closest('.repo-expand-btn');
      if (expandBtn) {
        const card = expandBtn.closest('.repo-card');
        toggleReadme(card, expandBtn.dataset.repo, expandBtn.dataset.branch);
      }
    });
  }

  // Exposed so the spatial home app can open a repo's README in its full-screen overlay
  window.GELEUS = window.GELEUS || {};
  window.GELEUS.loadReadme = function (repo, branch, root) {
    return fetchReadme(repo, branch).then(function (md) {
      root.innerHTML =
        '<div class="journal-head"><div class="ptag">readme</div><h2>' + escapeHtml(repo) + '</h2></div>' +
        '<div class="post-content">' + marked.parse(md) + '</div>';
      prepareReadme(root.querySelector('.post-content'), repo, branch);
      if (window.hljs) {
        root.querySelectorAll('pre code').forEach(function (block) { hljs.highlightElement(block); });
      }
    });
  };

  function init() {
    const cached = getCached();

    // Paint the cache first so the section is never empty, then revalidate below
    // so a `goodie` topic added or removed on GitHub shows up on the next load.
    if (cached) render(cached.data);
    if (cached && cached.fresh) return;

    // Conditional request. If nothing changed GitHub answers 304, which — unlike
    // a 200 — costs nothing against the 60 req/hr unauthenticated limit, so we can
    // check for topic changes on essentially every visit instead of once an hour.
    const headers = {};
    if (cached && cached.etag) headers['If-None-Match'] = cached.etag;

    fetch(API_URL, { headers, cache: 'no-store' })
      .then(r => {
        // Not modified: topics are unchanged, so just trust the cache for another TTL.
        if (r.status === 304 && cached) {
          setCache(cached.data, cached.etag);
          return null;
        }
        if (!r.ok) throw new Error(String(r.status));
        const etag = r.headers.get('ETag');
        return r.json().then(repos => ({ repos: slim(repos), etag }));
      })
      .then(res => {
        if (!res) return;
        const changed = !cached || JSON.stringify(res.repos) !== JSON.stringify(cached.data);
        setCache(res.repos, res.etag);
        if (changed) render(res.repos); // skip the DOM rebuild when nothing moved
      })
      .catch(err => {
        // Stale cache beats an error message — and it is already on screen.
        if (cached) return;
        const root = document.getElementById('repo-root');
        if (!root) return;
        const rateLimited = err && (err.message === '403' || err.message === '429');
        root.innerHTML = rateLimited
          ? '<div class="goodies-error">GitHub API rate limit reached. Repos will load again within the hour.</div>'
          : '<div class="goodies-error">Could not load repos. Try again later.</div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
