// Weekly summary tree timeline — renders /data/weekly-summaries.json
(function () {
  var DATA_URL = '/data/weekly-summaries.json';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatWeekRange(startStr, endStr) {
    var s = new Date(startStr + 'T00:00:00');
    var e = new Date(endStr + 'T00:00:00');
    var sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    var eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    if (sMonth === eMonth) {
      return sMonth + ' ' + s.getDate() + '\u2013' + e.getDate();
    }
    return sMonth + ' ' + s.getDate() + '\u2013' + eMonth + ' ' + e.getDate();
  }

  function getWeekNumber(startStr) {
    var d = new Date(startStr + 'T00:00:00');
    var oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  }

  function formatMetaDate(dateStr) {
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getNextSaturday(fromDate) {
    var d = new Date(fromDate);
    var day = d.getDay();
    var diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function groupByYearMonth(summaries) {
    var tree = {};
    summaries.forEach(function (s) {
      var d = new Date(s.week_start + 'T00:00:00');
      var year = d.getFullYear();
      var month = d.toLocaleDateString('en-US', { month: 'long' });
      var monthNum = d.getMonth();
      if (!tree[year]) tree[year] = {};
      if (!tree[year][month]) tree[year][month] = { num: monthNum, weeks: [] };
      tree[year][month].weeks.push(s);
    });
    // Sort weeks within each month (newest first)
    Object.keys(tree).forEach(function (y) {
      Object.keys(tree[y]).forEach(function (m) {
        tree[y][m].weeks.sort(function (a, b) {
          return new Date(b.week_start) - new Date(a.week_start);
        });
      });
    });
    return tree;
  }

  function buildStatsHtml(stats) {
    var parts = [];
    if (stats.commits) parts.push(stats.commits + ' commit' + (stats.commits !== 1 ? 's' : ''));
    if (stats.repos_active) parts.push(stats.repos_active + ' repo' + (stats.repos_active !== 1 ? 's' : ''));
    if (stats.prs) parts.push(stats.prs + ' PR' + (stats.prs !== 1 ? 's' : ''));
    return parts.length ? '<span class="tree-stats">' + parts.join(' \u00b7 ') + '</span>' : '';
  }

  function buildRepoHtml(repoName, languages, highlights) {
    var LANG_COLORS = (window.GELEUS && window.GELEUS.LANG_COLORS) || {};
    var langHtml = '';
    if (languages && languages.length) {
      langHtml = languages.map(function (l) {
        var color = LANG_COLORS[l] || '#8b949e';
        return '<span class="tree-lang-dot" style="background:' + color + '"></span>' + escapeHtml(l);
      }).join(', ');
      langHtml = '<span class="tree-tags">' + langHtml + '</span>';
    }

    var highlightHtml = '';
    if (highlights && highlights.length) {
      highlightHtml = highlights.map(function (h, i) {
        var connector = (i === highlights.length - 1) ? 'last' : '';
        return '<div class="tree-highlight ' + connector + '">' +
          '<span class="tree-connector">' + (connector ? '\u2514\u2500\u2500' : '\u251C\u2500\u2500') + '</span> ' +
          escapeHtml(h) + '</div>';
      }).join('');
    }

    return '<div class="tree-repo">' +
      '<span class="tree-connector">\u251C\u2500\u2500</span> ' +
      '<span class="tree-repo-name">' + escapeHtml(repoName) + '</span> ' +
      langHtml +
      (highlightHtml ? '<div class="tree-repo-children">' + highlightHtml + '</div>' : '') +
      '</div>';
  }

  function buildWeekHtml(summary, isLatest) {
    var range = formatWeekRange(summary.week_start, summary.week_end);
    var weekNum = getWeekNumber(summary.week_start);
    var collapsed = !isLatest;

    var statsHtml = summary.stats ? buildStatsHtml(summary.stats) : '';

    // Build repo branches with their highlights
    var reposHtml = '';
    if (summary.repos && summary.repos.length) {
      // Map highlights to repos if possible (best effort — assign sequentially)
      var repoHighlights = {};
      summary.repos.forEach(function (r) { repoHighlights[r] = []; });

      if (summary.highlights) {
        // Try to assign highlights to repos by keyword matching
        summary.highlights.forEach(function (h) {
          var matched = false;
          summary.repos.forEach(function (r) {
            if (!matched && h.toLowerCase().indexOf(r.toLowerCase()) !== -1) {
              repoHighlights[r].push(h);
              matched = true;
            }
          });
          // Unmatched highlights go to first repo
          if (!matched && summary.repos.length) {
            repoHighlights[summary.repos[0]].push(h);
          }
        });
      }

      // Determine per-repo languages (best effort from summary.languages)
      summary.repos.forEach(function (repoName) {
        reposHtml += buildRepoHtml(repoName, null, repoHighlights[repoName]);
      });
    }

    var summaryQuote = summary.summary
      ? '<div class="tree-summary">\u201C' + escapeHtml(summary.summary) + '\u201D</div>'
      : '';

    return '<div class="tree-week' + (collapsed ? ' collapsed' : '') + '">' +
      '<div class="tree-node" role="button" tabindex="0">' +
        '<span class="tree-chevron"><i class="fas fa-chevron-' + (collapsed ? 'right' : 'down') + '"></i></span>' +
        '<span class="tree-connector">\u251C\u2500\u2500</span> ' +
        'Week ' + weekNum + ' (' + range + ') ' +
        statsHtml +
      '</div>' +
      '<div class="tree-children">' +
        reposHtml +
        summaryQuote +
      '</div>' +
    '</div>';
  }

  function render(data) {
    var root = document.getElementById('summary-root');
    if (!root) return;

    var summaries = data.summaries || [];
    if (summaries.length === 0) {
      root.innerHTML = '<div class="tree-empty">No summaries yet. First update coming Friday.</div>';
      return;
    }

    // Sort newest first for finding "latest"
    summaries.sort(function (a, b) {
      return new Date(b.week_start) - new Date(a.week_start);
    });

    var latestStart = summaries[0].week_start;
    var latestGenerated = summaries[0].generated;
    var latestTrigger = summaries[0].trigger || 'schedule';

    var tree = groupByYearMonth(summaries);
    var years = Object.keys(tree).sort(function (a, b) { return b - a; });

    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth();

    var html = '<div class="timeline-tree">';

    years.forEach(function (year, yi) {
      var yearConnector = (yi === years.length - 1) ? '\u2514\u2500\u2500' : '\u251C\u2500\u2500';
      var yearPipe = (yi === years.length - 1) ? '&nbsp;&nbsp;&nbsp;' : '\u2502&nbsp;&nbsp;';

      html += '<div class="tree-year">';
      html += '<div class="tree-node tree-year-label">' +
        '<span class="tree-connector">' + yearConnector + '</span> ' +
        '<strong>' + year + '</strong></div>';

      var months = Object.keys(tree[year]).sort(function (a, b) {
        return tree[year][b].num - tree[year][a].num;
      });

      html += '<div class="tree-children">';
      months.forEach(function (month, mi) {
        var monthNum = tree[year][month].num;
        var isCurrentMonth = (parseInt(year) === currentYear && monthNum === currentMonth);
        var monthCollapsed = !isCurrentMonth;
        var monthConnector = (mi === months.length - 1) ? '\u2514\u2500\u2500' : '\u251C\u2500\u2500';

        html += '<div class="tree-month' + (monthCollapsed ? ' collapsed' : '') + '">';
        html += '<div class="tree-node" role="button" tabindex="0">' +
          '<span class="tree-chevron"><i class="fas fa-chevron-' + (monthCollapsed ? 'right' : 'down') + '"></i></span>' +
          '<span class="tree-connector">' + monthConnector + '</span> ' +
          month +
          '</div>';

        html += '<div class="tree-children">';
        tree[year][month].weeks.forEach(function (week) {
          var isLatest = week.week_start === latestStart;
          html += buildWeekHtml(week, isLatest);
        });
        html += '</div></div>';
      });
      html += '</div></div>';
    });

    // Meta footer
    html += '<div class="tree-meta">';
    html += 'Last updated: ' + formatMetaDate(latestGenerated);
    if (latestTrigger === 'schedule') {
      html += ' \u00b7 Next update: ' + getNextSaturday(latestGenerated);
    }
    html += '</div>';

    html += '</div>';

    root.innerHTML = html;

    // Expand/collapse click handlers
    root.querySelectorAll('.tree-node[role="button"]').forEach(function (node) {
      node.addEventListener('click', function () {
        var parent = node.parentElement;
        parent.classList.toggle('collapsed');
        var icon = node.querySelector('.tree-chevron i');
        if (parent.classList.contains('collapsed')) {
          icon.className = 'fas fa-chevron-right';
        } else {
          icon.className = 'fas fa-chevron-down';
        }
      });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          node.click();
        }
      });
    });
  }

  function init() {
    fetch(DATA_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(render)
      .catch(function () {
        var root = document.getElementById('summary-root');
        if (root) root.innerHTML = '<div class="tree-empty">No summaries yet. First update coming Friday.</div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
