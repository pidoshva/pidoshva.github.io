// Spatial home app — the interactive node-cluster that IS the homepage.
// A chaotic field of 48 linked nodes with energy pulses + a deep parallax field;
// 7 labeled page-nodes (home/about/goodies/blog/lab/journal/contributions) you can
// click to fly the camera, morph the cluster into that page's shape, and slide its
// content drawer in from the right. Drag to rotate (mouse + touch). Esc / "back to
// home" returns. Deep-linkable via #hash; back/forward work. The drawers hold the
// site's real content roots, populated by the existing modules — no feature lost.
// Pure vanilla JS, no deps. Respects prefers-reduced-motion.
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var CAM = 3.2, N = 48, T = 0;

  function rand(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function nearOf(z) { var n = 1 - (z + 1) / 2.4; return n < 0 ? 0 : (n > 1 ? 1 : n); }

  // --- Shape builders (each returns exactly N points) ---
  function clusterPos() {
    var p = [];
    for (var i = 0; i < N; i++) {
      var r = Math.cbrt(rand(i * 5 + 1)) * 1.0, a = rand(i * 5 + 2) * 6.2832, b = Math.acos(2 * rand(i * 5 + 3) - 1);
      var x = r * Math.sin(b) * Math.cos(a) * 1.3, y = r * Math.cos(b) * 0.85, z = r * Math.sin(b) * Math.sin(a) * 1.1;
      x += (rand(i * 5 + 4) - 0.5) * 0.3; y += (rand(i * 5 + 5) - 0.5) * 0.3;
      p.push({ x: x, y: y, z: z });
    }
    return p;
  }
  function helixPos() { // double helix (about)
    var p = [], pairs = N / 2;
    for (var k = 0; k < pairs; k++) {
      var tt = k / (pairs - 1), a = tt * Math.PI * 2 * 2.3, y = (tt - 0.5) * 1.95, r = 0.52;
      p.push({ x: r * Math.cos(a), y: y, z: r * Math.sin(a) });
      p.push({ x: r * Math.cos(a + Math.PI), y: y, z: r * Math.sin(a + Math.PI) });
    }
    return p;
  }
  function latticePos() { // 3D cube lattice (goodies)
    var p = [], nx = 4, ny = 4, nz = 3;
    for (var x = 0; x < nx; x++) for (var y = 0; y < ny; y++) for (var z = 0; z < nz; z++)
      p.push({ x: (x / (nx - 1) - 0.5) * 1.55, y: (y / (ny - 1) - 0.5) * 1.55, z: (z / (nz - 1) - 0.5) * 1.25 });
    return p;
  }
  function wavePos(t) { // undulating field (blog)
    var p = [], nx = 8, nz = 6;
    for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) {
      var x = (i / (nx - 1) - 0.5) * 1.95, z = (j / (nz - 1) - 0.5) * 1.5;
      p.push({ x: x, y: Math.sin(x * 3 + t * 1.6) * 0.24 + Math.cos(z * 3 + t * 1.2) * 0.24, z: z });
    }
    return p;
  }

  function knn(pos, k) {
    var edges = [], seen = {};
    for (var a = 0; a < pos.length; a++) {
      var d = [];
      for (var b = 0; b < pos.length; b++) {
        if (a === b) continue;
        var dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y, dz = pos[a].z - pos[b].z;
        d.push({ b: b, dd: dx * dx + dy * dy + dz * dz });
      }
      d.sort(function (p, q) { return p.dd - q.dd; });
      for (var e = 0; e < k; e++) {
        var bi = d[e].b, lo = Math.min(a, bi), hi = Math.max(a, bi), key = lo + '_' + hi;
        if (!seen[key]) { seen[key] = 1; edges.push([lo, hi]); }
      }
    }
    return edges;
  }

  var SHAPES = {};
  (function () {
    var c = clusterPos(); SHAPES.home = { pos: c, edges: knn(c, 3), desc: 'cluster' };
    var h = helixPos(); SHAPES.about = { pos: h, edges: knn(h, 2), desc: 'helix' };
    var g = latticePos(); SHAPES.goodies = { pos: g, edges: knn(g, 3), desc: 'lattice' };
    var w = wavePos(0); SHAPES.blog = { pos: w, edges: knn(w, 3), desc: 'field', dynamic: true };
  })();

  // labeled cluster nodes (each label rides a fixed node index through morphs).
  // 'resume' opens geleus.io externally; the journal lives in a full-screen overlay
  // triggered by the top-centre arrow (not a node).
  var PAGE_LIST = [
    ['home', 3], ['about', 12], ['goodies', 22], ['blog', 33], ['resume', 43]
  ];
  var RESUME_URL = 'https://geleus.io/';

  // deep, dim node-field behind the art
  var BGFIELD = (function () {
    var p = [];
    for (var i = 0; i < 78; i++) {
      var u = rand(i + 7), v = rand(i + 77), w = rand(i + 777);
      var r = 1.5 + 1.7 * Math.cbrt(u), a = v * 6.2832, b = Math.acos(2 * w - 1);
      p.push({ x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b), z: r * Math.sin(b) * Math.sin(a) });
    }
    return p;
  })();
  var BGEDGES = knn(BGFIELD, 1);

  function rotP(p, yaw, pitch) {
    var c = Math.cos(yaw), s = Math.sin(yaw), x1 = p.x * c - p.z * s, z1 = p.x * s + p.z * c;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { x: x1, y: p.y * cp - z1 * sp, z: p.y * sp + z1 * cp };
  }

  // --- DOM ---
  var cv = document.getElementById('spatialCanvas'), ctx = cv.getContext('2d'), W = 0, H = 0;
  var panel = document.getElementById('panel');
  var drawerPages = document.querySelectorAll('#panel .drawer-page');
  var navBtns = document.querySelectorAll('.hud-nav [data-node]');
  var rNodes = document.getElementById('rNodes'), rEdges = document.getElementById('rEdges'),
      rYaw = document.getElementById('rYaw'), rPit = document.getElementById('rPit'),
      rEffect = document.getElementById('rEffect'), rEffectD = document.getElementById('rEffectD');

  // minimal seamless backdrop — pre-rendered
  var bgC = document.createElement('canvas'), bgX = bgC.getContext('2d');
  function buildBg() {
    bgC.width = Math.floor(W * dpr); bgC.height = Math.floor(H * dpr); bgX.setTransform(dpr, 0, 0, dpr, 0, 0);
    var lg = bgX.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#0f1110'); lg.addColorStop(1, '#0a0b0a');
    bgX.fillStyle = lg; bgX.fillRect(0, 0, W, H);
    var rg = bgX.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.18, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.5)');
    bgX.fillStyle = rg; bgX.fillRect(0, 0, W, H);
  }
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); buildBg();
  }

  // --- state ---
  var posCur = SHAPES.home.pos.map(function (p) { return { x: p.x, y: p.y, z: p.z }; });
  var fromPos = posCur.map(function (p) { return { x: p.x, y: p.y, z: p.z }; });
  var toPos = SHAPES.home.pos, fromEdges = SHAPES.home.edges, toEdges = SHAPES.home.edges;
  var morphT = 1, curKey = 'home';
  var yaw = 0.6, pitch = -0.3, tgtYaw = 0.6, tgtPitch = -0.3;
  var camShiftX = 0, tgtShiftX = 0, zoom = 1, tgtZoom = 1;
  var dragging = false, lastX = 0, lastY = 0, moved = 0, mouseX = -1, mouseY = -1, hoveredPage = null;

  function setShape(key) {
    var prev = curKey; if (key === prev && morphT >= 1) return;
    fromPos = posCur.map(function (p) { return { x: p.x, y: p.y, z: p.z }; });
    toPos = SHAPES[key].pos; fromEdges = SHAPES[prev].edges; toEdges = SHAPES[key].edges; morphT = 0; curKey = key;
  }

  // --- navigation / drawer ---
  function setActiveNav(key) {
    Array.prototype.forEach.call(navBtns, function (b) { b.classList.toggle('active', b.getAttribute('data-node') === key); });
  }
  function showDrawerPage(key) {
    Array.prototype.forEach.call(drawerPages, function (s) { s.hidden = (s.getAttribute('data-page') !== key); });
  }

  // --- blog: expand a post in-place inside the drawer (keeps the spatial design) ---
  var blogListRoot = document.getElementById('blog-list-root');
  var blogPostView = document.getElementById('blog-post-view');
  function showBlogList() {
    if (blogPostView) { blogPostView.hidden = true; blogPostView.innerHTML = ''; }
    if (blogListRoot) blogListRoot.hidden = false;
  }
  function showBlogPost(slug) {
    if (!blogPostView || !window.GELEUS || !window.GELEUS.loadPost) return false;
    if (blogListRoot) blogListRoot.hidden = true;
    blogPostView.hidden = false;
    blogPostView.innerHTML = '<button class="drawer-back-posts" type="button">← all posts</button><div id="drawer-post"></div>';
    blogPostView.querySelector('.drawer-back-posts').addEventListener('click', showBlogList);
    var el = document.getElementById('drawer-post');
    window.GELEUS.loadPost(slug, el).catch(function () {
      el.innerHTML = '<p class="blog-error">Could not load this post. <a href="/blog/post.html?slug=' + encodeURIComponent(slug) + '">Open it on the full page →</a></p>';
    });
    panel.scrollTop = 0;
    return true;
  }
  // intercept blog-card clicks so posts expand in the drawer instead of navigating away
  panel.addEventListener('click', function (e) {
    var card = e.target.closest('.blog-card');
    if (!card) return;
    var href = card.getAttribute('href') || '';
    var m = href.match(/slug=([^&]+)/);
    var slug = m ? decodeURIComponent(m[1]) : null;
    if (slug && showBlogPost(slug)) e.preventDefault(); // else fall back to /blog/post.html
  });

  function applyState(key) {
    if (!SHAPES[key]) key = 'home';
    setShape(key); setActiveNav(key);
    if (key === 'home') {
      panel.classList.remove('open'); tgtShiftX = 0; tgtZoom = 1;
    } else {
      showDrawerPage(key); panel.classList.add('open');
      if (key === 'blog') showBlogList(); // reset to the listing each time blog opens
      tgtShiftX = (W > 760 ? -W * 0.18 : 0); tgtZoom = 1.1;
    }
  }
  function goPage(key) {
    if (key === 'resume') { window.open(RESUME_URL, '_blank', 'noopener'); return; }
    applyState(key);
    var url = key === 'home' ? (location.pathname + location.search) : '#' + key;
    if (location.hash.slice(1) !== key && !(key === 'home' && !location.hash)) {
      try { history.pushState({ key: key }, '', url); } catch (e) { location.hash = key === 'home' ? '' : key; }
    }
  }
  function keyFromHash() { var h = location.hash.slice(1); return SHAPES[h] ? h : 'home'; }

  Array.prototype.forEach.call(navBtns, function (b) {
    b.addEventListener('click', function () { goPage(b.getAttribute('data-node')); });
  });
  var backBtn = document.getElementById('panelBack');
  if (backBtn) backBtn.addEventListener('click', function () { goPage('home'); });

  // --- journal: full-screen overlay (tree + contributions), opened by the top arrow ---
  var journalOverlay = document.getElementById('journalOverlay');
  var journalTrigger = document.getElementById('journalTrigger');
  var journalClose = document.getElementById('journalClose');
  function openJournal() {
    if (!journalOverlay) return;
    journalOverlay.classList.add('open');
    journalOverlay.setAttribute('aria-hidden', 'false');
    if (journalTrigger) journalTrigger.setAttribute('aria-expanded', 'true');
    journalOverlay.scrollTop = 0;
  }
  function closeJournal() {
    if (!journalOverlay) return;
    journalOverlay.classList.remove('open');
    journalOverlay.setAttribute('aria-hidden', 'true');
    if (journalTrigger) journalTrigger.setAttribute('aria-expanded', 'false');
  }
  if (journalTrigger) journalTrigger.addEventListener('click', openJournal);
  if (journalClose) journalClose.addEventListener('click', closeJournal);
  if (journalOverlay) journalOverlay.addEventListener('click', function (e) { if (e.target === journalOverlay) closeJournal(); });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (journalOverlay && journalOverlay.classList.contains('open')) { closeJournal(); return; }
    if (curKey !== 'home') goPage('home');
  });
  window.addEventListener('popstate', function () { applyState(keyFromHash()); });

  // --- pointer (drag to rotate; tap a labeled node to open) ---
  function relPos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener('pointerdown', function (e) { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    var p = relPos(e); mouseX = p.x; mouseY = p.y;
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY; moved += Math.abs(dx) + Math.abs(dy);
      tgtYaw += dx * 0.006; tgtPitch = Math.max(-1.2, Math.min(1.2, tgtPitch + dy * 0.006)); lastX = e.clientX; lastY = e.clientY;
    }
  });
  cv.addEventListener('pointerup', function () {
    dragging = false;
    if (moved < 6) { if (hoveredPage) goPage(hoveredPage); else if (curKey !== 'home') goPage('home'); }
  });
  cv.addEventListener('pointerleave', function () { mouseX = -1; mouseY = -1; });
  window.addEventListener('pointerup', function () { dragging = false; });

  // --- render ---
  function draw() {
    if (!reduced && curKey === 'home' && !dragging && !hoveredPage) tgtYaw += 0.0045;
    yaw += (tgtYaw - yaw) * 0.07; pitch += (tgtPitch - pitch) * 0.07;
    camShiftX += (tgtShiftX - camShiftX) * 0.09; zoom += (tgtZoom - zoom) * 0.09;
    var sf = W < 700 ? 0.46 : 0.33;
    var cx = W / 2 + camShiftX, cy = H / 2, scale = Math.min(W, H) * sf * zoom;

    if (morphT < 1) {
      morphT = Math.min(1, morphT + 0.024); var e = easeIO(morphT);
      for (var i = 0; i < N; i++) {
        posCur[i].x = lerp(fromPos[i].x, toPos[i].x, e);
        posCur[i].y = lerp(fromPos[i].y, toPos[i].y, e);
        posCur[i].z = lerp(fromPos[i].z, toPos[i].z, e);
      }
      if (morphT >= 1) fromEdges = toEdges;
    } else if (curKey === 'blog' && !reduced) {
      posCur = wavePos(T);
    }

    ctx.clearRect(0, 0, W, H); ctx.drawImage(bgC, 0, 0, W, H);

    // deep parallax field
    var fby = reduced ? 0.4 : T * 0.03, fbp = -0.18, fbs = Math.min(W, H) * 0.52, fcamF = 5;
    var fsp = new Array(BGFIELD.length);
    for (var i = 0; i < BGFIELD.length; i++) {
      var fr = rotP(BGFIELD[i], fby, fbp), ff = fcamF / (fcamF + fr.z);
      fsp[i] = { x: W / 2 + fr.x * ff * fbs, y: H / 2 + fr.y * ff * fbs, z: fr.z };
    }
    ctx.lineWidth = 1;
    for (var i = 0; i < BGEDGES.length; i++) {
      var fa = fsp[BGEDGES[i][0]], fb = fsp[BGEDGES[i][1]], fn = 1 - ((fa.z + fb.z) / 2 + 3.2) / 6.4;
      ctx.strokeStyle = 'rgba(133,148,133,' + (0.05 + fn * 0.09).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(fa.x, fa.y); ctx.lineTo(fb.x, fb.y); ctx.stroke();
    }
    for (var i = 0; i < fsp.length; i++) {
      var fn = 1 - (fsp[i].z + 3.2) / 6.4; if (fn < 0) fn = 0;
      ctx.fillStyle = 'rgba(143,175,120,' + (0.08 + fn * 0.2).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(fsp[i].x, fsp[i].y, 0.9 + fn * 1.5, 0, 7); ctx.fill();
    }

    // project cluster
    var sp = new Array(N);
    for (var i = 0; i < N; i++) {
      var r = rotP(posCur[i], yaw, pitch), f = CAM / (CAM + r.z);
      sp[i] = { x: cx + r.x * f * scale, y: cy + r.y * f * scale, z: r.z };
    }

    // edges (crossfade during morph)
    function edgeSet(edges, aMul) {
      for (var e = 0; e < edges.length; e++) {
        var A = sp[edges[e][0]], B = sp[edges[e][1]]; if (!A || !B) continue;
        var nr = nearOf((A.z + B.z) / 2); ctx.lineWidth = 0.7 + nr * 1.4;
        ctx.strokeStyle = 'rgba(143,175,120,' + ((0.1 + nr * 0.5) * aMul).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
    }
    var me = morphT < 1 ? easeIO(morphT) : 1;
    if (morphT < 1) edgeSet(fromEdges, 1 - me);
    edgeSet(toEdges, me);

    // pulses
    if (!reduced) {
      for (var e = 0; e < toEdges.length; e++) {
        var A = sp[toEdges[e][0]], B = sp[toEdges[e][1]]; if (!A || !B) continue;
        var ph = (T * 0.55 + e * 0.1973) % 1, x = A.x + (B.x - A.x) * ph, y = A.y + (B.y - A.y) * ph, nr = nearOf(A.z + (B.z - A.z) * ph);
        ctx.fillStyle = 'rgba(224,236,210,' + ((0.3 + nr * 0.55) * me).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, 1.1 + nr * 1.7, 0, 7); ctx.fill();
      }
    }

    // nodes
    var ord = []; for (var i = 0; i < N; i++) ord.push(i);
    ord.sort(function (a, b) { return sp[b].z - sp[a].z; });
    for (var o = 0; o < ord.length; o++) {
      var i = ord[o], P = sp[i], nr = nearOf(P.z), r = 1.7 + nr * 2.6;
      if (nr > 0.62) {
        var g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, r * 3);
        g.addColorStop(0, 'rgba(168,200,145,' + (0.22 * nr) + ')'); g.addColorStop(1, 'rgba(168,200,145,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, r * 3, 0, 7); ctx.fill();
      }
      ctx.fillStyle = 'rgba(168,200,145,' + (0.42 + nr * 0.55).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 7); ctx.fill();
    }

    // labeled page-nodes (clickable)
    hoveredPage = null;
    if (mouseX >= 0 && !dragging) {
      var hb = 460;
      for (var pi = 0; pi < PAGE_LIST.length; pi++) {
        var Q = sp[PAGE_LIST[pi][1]], dx = Q.x - mouseX, dy = Q.y - mouseY, dd = dx * dx + dy * dy;
        if (dd < hb) { hb = dd; hoveredPage = PAGE_LIST[pi][0]; }
      }
    }
    cv.style.cursor = dragging ? 'grabbing' : (hoveredPage ? 'pointer' : 'grab');
    for (var pi = 0; pi < PAGE_LIST.length; pi++) {
      var key = PAGE_LIST[pi][0], P = sp[PAGE_LIST[pi][1]], nr = nearOf(P.z), active = (key === curKey || key === hoveredPage), rr = 3 + nr * 2.4;
      var g2 = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr * 3.4);
      g2.addColorStop(0, 'rgba(168,200,145,' + (0.32 + 0.3 * nr) + ')'); g2.addColorStop(1, 'rgba(168,200,145,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(P.x, P.y, rr * 3.4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(224,236,210,1)'; ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, 7); ctx.fill();
      if (active) { ctx.strokeStyle = 'rgba(168,200,145,0.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(P.x, P.y, rr + 5, 0, 7); ctx.stroke(); }
      ctx.font = '600 ' + (11.5 + nr * 2).toFixed(0) + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.fillStyle = 'rgba(230,232,228,' + (active ? 0.98 : (0.5 + nr * 0.4)) + ')';
      ctx.fillText(key, P.x + rr + 5, P.y + 3.5);
    }

    if (rNodes) rNodes.textContent = N;
    if (rEdges) rEdges.textContent = SHAPES[curKey].edges.length;
    if (rYaw) rYaw.textContent = Math.round((yaw * 180 / Math.PI) % 360) + '°';
    if (rPit) rPit.textContent = Math.round(pitch * 180 / Math.PI) + '°';
    if (rEffect) rEffect.textContent = curKey;
    if (rEffectD) rEffectD.textContent = SHAPES[curKey].desc;
  }

  function frame() { if (!reduced) T += 0.016; draw(); requestAnimationFrame(frame); }

  function start() {
    resize();
    applyState(keyFromHash()); // honor deep-link, e.g. #goodies
    if (location.hash === '#journal') openJournal();
    if (reduced) { morphT = 1; draw(); requestAnimationFrame(frame); return; }
    requestAnimationFrame(frame);
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2); resize();
      // re-evaluate drawer shift for the new width
      if (curKey !== 'home') tgtShiftX = (W > 760 ? -W * 0.18 : 0);
    }, 150);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
