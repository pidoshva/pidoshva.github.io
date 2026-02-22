// GitHub repo cards
(function () {
  const USERNAME = 'pidoshva';
  const API_URL = `https://api.github.com/users/${USERNAME}/repos?sort=updated&per_page=30`;
  const CACHE_KEY = 'geleus_repos';
  const CACHE_TTL = 3600000; // 1 hour
  const EXCLUDE = ['pidoshva.github.io'];

  // Language colors (subset)
  const LANG_COLORS = {
    JavaScript: '#f1e05a', Python: '#3572A5', 'C++': '#f34b7d',
    C: '#555555', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219',
    TypeScript: '#2b7489', Shell: '#89e051', Go: '#00ADD8',
    Rust: '#dea584', Ruby: '#701516', MATLAB: '#e16737',
    'Jupyter Notebook': '#DA5B0B', Swift: '#F05138', Kotlin: '#A97BFF',
  };

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

  function render(repos) {
    const root = document.getElementById('repo-root');
    if (!root) return;

    const filtered = repos.filter(r => !r.fork && !EXCLUDE.includes(r.name));

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
      `;

      grid.appendChild(card);
    });

    root.innerHTML = '';
    root.appendChild(grid);

    // Clipboard handlers
    grid.addEventListener('click', e => {
      const btn = e.target.closest('.clone-btn');
      if (!btn) return;
      const url = btn.dataset.url;
      navigator.clipboard.writeText(`git clone ${url}`).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
      });
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
