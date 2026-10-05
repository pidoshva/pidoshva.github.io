// Animated node-cluster background for the FALLBACK pages (/goodies/, /blog/, /blog/post.html).
// Same 96-node cluster language as the homepage app (js/spatial.js) — shapes, faces,
// depth of field, pulses, bolts and the deep parallax field all come from js/geo.js —
// but non-interactive: it morphs from the nebula into this page's shape on load, rotates
// slowly, follows the mouse with a little parallax, and fades as you scroll so text stays
// readable. Which shape a page wears comes from `<body data-shape="…">`:
//   goodies → crystal · blog → field · lab (post) → knot · journal → spine · home → nebula
// Renders into a fixed full-viewport canvas (.topo-bg: z-index:-1, pointer-events:none)
// so every page section, script and feature is untouched. Load js/geo.js first.
//
// Optional hooks (used by geleus.io, the terminal résumé, which vendors this file):
//   <body data-bg-fade="off">            — no scroll-fade (page doesn't scroll)
//   window.GELEUS.clusterLayout = () => ({cx, cy, s})   — where/how big the cluster sits (eased here)
//   window.GELEUS.clusterHook = (ctx, sp, W, H, T) => {} — draw extra things over the cluster each frame
(function () {
  var G = window.GELEUS && window.GELEUS.geo;
  if (!G) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = G.N, CAM = G.CAM, lerp = G.lerp, clamp = G.clamp, easeIO = G.easeIO, nearOf = G.nearOf;
  var dpr = Math.min(window.devicePixelRatio || 1, 2), T = 0;

  var SHAPES = G.buildShapes();
  var PAGE_SHAPE = { home: 'nebula', about: 'knot', goodies: 'crystal', blog: 'field', lab: 'knot', journal: 'spine', resume: 'helix' };
  var pageKey = (document.body && document.body.getAttribute('data-shape')) || 'home';
  var shape = SHAPES[PAGE_SHAPE[pageKey] || 'nebula'], isHome = pageKey === 'home';
  var noFade = document.body && document.body.getAttribute('data-bg-fade') === 'off';
  var BG = G.bgField(90);

  var canvas = document.createElement('canvas');
  canvas.className = 'topo-bg'; canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d'), W = 0, H = 0;
  function mount() { if (document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild); else document.body.appendChild(canvas); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var vigC = document.createElement('canvas'), grain = G.makeGrain();
  function resize() {
    var de = document.documentElement;
    W = de.clientWidth || window.innerWidth; H = de.clientHeight || window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); G.buildVignette(vigC, W, H, dpr);
  }
  // bold at the top, fades as you scroll so content stays readable
  function applyFade() {
    if (noFade) { canvas.style.opacity = '1'; return; }
    var y = window.scrollY || window.pageYOffset || 0;
    var top = isHome ? 1.0 : 0.42, min = isHome ? 0.12 : 0.16, dist = isHome ? 560 : 260;
    canvas.style.opacity = (top - (top - min) * Math.min(1, y / dist)).toFixed(3);
  }

  // morph nebula → page shape on load (staggered per node, like the app)
  var from = SHAPES.nebula, morphT = isHome ? 1 : 0, DEL = [];
  for (var di = 0; di < N; di++) DEL.push(G.rand(di * 3.3 + 9) * 0.4);
  var cur = new Array(N), sp = new Array(N), yaw = 0.6, pitch = -0.3, mx = -1, my = -1, pxS = 0, pyS = 0;
  var cxS = 0, cyS = 0, sS = 0; // eased layout (centre + scale)
  var bolts = G.boltLayer(2, 0.8);
  window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });

  function draw() {
    var sf = W < 700 ? 0.46 : 0.33, k;
    var L = (window.GELEUS.clusterLayout && window.GELEUS.clusterLayout(W, H)) || { cx: W / 2, cy: H / 2, s: Math.min(W, H) * sf };
    if (sS === 0) { cxS = L.cx; cyS = L.cy; sS = L.s; }
    cxS += (L.cx - cxS) * 0.08; cyS += (L.cy - cyS) * 0.08; sS += (L.s - sS) * 0.08;
    var cx = cxS, cy = cyS, scale = sS;
    var to = (shape.dynamic && !reduced) ? G.field(T) : shape.pos;
    if (morphT < 1) { for (k = 0; k < N; k++) { var e = easeIO(clamp((morphT - DEL[k]) / 0.6, 0, 1)); cur[k] = { x: lerp(from.pos[k].x, to[k].x, e), y: lerp(from.pos[k].y, to[k].y, e), z: lerp(from.pos[k].z, to[k].z, e) }; } }
    else for (k = 0; k < N; k++) cur[k] = to[k];
    var ef = morphT < 1 ? easeIO(morphT) : 1;

    var ta = reduced ? 1 : (morphT < 1 ? 0.45 : 1);
    ctx.fillStyle = 'rgba(14,16,15,' + ta.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(vigC, 0, 0, W, H);

    pxS += ((mx >= 0 ? (mx - W / 2) * 0.02 : 0) - pxS) * 0.05; pyS += ((my >= 0 ? (my - H / 2) * 0.02 : 0) - pyS) * 0.05;
    G.drawDeepField(ctx, BG, W, H, T, pxS, pyS, reduced);

    for (k = 0; k < N; k++) {
      var r = G.rotP(cur[k], yaw + pxS * 0.01, pitch + pyS * 0.006), f = CAM / (CAM + r.z);
      sp[k] = { x: cx + r.x * f * scale, y: cy + r.y * f * scale, z: r.z, rx: r.x, ry: r.y };
    }
    if (morphT < 1) { G.drawFaces(ctx, sp, from.tris, 1 - ef); G.drawFaces(ctx, sp, shape.tris, ef); G.drawEdges(ctx, sp, from.edges, 1 - ef); G.drawEdges(ctx, sp, shape.edges, ef); }
    else { G.drawFaces(ctx, sp, shape.tris, 1); G.drawEdges(ctx, sp, shape.edges, 1); }
    if (!reduced && morphT >= 1) G.drawPulses(ctx, sp, shape.edges, T, 3);
    G.drawNodes(ctx, sp);
    if (!reduced && morphT >= 1) G.stepBolts(ctx, bolts, function () { return G.closestUnlinked(sp, shape.eset, scale * 0.2, W, H); }, T);
    if (window.GELEUS.clusterHook) window.GELEUS.clusterHook(ctx, sp, W, H, T);
    ctx.globalAlpha = 0.05; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  function frame() {
    if (!reduced) { T += 0.016; yaw += 0.0035; }
    if (morphT < 1) morphT = Math.min(1, morphT + 0.014);
    draw(); requestAnimationFrame(frame);
  }
  function start() {
    resize(); applyFade();
    if (reduced) { morphT = 1; draw(); return; } // single static frame
    requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', applyFade, { passive: true });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { dpr = Math.min(window.devicePixelRatio || 1, 2); resize(); if (reduced) draw(); }, 150);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
