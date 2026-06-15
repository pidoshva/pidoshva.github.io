// Dynamic topographic background — animated elevation contours (mountains + ocean)
// that flow over time and warp toward the cursor. Rendered on a fixed canvas
// behind all content. Pure vanilla JS, no dependencies.
(function () {
  var prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Palette (matches css/styles.css) ---
  var BG = '#1a1c1b';
  var OCEAN = [150, 161, 166]; // cool grey lines below "sea level"
  var LAND = [143, 175, 120];  // moss green lines above "sea level"

  // --- Canvas setup ---
  var canvas = document.createElement('canvas');
  canvas.className = 'topo-bg';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');

  function mount() {
    if (document.body.firstChild) {
      document.body.insertBefore(canvas, document.body.firstChild);
    } else {
      document.body.appendChild(canvas);
    }
  }
  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  // --- Dimensions ---
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0;
  var CELL = 30;       // grid cell size in CSS px
  var cols = 0, rows = 0;
  var field = [];      // height values at grid vertices

  function resize() {
    // Use the layout viewport (clientWidth/Height) — NOT window.innerWidth,
    // which can exceed it and push the fixed canvas past the edge (horizontal scroll).
    var de = document.documentElement;
    W = de.clientWidth || window.innerWidth;
    H = de.clientHeight || window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    // Pin display size to the layout viewport. CSS width:100% can resolve against the
    // initial containing block (innerWidth), which may exceed clientWidth and overflow —
    // so override it explicitly here.
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    field = new Array((cols + 1) * (rows + 1));
  }

  // --- Value noise (cheap, smooth, deterministic) ---
  function hash(i, j) {
    var n = (i * 374761393 + j * 668265263) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return ((n & 0x7fffffff) / 0x7fffffff);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function valueNoise(x, y) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = x - x0, fy = y - y0;
    var v00 = hash(x0, y0), v10 = hash(x0 + 1, y0);
    var v01 = hash(x0, y0 + 1), v11 = hash(x0 + 1, y0 + 1);
    var sx = smooth(fx), sy = smooth(fy);
    var a = v00 + (v10 - v00) * sx;
    var b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sy;
  }
  function fbm(x, y) {
    var sum = 0, amp = 0.5, freq = 1;
    for (var o = 0; o < 3; o++) {
      sum += amp * valueNoise(x * freq, y * freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum; // ~0..0.875
  }

  // --- Pointer ---
  var targetX = -9999, targetY = -9999;   // where the peak is pulled toward
  var curX = 0, curY = 0;                  // smoothed pointer
  var hasPointer = false;
  var driftT = 0;

  window.addEventListener('pointermove', function (e) {
    targetX = e.clientX;
    targetY = e.clientY;
    hasPointer = true;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { hasPointer = false; });

  // --- Contour levels ---
  var LEVELS = [];
  for (var L = -1.05; L <= 1.05; L += 0.15) LEVELS.push(L);

  var t = 0;

  function computeField() {
    // Smooth the influence point toward the target (or auto-drift if idle)
    if (!hasPointer) {
      driftT += 0.0016;
      targetX = W * (0.5 + 0.32 * Math.cos(driftT));
      targetY = H * (0.5 + 0.28 * Math.sin(driftT * 0.8));
    }
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;

    var sigma = Math.min(W, H) * 0.32;
    var inv2s2 = 1 / (2 * sigma * sigma);
    var nx = 0.006, ny = 0.006; // noise frequency in px space
    var idx = 0;
    for (var j = 0; j <= rows; j++) {
      var py = j * CELL;
      var vbias = (0.5 - py / H) * 1.5; // mountains up top, ocean below
      for (var i = 0; i <= cols; i++) {
        var px = i * CELL;
        // flowing terrain
        var h = (fbm(px * nx + t, py * ny + t * 0.35) - 0.44) * 3.2;
        h += vbias;
        // cursor raises a peak — contours bunch around it
        var dx = px - curX, dy = py - curY;
        h += 1.5 * Math.exp(-(dx * dx + dy * dy) * inv2s2);
        field[idx++] = h;
      }
    }
  }

  // Fractional crossing position along an edge for level L
  function frac(v1, v2, L) { return (L - v1) / (v2 - v1); }

  function strokeLevel(L, color, alpha) {
    var path = new Path2D();
    var stride = cols + 1;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var o = j * stride + i;
        var tl = field[o], tr = field[o + 1];
        var bl = field[o + stride], br = field[o + stride + 1];
        var c = 0;
        if (tl >= L) c |= 8;
        if (tr >= L) c |= 4;
        if (br >= L) c |= 2;
        if (bl >= L) c |= 1;
        if (c === 0 || c === 15) continue;

        var x = i * CELL, y = j * CELL, x2 = x + CELL, y2 = y + CELL;
        // edge crossing points (numbers, no allocation)
        var topX = x + CELL * frac(tl, tr, L), topY = y;
        var botX = x + CELL * frac(bl, br, L), botY = y2;
        var lefX = x, lefY = y + CELL * frac(tl, bl, L);
        var rigX = x2, rigY = y + CELL * frac(tr, br, L);

        switch (c) {
          case 1: case 14: path.moveTo(lefX, lefY); path.lineTo(botX, botY); break;
          case 2: case 13: path.moveTo(botX, botY); path.lineTo(rigX, rigY); break;
          case 3: case 12: path.moveTo(lefX, lefY); path.lineTo(rigX, rigY); break;
          case 4: case 11: path.moveTo(topX, topY); path.lineTo(rigX, rigY); break;
          case 6: case 9:  path.moveTo(topX, topY); path.lineTo(botX, botY); break;
          case 7: case 8:  path.moveTo(lefX, lefY); path.lineTo(topX, topY); break;
          case 5:
            path.moveTo(lefX, lefY); path.lineTo(topX, topY);
            path.moveTo(botX, botY); path.lineTo(rigX, rigY);
            break;
          case 10:
            path.moveTo(topX, topY); path.lineTo(rigX, rigY);
            path.moveTo(lefX, lefY); path.lineTo(botX, botY);
            break;
        }
      }
    }
    ctx.strokeStyle = 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
    ctx.stroke(path);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (var k = 0; k < LEVELS.length; k++) {
      var L = LEVELS[k];
      var land = L >= 0;
      var color = land ? LAND : OCEAN;
      // higher elevation + deeper ocean = stronger lines
      var mag = Math.min(Math.abs(L) / 1.05, 1);
      var alpha = 0.10 + mag * 0.26;
      strokeLevel(L, color, alpha);
    }

    // Soft moss glow following the pointer for an "active" feel
    var gx = curX, gy = curY;
    var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(W, H) * 0.38);
    grad.addColorStop(0, 'rgba(143,175,120,0.10)');
    grad.addColorStop(1, 'rgba(143,175,120,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function frame() {
    t += 0.0009;
    computeField();
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    if (prefersReduced) {
      // Single static frame — no motion
      computeField();
      draw();
      return;
    }
    requestAnimationFrame(frame);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      resize();
      if (prefersReduced) { computeField(); draw(); }
    }, 150);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
