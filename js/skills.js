// Skills/languages badges — aggregates repo languages from cache or API
(function () {
  var USERNAME = 'pidoshva';
  var API_URL = 'https://api.github.com/users/' + USERNAME + '/repos?sort=updated&per_page=30';
  var CACHE_KEY = 'geleus_repos';
  var CACHE_TTL = 3600000;

  function getCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts > CACHE_TTL) return null;
      return parsed.data;
    } catch (e) { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data, ts: Date.now() }));
    } catch (e) { /* ignore */ }
  }

  function render(repos) {
    var root = document.getElementById('skills-root');
    if (!root) return;

    var LANG_COLORS = (window.GELEUS && window.GELEUS.LANG_COLORS) || {};

    // Count language occurrences
    var counts = {};
    repos.forEach(function (repo) {
      if (repo.language) {
        counts[repo.language] = (counts[repo.language] || 0) + 1;
      }
    });

    // Sort by frequency
    var sorted = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    });

    if (sorted.length === 0) {
      root.innerHTML = '';
      return;
    }

    var container = document.createElement('div');
    container.className = 'skills-badges';

    sorted.forEach(function (lang) {
      var color = LANG_COLORS[lang] || '#8b949e';
      var badge = document.createElement('span');
      badge.className = 'skill-badge';
      badge.innerHTML = '<span class="skill-dot" style="background:' + color + '"></span>' + lang;
      container.appendChild(badge);
    });

    root.innerHTML = '';
    root.appendChild(container);
  }

  function init() {
    var cached = getCached();
    if (cached) {
      render(cached);
    }

    fetch(API_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (repos) {
        setCache(repos);
        render(repos);
      })
      .catch(function () {
        if (!cached) {
          var root = document.getElementById('skills-root');
          if (root) root.innerHTML = '';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
