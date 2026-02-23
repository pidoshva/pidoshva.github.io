// GitHub repo cards with expandable README
(function () {
  const USERNAME = 'pidoshva';
  const API_URL = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=30`;
  const CACHE_KEY = 'geleus_repos';
  const CACHE_TTL = 3600000; // 1 hour
  const REQUIRED_TOPIC = 'goodie';

  // Language colors (subset)
  const LANG_COLORS = {
    JavaScript: '#f1e05a', Python: '#3572A5', 'C++': '#f34b7d',
    C: '#555555', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219',
    TypeScript: '#2b7489', Shell: '#89e051', Go: '#00ADD8',
    Rust: '#dea584', Ruby: '#701516', MATLAB: '#e16737',
    'Jupyter Notebook': '#DA5B0B', Swift: '#F05138', Kotlin: '#A97BFF',
  };

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

  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
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
      .then(md => {
        readmeCache[repoName] = md;
        return md;
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
        card.appendChild(readme);
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

  function init() {
    const cached = getCached();
    if (cached) render(cached);

    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(repos => {
        setCache(repos);
        render(repos);
      })
      .catch(() => {
        if (!cached) {
          const root = document.getElementById('repo-root');
          if (root) root.innerHTML = '<div class="goodies-error">Could not load repos. Try again later.</div>';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
