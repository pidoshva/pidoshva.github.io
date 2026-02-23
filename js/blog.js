// Blog listing + post renderer
(function () {
  var POSTS_URL = '/blog/posts.json';
  var SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // --- Listing page ---

  function renderListing(posts) {
    var root = document.getElementById('blog-list-root');
    if (!root) return;

    var visible = posts.filter(function (p) { return !p.draft; });
    visible.sort(function (a, b) { return b.date.localeCompare(a.date); });

    if (visible.length === 0) {
      root.innerHTML =
        '<div class="empty-state">' +
          '<div class="cursor-block">_<span class="cursor-blink"></span></div>' +
          '<p>Nothing here yet. Posts are coming soon — check back later or follow me on ' +
          '<a href="https://github.com/pidoshva" target="_blank" rel="noopener">GitHub</a> for updates.</p>' +
        '</div>';
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'blog-grid';

    visible.forEach(function (post) {
      var card = document.createElement('a');
      card.className = 'blog-card';
      card.href = '/blog/post.html?slug=' + encodeURIComponent(post.slug);

      var tagsHtml = '';
      if (post.tags && post.tags.length) {
        tagsHtml = '<div class="blog-tags">' +
          post.tags.map(function (t) { return '<span class="blog-tag">' + escapeHtml(t) + '</span>'; }).join('') +
          '</div>';
      }

      card.innerHTML =
        '<div class="blog-card-date">' + escapeHtml(formatDate(post.date)) + '</div>' +
        '<h3>' + escapeHtml(post.title) + '</h3>' +
        '<p class="blog-card-excerpt">' + escapeHtml(post.excerpt) + '</p>' +
        tagsHtml;

      grid.appendChild(card);
    });

    root.innerHTML = '';
    root.appendChild(grid);
  }

  function initListing() {
    fetch(POSTS_URL)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) { renderListing(data.posts || []); })
      .catch(function () {
        var root = document.getElementById('blog-list-root');
        if (root) {
          root.innerHTML = '<div class="blog-error">Could not load posts. Try again later.</div>';
        }
      });
  }

  // --- Post reader page ---

  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    if (!slug || !SLUG_RE.test(slug)) return null;
    return slug;
  }

  function initPost() {
    var slug = getSlug();
    if (!slug) {
      window.location.replace('/blog/');
      return;
    }

    var root = document.getElementById('post-root');
    if (!root) return;

    Promise.all([
      fetch(POSTS_URL).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }),
      fetch('/blog/posts/' + slug + '.md').then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
    ])
      .then(function (results) {
        var data = results[0];
        var markdown = results[1];

        var posts = data.posts || [];
        var meta = null;
        for (var i = 0; i < posts.length; i++) {
          if (posts[i].slug === slug) { meta = posts[i]; break; }
        }

        if (!meta) {
          window.location.replace('/blog/');
          return;
        }

        // Update page title and meta
        document.title = meta.title + ' — geleus';
        var ogTitle = document.querySelector('meta[property="og:title"]');
        var ogDesc = document.querySelector('meta[property="og:description"]');
        var metaDesc = document.querySelector('meta[name="description"]');
        if (ogTitle) ogTitle.setAttribute('content', meta.title + ' — geleus');
        if (ogDesc) ogDesc.setAttribute('content', meta.excerpt);
        if (metaDesc) metaDesc.setAttribute('content', meta.excerpt);

        // Build tags HTML
        var tagsHtml = '';
        if (meta.tags && meta.tags.length) {
          tagsHtml = '<div class="blog-tags">' +
            meta.tags.map(function (t) { return '<span class="blog-tag">' + escapeHtml(t) + '</span>'; }).join('') +
            '</div>';
        }

        // Render
        root.innerHTML =
          '<article class="post-article">' +
            '<header class="post-header">' +
              '<h1>' + escapeHtml(meta.title) + '</h1>' +
              '<div class="post-meta">' +
                '<time>' + escapeHtml(formatDate(meta.date)) + '</time>' +
                tagsHtml +
              '</div>' +
            '</header>' +
            '<div class="post-content">' + marked.parse(markdown) + '</div>' +
            '<footer class="post-footer">' +
              '<a href="/blog/" class="back-link"><i class="fas fa-arrow-left"></i> back to blog</a>' +
            '</footer>' +
          '</article>';

        // Syntax highlighting
        if (window.hljs) {
          root.querySelectorAll('pre code').forEach(function (block) {
            hljs.highlightElement(block);
          });
        }
      })
      .catch(function () {
        window.location.replace('/blog/');
      });
  }

  // --- Init ---

  function init() {
    if (document.getElementById('blog-list-root')) {
      initListing();
    } else if (document.getElementById('post-root')) {
      initPost();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
