// Animated node-cluster background. A chaotic field of linked nodes that takes a
// different shape on each page (home = cluster, goodies = lattice, blog = field,
// post = knot), with energy pulses flowing along the links and a deep parallax
// node-field behind. Replaces js/topo.js.
//
// Short-circuit arcs: as the cluster rotates/morphs, when two *unconnected* nodes
// (no edge between them) drift close on screen, a jagged electric arc cracks across
// the gap, flashes, and dies — like current jumping a gap. Occasional (cooldown +
// capped), palette-cohesive, and disabled under prefers-reduced-motion.
//
// Renders to a fixed full-viewport canvas (z-index:-1, pointer-events:none, reusing
// the .topo-bg class) so every existing page section, script and feature is untouched.
// Bold at the top of the homepage, fades as you scroll so text stays readable.
// Respects prefers-reduced-motion (single static frame). Pure vanilla JS, no deps.
(function () {
  var prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palette is inlined as rgba() in the draw calls below; it matches css/styles.css
  // (moss 143,175,120 · bright 168,200,145 · grey 124,132,124 · pulse 224,236,210).
  var CAM = 3.2, N = 48, T = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

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
  function helixPos() {
    var p = [], pairs = N / 2;
    for (var k = 0; k < pairs; k++) {
      var tt = k / (pairs - 1), a = tt * Math.PI * 2 * 2.3, y = (tt - 0.5) * 1.95, r = 0.52;
      p.push({ x: r * Math.cos(a), y: y, z: r * Math.sin(a) });
      p.push({ x: r * Math.cos(a + Math.PI), y: y, z: r * Math.sin(a + Math.PI) });
    }
    return p;
  }
  function latticePos() {
    var p = [], nx = 4, ny = 4, nz = 3;
    for (var x = 0; x < nx; x++) for (var y = 0; y < ny; y++) for (var z = 0; z < nz; z++)
      p.push({ x: (x / (nx - 1) - 0.5) * 1.55, y: (y / (ny - 1) - 0.5) * 1.55, z: (z / (nz - 1) - 0.5) * 1.25 });
    return p;
  }
  function knotPos() {
    var p = [], pp = 2, qq = 3;
    for (var i = 0; i < N; i++) {
      var u = i / N * Math.PI * 2, r = 0.5 * (2 + Math.cos(qq * u));
      p.push({ x: r * Math.cos(pp * u) * 0.6, y: r * Math.sin(pp * u) * 0.6, z: 0.58 * Math.sin(qq * u) });
    }
    return p;
  }
  function wavePos(t) {
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
    var c = clusterPos(); SHAPES.home = { pos: c, edges: knn(c, 3) };
    var h = helixPos(); SHAPES.about = { pos: h, edges: knn(h, 2) };
    var g = latticePos(); SHAPES.goodies = { pos: g, edges: knn(g, 3) };
    var w = wavePos(0); SHAPES.blog = { pos: w, edges: knn(w, 3), dynamic: true };
    var k = knotPos(); SHAPES.lab = { pos: k, edges: knn(k, 2) };
  })();

  // deep, dim node-field that lives behind the art (same node language, far away)
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

  // --- Which shape does this page wear? ---
  var page = (document.body && document.body.getAttribute('data-shape')) || 'home';
  if (!SHAPES[page]) page = 'home';
  var isHome = page === 'home';

  // --- Canvas (reuses .topo-bg styling: fixed, inset 0, z-index:-1, pointer-events:none) ---
  var canvas = document.createElement('canvas');
  canvas.className = 'topo-bg';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  function mount() {
    if (document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild);
    else document.body.appendChild(canvas);
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var W = 0, H = 0;

  // minimal, seamless backdrop — pre-rendered once
  var bgC = document.createElement('canvas'), bgX = bgC.getContext('2d');
  function buildBg() {
    bgC.width = Math.floor(W * dpr); bgC.height = Math.floor(H * dpr); bgX.setTransform(dpr, 0, 0, dpr, 0, 0);
    var lg = bgX.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#0f1110'); lg.addColorStop(1, '#0a0b0a');
    bgX.fillStyle = lg; bgX.fillRect(0, 0, W, H);
    var rg = bgX.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.18, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.5)');
    bgX.fillStyle = rg; bgX.fillRect(0, 0, W, H);
  }
  function resize() {
    var de = document.documentElement;
    W = de.clientWidth || window.innerWidth;
    H = de.clientHeight || window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildBg();
  }

  // bold at the top, fades as you scroll so content stays readable
  function applyFade() {
    var y = window.scrollY || window.pageYOffset || 0;
    var top = isHome ? 1.0 : 0.22, min = isHome ? 0.12 : 0.08, dist = isHome ? 560 : 260;
    canvas.style.opacity = (top - (top - min) * Math.min(1, y / dist)).toFixed(3);
  }

  // morph the cluster into this page's shape on load
  var posCur = SHAPES.home.pos.map(function (p) { return { x: p.x, y: p.y, z: p.z }; });
  var fromPos = posCur.map(function (p) { return { x: p.x, y: p.y, z: p.z }; });
  var toPos = SHAPES[page].pos, edges = SHAPES[page].edges, morphT = isHome ? 1 : 0;
  var yaw = 0.6, pitch = -0.3;

  // --- Short-circuit arcs between unconnected nodes that drift close ---
  var edgeSet = {};
  for (var ei = 0; ei < edges.length; ei++) edgeSet[edges[ei][0] + '_' + edges[ei][1]] = 1;
  var sparks = [];                       // active arcs: { a, b, life, seed }
  var sparkCD = 0.8;                     // seconds until the next arc may fire
  var SPARK_MAX = isHome ? 3 : 2;        // how many can crackle at once
  var SPARK_DUR = 0.36;                  // lifetime of one arc (s)

  function drawSpark(A, B, spk) {
    var p = spk.life / SPARK_DUR;                 // 0..1 through its life
    var fseed = spk.seed + Math.floor(spk.life * 90);
    var env = Math.sin(Math.PI * p) * (0.55 + 0.45 * rand(fseed + 11.0)); // flash + crackle
    var dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len, segs = 6;
    ctx.lineCap = 'round';
    // pass 0: wide electric-blue glow · pass 1: thin white-hot core
    for (var pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      for (var s = 1; s < segs; s++) {
        var t = s / segs;
        var jit = (rand(fseed + s * 4.7 + pass * 0.5) - 0.5) * len * 0.5 * (1 - Math.abs(2 * t - 1));
        ctx.lineTo(A.x + dx * t + nx * jit, A.y + dy * t + ny * jit);
      }
      ctx.lineTo(B.x, B.y);
      if (pass === 0) { ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(86,166,255,' + (0.22 * env).toFixed(3) + ')'; }
      else { ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(225,242,255,' + (0.9 * env).toFixed(3) + ')'; }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // bright blue-white flash at both endpoints
    var fr = 2.2 + 2.4 * env;
    ctx.fillStyle = 'rgba(150,205,255,' + (0.75 * env).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(A.x, A.y, fr, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(B.x, B.y, fr, 0, 7); ctx.fill();
  }

  function draw() {
    var sf = W < 700 ? 0.46 : 0.33;
    var cx = W / 2, cy = H / 2, scale = Math.min(W, H) * sf;

    if (morphT < 1) {
      var e = easeIO(morphT);
      for (var i = 0; i < N; i++) {
        posCur[i].x = lerp(fromPos[i].x, toPos[i].x, e);
        posCur[i].y = lerp(fromPos[i].y, toPos[i].y, e);
        posCur[i].z = lerp(fromPos[i].z, toPos[i].z, e);
      }
    } else if (page === 'blog' && !prefersReduced) {
      posCur = wavePos(T);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bgC, 0, 0, W, H);

    // deep parallax node-field drifting behind the art
    var fby = prefersReduced ? 0.4 : T * 0.03, fbp = -0.18, fbs = Math.min(W, H) * 0.52, fcamF = 5;
    var fsp = new Array(BGFIELD.length);
    for (var i = 0; i < BGFIELD.length; i++) {
      var fr = rotP(BGFIELD[i], fby, fbp), ff = fcamF / (fcamF + fr.z);
      fsp[i] = { x: W / 2 + fr.x * ff * fbs, y: H / 2 + fr.y * ff * fbs, z: fr.z };
    }
    ctx.lineWidth = 1;
    for (var i = 0; i < BGEDGES.length; i++) {
      var fa = fsp[BGEDGES[i][0]], fb = fsp[BGEDGES[i][1]], fn = 1 - ((fa.z + fb.z) / 2 + 3.2) / 6.4;
      ctx.strokeStyle = 'rgba(124,132,124,' + (0.02 + fn * 0.04).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(fa.x, fa.y); ctx.lineTo(fb.x, fb.y); ctx.stroke();
    }
    for (var i = 0; i < fsp.length; i++) {
      var fn = 1 - (fsp[i].z + 3.2) / 6.4; if (fn < 0) fn = 0;
      ctx.fillStyle = 'rgba(143,175,120,' + (0.04 + fn * 0.13).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(fsp[i].x, fsp[i].y, 0.8 + fn * 1.3, 0, 7); ctx.fill();
    }

    // project the cluster
    var sp = new Array(N);
    for (var i = 0; i < N; i++) {
      var r = rotP(posCur[i], yaw, pitch), f = CAM / (CAM + r.z);
      sp[i] = { x: cx + r.x * f * scale, y: cy + r.y * f * scale, z: r.z };
    }

    // links — thicker/brighter toward the camera
    for (var e = 0; e < edges.length; e++) {
      var A = sp[edges[e][0]], B = sp[edges[e][1]], nr = nearOf((A.z + B.z) / 2);
      ctx.lineWidth = 0.7 + nr * 1.4;
      ctx.strokeStyle = 'rgba(143,175,120,' + (0.1 + nr * 0.5).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }

    // energy pulses flowing along the links
    if (!prefersReduced) {
      for (var e = 0; e < edges.length; e++) {
        var A = sp[edges[e][0]], B = sp[edges[e][1]], ph = (T * 0.55 + e * 0.1973) % 1;
        var x = A.x + (B.x - A.x) * ph, y = A.y + (B.y - A.y) * ph, nr = nearOf(A.z + (B.z - A.z) * ph);
        ctx.fillStyle = 'rgba(224,236,210,' + (0.3 + nr * 0.55).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, 1.1 + nr * 1.7, 0, 7); ctx.fill();
      }
    }

    // bold nodes, depth sorted, soft glow on the nearest
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

    // short-circuit arcs: fire between unconnected nodes that drift close on screen
    if (!prefersReduced) {
      sparkCD -= 0.016;
      if (sparkCD <= 0 && sparks.length < SPARK_MAX) {
        var a = Math.floor(rand(T * 7.3 + 1.7) * N), best = -1, bestD = (scale * 0.40) * (scale * 0.40);
        for (var b = 0; b < N; b++) {
          if (b === a) continue;
          if (edgeSet[Math.min(a, b) + '_' + Math.max(a, b)]) continue;   // skip linked pairs
          var qx = sp[a].x - sp[b].x, qy = sp[a].y - sp[b].y, qd = qx * qx + qy * qy;
          if (qd < bestD) { bestD = qd; best = b; }
        }
        if (best >= 0) {
          sparks.push({ a: a, b: best, life: 0, seed: rand(T + a * 1.3 + best * 2.1) * 1000 });
          sparkCD = 0.45 + rand(T * 3.1) * 1.3;   // breathe between arcs
        } else {
          sparkCD = 0.2;                           // nothing close — retry soon
        }
      }
      for (var si = sparks.length - 1; si >= 0; si--) {
        sparks[si].life += 0.016;
        if (sparks[si].life >= SPARK_DUR) { sparks.splice(si, 1); continue; }
        drawSpark(sp[sparks[si].a], sp[sparks[si].b], sparks[si]);
      }
    }
  }

  function frame() {
    if (!prefersReduced) { T += 0.016; yaw += 0.0045; }
    if (morphT < 1) morphT = Math.min(1, morphT + 0.022);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    applyFade();
    if (prefersReduced) { morphT = 1; draw(); return; } // single static frame
    requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', applyFade, { passive: true });
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      resize();
      if (prefersReduced) draw();
    }, 150);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
