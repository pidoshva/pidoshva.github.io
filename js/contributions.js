// GitHub contribution graph
(function () {
  const USERNAME = 'pidoshva';
  const API_URL = `https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`;
  const CACHE_KEY = 'geleus_contrib';
  const CACHE_TTL = 3600000; // 1 hour

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
    } catch { /* quota exceeded — ignore */ }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function render(contributions) {
    const root = document.getElementById('contrib-root');
    if (!root) return;

    // Build grid
    const graph = document.createElement('div');
    graph.className = 'contrib-graph';
    const grid = document.createElement('div');
    grid.className = 'contrib-grid';

    let totalCount = 0;

    contributions.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'contrib-cell';
      cell.dataset.level = Math.min(day.level, 4);
      cell.dataset.date = day.date;
      cell.dataset.count = day.count;
      totalCount += day.count;
      grid.appendChild(cell);
    });

    graph.appendChild(grid);

    // Footer row: summary left, legend right
    const footer = document.createElement('div');
    footer.className = 'contrib-footer';

    const summary = document.createElement('div');
    summary.className = 'contrib-summary';
    summary.textContent = `${totalCount.toLocaleString()} contributions in the last year`;

    const legend = document.createElement('div');
    legend.className = 'contrib-legend';
    legend.innerHTML = '<span>Less</span>';
    for (let i = 0; i <= 4; i++) {
      legend.innerHTML += `<span class="cell" style="background:var(--contrib-${i})"></span>`;
    }
    legend.innerHTML += '<span>More</span>';

    footer.appendChild(summary);
    footer.appendChild(legend);

    // Wrap in card
    const card = document.createElement('div');
    card.className = 'contrib-card';
    card.appendChild(graph);
    card.appendChild(footer);

    root.innerHTML = '';
    root.appendChild(card);

    // Tooltip
    const tooltip = document.getElementById('contrib-tooltip');
    if (tooltip) {
      grid.addEventListener('mouseover', e => {
        const cell = e.target.closest('.contrib-cell');
        if (!cell) return;
        const count = cell.dataset.count;
        const date = formatDate(cell.dataset.date);
        tooltip.textContent = `${count} contribution${count !== '1' ? 's' : ''} on ${date}`;
        tooltip.classList.add('visible');
      });

      grid.addEventListener('mousemove', e => {
        tooltip.style.left = e.clientX + 12 + 'px';
        tooltip.style.top = e.clientY - 30 + 'px';
      });

      grid.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      // Mobile tap
      grid.addEventListener('click', e => {
        const cell = e.target.closest('.contrib-cell');
        if (!cell) return;
        const count = cell.dataset.count;
        const date = formatDate(cell.dataset.date);
        tooltip.textContent = `${count} contribution${count !== '1' ? 's' : ''} on ${date}`;
        tooltip.classList.add('visible');
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = rect.top - 30 + 'px';
        setTimeout(() => tooltip.classList.remove('visible'), 2000);
      });
    }
  }

  function init() {
    // Show cached data immediately if available
    const cached = getCached();
    if (cached) {
      render(cached);
    }

    // Always fetch fresh in background
    fetch(API_URL)
      .then(r => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(json => {
        const contributions = json.contributions || [];
        setCache(contributions);
        render(contributions);
      })
      .catch(() => {
        if (!cached) {
          const root = document.getElementById('contrib-root');
          if (root) root.innerHTML = '<div class="contrib-loading">Could not load contributions.</div>';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
