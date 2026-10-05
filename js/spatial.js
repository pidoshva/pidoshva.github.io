// Spatial home app — the interactive node-cluster that IS the homepage (v2).
//
// One cluster of 96 linked nodes sits on a continuous timeline of five sections
// (home → about → goodies → blog → journal). Scrolling the wheel, swiping, arrow keys
// or clicking a lit node SCRUBS that timeline: the cluster pours (staggered, per node)
// from one shape into the next — nebula, torus knot, nested crystal, standing wave,
// spine — and snaps to the nearest section when you stop. Translucent faces, depth of
// field, a cursor lens, motion trails, lightning bolts and a deep parallax field dress it.
//
// Content lives in a floating glass WINDOW that is part of the scene: draggable by its
// title bar, resizable on 8 handles, remembered in localStorage (`geleus_win`). The
// cluster reflows into the largest free region beside it; the window's corners tether to
// the nearest nodes and the active section's node docks to its title bar. Blog posts and
// repo READMEs open in a full-screen reader overlay. Deep-linkable via #hash; back/forward
// work; Esc returns. Modules (goodies/blog/summary/contributions) fill their usual roots
// inside the window. Geometry + draw passes are shared with cluster.js via js/geo.js.
// Pure vanilla JS. Respects prefers-reduced-motion. Full math: ARCHITECTURE.md §11.
(function () {
  var G = window.GELEUS && window.GELEUS.geo;
  if (!G) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var N = G.N, CAM = G.CAM, rand = G.rand, lerp = G.lerp, clamp = G.clamp, easeIO = G.easeIO, nearOf = G.nearOf;
  var cv = $('spatialCanvas'); if (!cv) return;
  var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), T = 0;

  // --- sections: the timeline. index = position on it; ANCH = the lit node that carries the label ---
  var SHAPES = G.buildShapes();
  var SEC = [
    { key: 'home',    n: '00', shape: 'nebula',  pitch: -0.28, desc: 'a loose cluster of 96 nodes. scroll to morph it.' },
    { key: 'about',   n: '01', shape: 'knot',    pitch: -0.55, desc: 'two strands, one surface. who i am and where i am from.' },
    { key: 'goodies', n: '02', shape: 'crystal', pitch: -0.22, desc: 'three nested shells. open-source repos and experiments.' },
    { key: 'blog',    n: '03', shape: 'field',   pitch: -0.6,  desc: 'a standing wave. notes, writeups, things learned.' },
    { key: 'journal', n: '04', shape: 'spine',   pitch: -0.08, desc: 'a trunk with branches. the week, auto-generated.' },
    { key: 'resume',  n: '05', shape: 'helix',   pitch: -0.35, desc: 'a double helix. the interactive terminal r\u00e9sum\u00e9 \u2014 type help.' }
  ];
  var SHAPE_LABEL = { nebula: 'nebula', knot: 'torus knot', crystal: 'crystal', field: 'field', spine: 'spine', helix: 'helix' };
  SEC.forEach(function (s) { s.S = SHAPES[s.shape]; });
  var LAST = SEC.length - 1, ANCH = [5, 20, 41, 63, 84, 70];
  function posAt(i) { return (SEC[i].S.dynamic && !reduced) ? G.field(T) : SEC[i].S.pos; }
  function idxOfKey(k) { for (var i = 0; i < SEC.length; i++) if (SEC[i].key === k) return i; return 0; }
  function keyFromHash() { return idxOfKey(location.hash.slice(1)); }

  var BG = G.bgField(90);

  // --- state ---
  var p = 0, tp = 0, shown = -1, lastSec = -1;
  var yaw = 0.6, tgtYaw = 0.6, pitch = -0.28, userPitch = 0;
  var cxS = 0, cyS = 0, sclS = 0, winOpen = false;
  var drag = false, lx = 0, ly = 0, moved = 0, ptype = 'mouse', mouseX = -1, mouseY = -1, hovered = -1;
  var DEL = []; for (var di = 0; di < N; di++) DEL.push(rand(di * 3.3 + 9) * 0.4); // per-node morph delay
  var cur = new Array(N), sp = new Array(N), ox = [], oy = [];
  for (var oi = 0; oi < N; oi++) { ox.push(0); oy.push(0); }
  var tickPts = [], identTop = 0, mobTop = 0, frames = 0, fps = 0, fpsT = performance.now(), fpsN = 0;
  var bolts = G.boltLayer(2, 0.8);

  // --- DOM ---
  var win = $('win'), winBar = $('winBar'), winDim = $('winDim'), winBody = $('winBody');
  var pages = document.querySelectorAll('#win section[data-page]');
  var navBtns = document.querySelectorAll('.hud-nav [data-node]'), ticks = document.querySelectorAll('.rail .tick');
  var railDot = $('railDot'), hint = $('hint'), ident = document.querySelector('.hero-id');
  var tele = { links: $('tLinks'), faces: $('tFaces'), morph: $('tMorph'), rot: $('tRot'), fps: $('tFps') };

  var vigC = document.createElement('canvas'), grain = G.makeGrain();
  var rail = document.querySelector('.rail'), hud = document.querySelector('.hud-top');
  function measure() {
    var cr = cv.getBoundingClientRect();
    // phones: the rail docks just under the (possibly wrapped) nav, so place it from the measured header
    if (rail && hud) rail.style.top = (W <= 760) ? (hud.getBoundingClientRect().bottom - cr.top + 10) + 'px' : '';
    tickPts = Array.prototype.map.call(document.querySelectorAll('.rail .tick-dot'), function (el) {
      var r = el.getBoundingClientRect(); return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    });
    if (ident) identTop = ident.getBoundingClientRect().top - cr.top;
    if (rail) mobTop = rail.getBoundingClientRect().bottom - cr.top + 8;
  }
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    G.buildVignette(vigC, W, H, dpr); measure();
  }

  // --- the window: dragged, resized, remembered ---
  var WIN = { x: 0, y: 0, w: 0, h: 0 }, WKEY = 'geleus_win';
  function defaultWin() { WIN.w = clamp(W * 0.48, 420, 760); WIN.h = clamp(H * 0.74, 340, 900); WIN.x = Math.max(16, W - WIN.w - 190); WIN.y = (H - WIN.h) / 2 + 8; }
  function clampWin() {
    WIN.w = clamp(WIN.w, 320, W - 32); WIN.h = clamp(WIN.h, 240, H - 32);
    WIN.x = clamp(WIN.x, 16, W - WIN.w - 16); WIN.y = clamp(WIN.y, 16, H - WIN.h - 16);
  }
  function applyWin(save) {
    clampWin();
    win.style.left = WIN.x + 'px'; win.style.top = WIN.y + 'px'; win.style.width = WIN.w + 'px'; win.style.height = WIN.h + 'px';
    if (winDim) winDim.textContent = Math.round(WIN.w) + ' × ' + Math.round(WIN.h);
    if (window.GELEUS.resumeResize) window.GELEUS.resumeResize();
    if (save) { try { localStorage.setItem(WKEY, JSON.stringify(WIN)); } catch (e) {} }
  }
  function loadWin() {
    var ok = false;
    try { var j = JSON.parse(localStorage.getItem(WKEY) || 'null');
      if (j && j.w > 0 && j.h > 0 && j.x + j.w <= W && j.y + j.h <= H) { WIN = { x: j.x, y: j.y, w: j.w, h: j.h }; ok = true; } } catch (e) {}
    if (!ok) defaultWin();
    applyWin(false);
  }
  // the cluster takes the largest free region beside the window (clear of the HUD strip
  // and the identity block), sized to lean slightly under the window's glass
  function layoutTarget() {
    var base = Math.min(W, H) * (W < 700 ? 0.42 : 0.34);
    if (!(tp > 0)) return { cx: W / 2, cy: H / 2, s: base };
    if (W <= 760) { // phone: the window is a 62% bottom sheet; the cluster fits the band above it
      var mt = mobTop || 110, mb = H * 0.38, mh = mb - mt;
      return { cx: W / 2, cy: mt + mh / 2, s: clamp(Math.min(W * 0.9, mh) * 0.5, base * 0.35, base) };
    }
    var top = 72, bot = (identTop || H - 215) - 10;
    var regs = [
      { x: 0, y: top, w: WIN.x, h: bot - top },
      { x: WIN.x + WIN.w, y: top, w: W - WIN.x - WIN.w - 150, h: bot - top },
      { x: 0, y: top, w: W, h: WIN.y - top },
      { x: 0, y: WIN.y + WIN.h, w: W, h: bot - WIN.y - WIN.h }
    ], R = regs[0];
    for (var i = 1; i < regs.length; i++) if (Math.min(regs[i].w, regs[i].h) > Math.min(R.w, R.h)) R = regs[i];
    var m = Math.min(R.w, R.h);
    return { cx: R.x + R.w / 2, cy: R.y + R.h / 2, s: clamp(m * 0.43, base * 0.4, base) };
  }
  var wdrag = null, wres = null;
  function endWin() { if (wdrag || wres) { wdrag = null; wres = null; win.classList.remove('moving'); applyWin(true); } }
  if (winBar) {
    winBar.addEventListener('pointerdown', function (e) {
      if (W <= 760 || (e.target.closest && e.target.closest('button, a'))) return;
      wdrag = { x: e.clientX, y: e.clientY, wx: WIN.x, wy: WIN.y }; winBar.setPointerCapture(e.pointerId); win.classList.add('moving'); e.preventDefault();
    });
    winBar.addEventListener('pointermove', function (e) { if (!wdrag) return; WIN.x = wdrag.wx + e.clientX - wdrag.x; WIN.y = wdrag.wy + e.clientY - wdrag.y; applyWin(false); });
    winBar.addEventListener('pointerup', endWin); winBar.addEventListener('pointercancel', endWin);
  }
  Array.prototype.forEach.call(document.querySelectorAll('#win .h'), function (h) {
    h.addEventListener('pointerdown', function (e) {
      wres = { d: h.getAttribute('data-d'), x: e.clientX, y: e.clientY, r: { x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h } };
      h.setPointerCapture(e.pointerId); win.classList.add('moving'); e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      if (!wres) return;
      var d = wres.d, dx = e.clientX - wres.x, dy = e.clientY - wres.y, r = wres.r;
      if (d.indexOf('e') >= 0) WIN.w = r.w + dx;
      if (d.indexOf('s') >= 0) WIN.h = r.h + dy;
      if (d.indexOf('w') >= 0) { var nw = clamp(r.w - dx, 320, r.x + r.w - 16); WIN.x = r.x + r.w - nw; WIN.w = nw; }
      if (d.indexOf('n') >= 0) { var nh = clamp(r.h - dy, 240, r.y + r.h - 16); WIN.y = r.y + r.h - nh; WIN.h = nh; }
      applyWin(false);
    });
    h.addEventListener('pointerup', endWin); h.addEventListener('pointercancel', endWin);
  });
  var fitBtn = $('winFit');
  if (fitBtn) fitBtn.addEventListener('click', function () {
    WIN.h = clamp(winBody.scrollHeight + winBar.offsetHeight + 2, 240, H - 32);
    WIN.w = Math.max(320, Math.min(WIN.w, 560)); applyWin(true);
  });

  // --- navigation / routing ---
  var typeTimer, statusEl = $('status');
  function typeStatus(s) {
    if (!statusEl) return;
    clearTimeout(typeTimer); var i = 0; statusEl.textContent = '';
    if (reduced) { statusEl.textContent = s; return; }
    (function step() { statusEl.textContent = s.slice(0, ++i); if (i < s.length) typeTimer = setTimeout(step, 14 + rand(i) * 24); })();
  }
  function liveUpdate() { // follows the scrub target continuously
    var i = Math.round(tp), S = SEC[i];
    Array.prototype.forEach.call(navBtns, function (b) { b.classList.toggle('active', b.getAttribute('data-node') === S.key); });
    Array.prototype.forEach.call(ticks, function (b) { b.classList.toggle('active', +b.getAttribute('data-i') === i); });
    var ey = $('eyebrow'); if (ey) ey.textContent = S.n + ' / ' + S.key + ' — ' + SHAPE_LABEL[S.shape];
    if (i !== lastSec) { lastSec = i; typeStatus(S.desc); }
  }
  // go(i): set the timeline target; pushes history unless silent (popstate / initial)
  function go(i, silent) {
    tp = clamp(Math.round(i), 0, LAST); liveUpdate(); if (hint) hint.classList.add('gone');
    if (shown !== tp) settle(-1);                  // never show a stale section while the morph travels
    if (silent) return;
    var key = SEC[tp].key, url = tp === 0 ? (location.pathname + location.search) : '#' + key;
    if (keyFromHash() !== tp || (tp === 0 && location.hash)) {
      try { history.pushState({ key: key }, '', url); } catch (e) { location.hash = tp === 0 ? '' : key; }
    }
  }
  function settle(i) { // the window opens only once the morph has landed
    if (i === shown) return; shown = i; winOpen = i > 0;
    document.body.classList.toggle('win-open', winOpen);
    if (i <= 0) { win.classList.remove('open'); win.setAttribute('aria-hidden', 'true'); return; }
    Array.prototype.forEach.call(pages, function (s) { s.hidden = (+s.getAttribute('data-page') !== i); });
    var tag = $('winTag'); if (tag) tag.textContent = SEC[i].n + ' / ' + SEC[i].key;
    win.classList.add('open'); win.setAttribute('aria-hidden', 'false'); if (winBody) winBody.scrollTop = 0;
    if (SEC[i].key === 'resume') loadResume();
  }
  // --- r\u00e9sum\u00e9 terminal: jquery + jquery.terminal + js/resume.js are fetched the first time the window opens ---
  var resumeState = 0; // 0 idle \u00b7 1 loading \u00b7 2 ready
  function loadScript(src) { return new Promise(function (res, rej) { var el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function loadStyle(href) { return new Promise(function (res, rej) { var el = document.createElement('link'); el.rel = 'stylesheet'; el.href = href; el.onload = res; el.onerror = rej; document.head.appendChild(el); }); }
  function loadResume() {
    var root = $('resume-root');
    if (!root) return;
    if (resumeState === 2) { if (window.GELEUS.resumeResize) window.GELEUS.resumeResize(); if (window.GELEUS.resumeFocus) window.GELEUS.resumeFocus(); return; }
    if (resumeState === 1) return;
    resumeState = 1;
    loadStyle('/lib/jquery.terminal/jquery.terminal.min.css')
      .then(function () { return loadScript('/lib/jquery/jquery.min.js'); })
      .then(function () { return loadScript('/lib/jquery.terminal/jquery.terminal.min.js'); })
      .then(function () { return loadScript('/lib/jquery.terminal/less.min.js'); })
      .then(function () { return loadScript('/lib/jquery.terminal/autocomplete_menu.js'); })
      .then(function () { return loadScript('/js/resume.js?v=1'); })
      .then(function () {
        resumeState = 2; root.innerHTML = '';
        if (window.GELEUS.initResume) window.GELEUS.initResume(root);
      })
      .catch(function () { resumeState = 0; root.innerHTML = '<p class="blog-error">Could not load the terminal. <a href="https://github.com/pidoshva">See GitHub instead \u2192</a></p>'; });
  }
  window.GELEUS.goSection = function (key) { go(idxOfKey(key)); };
  Array.prototype.forEach.call(navBtns, function (b) {
    b.addEventListener('click', function () {
      go(idxOfKey(b.getAttribute('data-node')));
    });
  });
  Array.prototype.forEach.call(ticks, function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
  var closeBtn = $('winClose'); if (closeBtn) closeBtn.addEventListener('click', function () { go(0); });
  window.addEventListener('popstate', function () { go(keyFromHash(), true); });

  var snapT;
  function scrub(d) {
    tp = clamp(tp + d, 0, LAST); liveUpdate(); if (hint) hint.classList.add('gone');
    clearTimeout(snapT); snapT = setTimeout(function () { go(Math.round(tp)); }, 360);
  }
  window.addEventListener('wheel', function (e) {
    if (e.target.closest && e.target.closest('#win, .reader-overlay')) return; // let content scroll
    e.preventDefault(); scrub(e.deltaY * 0.0014);
  }, { passive: false });

  // --- full-screen reader: blog posts + repo READMEs (shared overlay) ---
  var postOverlay = $('postOverlay'), postContent = $('post-overlay-content'), postClose = $('postClose');
  function openReader() { postContent.innerHTML = ''; postOverlay.classList.add('open'); postOverlay.setAttribute('aria-hidden', 'false'); postOverlay.scrollTop = 0; }
  function openPost(slug) {
    if (!postOverlay || !postContent || !window.GELEUS.loadPost) return false;
    openReader();
    window.GELEUS.loadPost(slug, postContent).catch(function () {
      postContent.innerHTML = '<p class="blog-error">Could not load this post. <a href="/blog/post.html?slug=' + encodeURIComponent(slug) + '">Open it on the full page →</a></p>';
    });
    return true;
  }
  function openReadme(repo, branch) {
    if (!postOverlay || !postContent || !window.GELEUS.loadReadme) return false;
    openReader();
    window.GELEUS.loadReadme(repo, branch, postContent).catch(function () { postContent.innerHTML = '<p class="blog-error">Could not load the README.</p>'; });
    return true;
  }
  function closeReader() { if (!postOverlay) return; postOverlay.classList.remove('open'); postOverlay.setAttribute('aria-hidden', 'true'); }
  if (postClose) postClose.addEventListener('click', closeReader);
  if (postOverlay) postOverlay.addEventListener('click', function (e) { if (e.target === postOverlay) closeReader(); });
  // README buttons use capture so goodies.js's inline expander doesn't also fire
  win.addEventListener('click', function (e) {
    var rbtn = e.target.closest('.repo-expand-btn');
    if (rbtn && openReadme(rbtn.getAttribute('data-repo'), rbtn.getAttribute('data-branch'))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  win.addEventListener('click', function (e) {
    var card = e.target.closest('.blog-card'); if (!card) return;
    var m = (card.getAttribute('href') || '').match(/slug=([^&]+)/), slug = m ? decodeURIComponent(m[1]) : null;
    if (slug && openPost(slug)) e.preventDefault(); // else fall back to /blog/post.html
  });

  window.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.key !== 'Escape') return; // the terminal owns its keys
    if (e.key === 'Escape') { if (postOverlay && postOverlay.classList.contains('open')) closeReader(); else if (tp !== 0) go(0); else return; }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') go(Math.round(tp) + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') go(Math.round(tp) - 1);
    else if (/^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) go(+e.key - 1);
    else return;
    e.preventDefault();
  });

  // --- pointer on the canvas: drag rotates (mouse) / vertical swipe scrubs (touch); tap a lit node ---
  function rel(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (e) { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; ptype = e.pointerType; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    var q = rel(e); mouseX = q.x; mouseY = q.y;
    if (!drag) return;
    var dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY;
    if (ptype === 'touch') { if (Math.abs(dy) > Math.abs(dx)) scrub(-dy * 0.006); else tgtYaw += dx * 0.007; }
    else { tgtYaw += dx * 0.006; userPitch = clamp(userPitch + dy * 0.006, -1, 1); }
  });
  function pickAnchor(x, y) { // nearest lit node within 22 px (touch has no hover, so pick on release)
    var best = -1, hb = 22 * 22;
    for (var ai = 0; ai < ANCH.length; ai++) { var Q = sp[ANCH[ai]]; if (!Q) continue; var dx = Q.x - x, dy = Q.y - y, dd = dx * dx + dy * dy; if (dd < hb) { hb = dd; best = ai; } }
    return best;
  }
  cv.addEventListener('pointerup', function (e) {
    drag = false;
    if (moved < 6) { var q = rel(e), hit = pickAnchor(q.x, q.y); if (hit >= 0) go(hit); else if (Math.round(tp) !== 0) go(0); }
    if (ptype === 'touch') { mouseX = -1; mouseY = -1; }
  });
  cv.addEventListener('pointerleave', function () { mouseX = -1; mouseY = -1; });
  window.addEventListener('pointerup', function () { drag = false; });

  // --- render ---
  function draw() {
    if (reduced) p = tp; else p += (tp - p) * 0.075;
    var i = clamp(Math.floor(p + 1e-6), 0, LAST), f = clamp(p - i, 0, 1), ri = Math.round(p), S = SEC[ri], k;
    if (!reduced && ri === 0 && !drag && hovered < 0) tgtYaw += 0.0035;
    yaw += (tgtYaw - yaw) * 0.07;
    pitch += ((S.pitch + userPitch) - pitch) * 0.05;
    var L = layoutTarget();
    if (sclS === 0) { cxS = L.cx; cyS = L.cy; sclS = L.s; }
    cxS += (L.cx - cxS) * 0.08; cyS += (L.cy - cyS) * 0.08; sclS += (L.s - sclS) * 0.08;

    // staggered morph: each node leaves on its own delay so the cluster "pours"
    var A = posAt(i), B = (f > 1e-4 && i < LAST) ? posAt(i + 1) : null;
    for (k = 0; k < N; k++) {
      if (!B) cur[k] = A[k];
      else { var e = easeIO(clamp((f - DEL[k]) / 0.6, 0, 1)); cur[k] = { x: lerp(A[k].x, B[k].x, e), y: lerp(A[k].y, B[k].y, e), z: lerp(A[k].z, B[k].z, e) }; }
    }
    var ef = B ? easeIO(f) : 0;

    // trails: clear less when things move fast
    var speed = Math.abs(tp - p) * 1.6 + Math.abs(tgtYaw - yaw) * 0.9, ta = reduced ? 1 : clamp(1 - speed * 2.4, 0.28, 1);
    ctx.fillStyle = 'rgba(14,16,15,' + ta.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(vigC, 0, 0, W, H);

    var px = mouseX >= 0 ? (mouseX - W / 2) * 0.02 : 0, py = mouseY >= 0 ? (mouseY - H / 2) * 0.02 : 0;
    G.drawDeepField(ctx, BG, W, H, T, px, py, reduced);

    // project + cursor lens (nodes near the pointer are pushed aside and spring back)
    var cx = cxS, cy = cyS, scale = sclS;
    for (k = 0; k < N; k++) {
      var r = G.rotP(cur[k], yaw, pitch), fz = CAM / (CAM + r.z), x = cx + r.x * fz * scale, y = cy + r.y * fz * scale, tx = 0, ty = 0;
      if (mouseX >= 0 && !drag) { var dx = x - mouseX, dy = y - mouseY, d = Math.sqrt(dx * dx + dy * dy), R = 150;
        if (d < R && d > 0.01) { var s = 1 - d / R, push = s * s * 26; tx = dx / d * push; ty = dy / d * push; } }
      ox[k] += (tx - ox[k]) * 0.18; oy[k] += (ty - oy[k]) * 0.18;
      sp[k] = { x: x + ox[k], y: y + oy[k], z: r.z, rx: r.x, ry: r.y };
    }

    if (B) { G.drawFaces(ctx, sp, SEC[i].S.tris, 1 - ef); G.drawFaces(ctx, sp, SEC[i + 1].S.tris, ef); G.drawEdges(ctx, sp, SEC[i].S.edges, 1 - ef); G.drawEdges(ctx, sp, SEC[i + 1].S.edges, ef); }
    else { G.drawFaces(ctx, sp, SEC[i].S.tris, 1); G.drawEdges(ctx, sp, SEC[i].S.edges, 1); }
    if (!reduced && !B) G.drawPulses(ctx, sp, SEC[i].S.edges, T, 3);
    G.drawNodes(ctx, sp);
    if (!reduced && !B) G.stepBolts(ctx, bolts, function () { return G.closestUnlinked(sp, SEC[i].S.eset, scale * 0.2, W, H); }, T);

    // anchors: hover test, lit node + label, leader line to its rail tick
    hovered = -1;
    if (mouseX >= 0 && !drag) { var hb = 22 * 22;
      for (var ai = 0; ai < ANCH.length; ai++) { var Q = sp[ANCH[ai]], ddx = Q.x - mouseX, ddy = Q.y - mouseY, dd = ddx * ddx + ddy * ddy; if (dd < hb) { hb = dd; hovered = ai; } } }
    cv.style.cursor = drag ? 'grabbing' : (hovered >= 0 ? 'pointer' : 'grab');
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, Menlo, monospace';
    for (ai = 0; ai < ANCH.length; ai++) {
      var Pq = sp[ANCH[ai]], nq = nearOf(Pq.z), act = (ai === ri || ai === hovered), rq = 2.6 + nq * 2.2;
      var g3 = ctx.createRadialGradient(Pq.x, Pq.y, 0, Pq.x, Pq.y, rq * 3.6); g3.addColorStop(0, 'rgba(168,200,145,' + (act ? 0.55 : 0.3) + ')'); g3.addColorStop(1, 'rgba(168,200,145,0)');
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(Pq.x, Pq.y, rq * 3.6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(230,240,222,1)'; ctx.beginPath(); ctx.arc(Pq.x, Pq.y, rq, 0, 7); ctx.fill();
      if (act) { ctx.strokeStyle = 'rgba(168,200,145,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(Pq.x, Pq.y, rq + 5 + Math.sin(T * 3) * 1.2, 0, 7); ctx.stroke(); }
      ctx.fillStyle = 'rgba(230,232,228,' + (act ? 0.98 : 0.42 + nq * 0.3).toFixed(2) + ')';
      ctx.fillText(SEC[ai].n + ' ' + SEC[ai].key, Pq.x + rq + 7, Pq.y + 4);
      var tk = tickPts[ai];
      if (tk) {
        ctx.setLineDash(act ? [] : [2, 5]); ctx.lineWidth = 1; ctx.strokeStyle = act ? 'rgba(143,175,120,.6)' : 'rgba(120,134,124,.16)';
        ctx.beginPath(); ctx.moveTo(Pq.x, Pq.y);
        if (W > 760) { var mx = tk.x - 56; ctx.lineTo(mx, Pq.y); ctx.lineTo(mx + 18, tk.y); ctx.lineTo(tk.x - 8, tk.y); }
        else { var my = tk.y + 40; ctx.lineTo(Pq.x, my); ctx.lineTo(tk.x, my - 14); ctx.lineTo(tk.x, tk.y + 8); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // the window belongs to the scene: corners tether to the nearest nodes, the active node docks to the title bar
    if (winOpen && W > 760) {
      var corners = [[WIN.x, WIN.y], [WIN.x + WIN.w, WIN.y], [WIN.x, WIN.y + WIN.h], [WIN.x + WIN.w, WIN.y + WIN.h]];
      ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      for (var ci = 0; ci < 4; ci++) {
        var cxw = corners[ci][0], cyw = corners[ci][1], bn = -1, bdd = 1e12;
        for (k = 0; k < N; k++) { if (nearOf(sp[k].z) < 0.3) continue; var ex = sp[k].x - cxw, ey = sp[k].y - cyw, edd = ex * ex + ey * ey; if (edd < bdd) { bdd = edd; bn = k; } }
        if (bn >= 0) {
          var al = clamp(1 - Math.sqrt(bdd) / (Math.min(W, H) * 0.7), 0.08, 0.5);
          ctx.strokeStyle = 'rgba(143,175,120,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(cxw, cyw); ctx.lineTo(sp[bn].x, sp[bn].y); ctx.stroke();
          ctx.fillStyle = 'rgba(168,200,145,' + (al + 0.3).toFixed(3) + ')'; ctx.fillRect(cxw - 2.5, cyw - 2.5, 5, 5);
        }
      }
      ctx.setLineDash([]);
      var dock = sp[ANCH[ri]], dkx = WIN.x, dky = WIN.y + 18;
      ctx.strokeStyle = 'rgba(168,200,145,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(dock.x, dock.y); ctx.lineTo(dkx, dky); ctx.stroke();
      ctx.fillStyle = 'rgba(168,200,145,.95)'; ctx.beginPath(); ctx.arc(dkx, dky, 3, 0, 7); ctx.fill();
    }

    ctx.globalAlpha = 0.055; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;

    // settle → window; rail dot; telemetry
    settle((Math.abs(p - tp) < 0.02 && tp === Math.round(tp)) ? tp : -1);
    if (railDot && tickPts.length === SEC.length && W > 760) {
      var rr0 = railDot.parentNode.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      railDot.style.top = (lerp(tickPts[0].y, tickPts[LAST].y, p / LAST) - (rr0.top - cr.top)) + 'px';
    }
    frames++; fpsN++; var now = performance.now();
    if (now - fpsT > 500) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; }
    if (frames % 6 === 0 && tele.links) {
      tele.links.textContent = S.S.edges.length; tele.faces.textContent = S.S.tris.length;
      tele.morph.textContent = Math.round(p / LAST * 100) + '%';
      tele.rot.textContent = Math.round((yaw * 180 / Math.PI) % 360) + '° · ' + Math.round(pitch * 180 / Math.PI) + '°';
      tele.fps.textContent = fps + ' fps';
    }
    if (frames % 30 === 0) measure();
  }
  function frame() { if (!reduced) T += 0.016; draw(); requestAnimationFrame(frame); }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); applyWin(false); }, 120);
  });

  function start() {
    resize(); loadWin();
    var h = keyFromHash(); tp = h; p = h;        // honour deep links (#goodies, #journal, …)
    go(h, true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
