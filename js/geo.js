// Shared node-cluster geometry + draw primitives, used by BOTH engines:
//   js/spatial.js  — the interactive homepage app
//   js/cluster.js  — the animated background on the fallback pages
// Exposed as window.GELEUS.geo. Load this BEFORE either engine.
//
// Everything here is deterministic (seeded `rand`) so both engines build byte-identical
// shapes. N is fixed at 96 nodes; every shape builder returns exactly N points so the
// cluster can morph between shapes index-for-index. Full math: ARCHITECTURE.md §11.
window.GELEUS = window.GELEUS || {};
(function () {
  var N = 96, CAM = 3.4;

  function rand(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function nearOf(z) { return clamp(1 - (z + 1) / 2.4, 0, 1); }

  // --- graph helpers ---
  // k nearest neighbours per node (deduped, undirected). `skip(a,b)` excludes pairs.
  function knn(pos, k, skip) {
    var edges = [], seen = {};
    for (var a = 0; a < pos.length; a++) {
      var d = [];
      for (var b = 0; b < pos.length; b++) {
        if (a === b || (skip && skip(a, b))) continue;
        var dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y, dz = pos[a].z - pos[b].z;
        d.push({ b: b, dd: dx * dx + dy * dy + dz * dz });
      }
      d.sort(function (p, q) { return p.dd - q.dd; });
      for (var e = 0; e < k && e < d.length; e++) {
        var bi = d[e].b, lo = Math.min(a, bi), hi = Math.max(a, bi), key = lo + '_' + hi;
        if (!seen[key]) { seen[key] = 1; edges.push([lo, hi]); }
      }
    }
    return edges;
  }
  // every triangle a<b<c whose three sides are all edges → translucent faces
  function trisOf(edges) {
    var adj = []; for (var i = 0; i < N; i++) adj.push({});
    edges.forEach(function (e) { adj[e[0]][e[1]] = 1; adj[e[1]][e[0]] = 1; });
    var tris = [];
    for (var a = 0; a < N; a++) for (var b in adj[a]) { b = +b; if (b <= a) continue;
      for (var c in adj[b]) { c = +c; if (c <= b) continue; if (adj[a][c]) tris.push([a, b, c]); } }
    return tris;
  }

  // --- shape builders (each returns {pos, edges}; pos.length === N) ---
  function nebula() { // home: loose chaotic cluster
    var p = [];
    for (var i = 0; i < N; i++) {
      var r = Math.cbrt(rand(i * 5 + 1)), a = rand(i * 5 + 2) * 6.2832, b = Math.acos(2 * rand(i * 5 + 3) - 1);
      var x = r * Math.sin(b) * Math.cos(a) * 1.35, y = r * Math.cos(b) * 0.9, z = r * Math.sin(b) * Math.sin(a) * 1.15;
      x += (rand(i * 5 + 4) - 0.5) * 0.3; y += (rand(i * 5 + 5) - 0.5) * 0.3;
      p.push({ x: x, y: y, z: z });
    }
    return { pos: p, edges: knn(p, 3) };
  }
  function knot() { // about: (2,3) torus knot — a trefoil. Chain + 2 cross-links per node.
    var p = [], P = 2, Q = 3, R = 0.74, rr = 0.3;
    for (var i = 0; i < N; i++) {
      var t = i / N * Math.PI * 2, r = R + rr * Math.cos(Q * t);
      p.push({ x: r * Math.cos(P * t), y: rr * Math.sin(Q * t) * 1.2, z: r * Math.sin(P * t) });
    }
    var edges = [];
    for (var k = 0; k < N; k++) edges.push([Math.min(k, (k + 1) % N), Math.max(k, (k + 1) % N)]);
    var cross = knn(p, 2, function (a, b) { var rd = Math.abs(a - b); rd = Math.min(rd, N - rd); return rd <= 3; });
    return { pos: p, edges: edges.concat(cross) };
  }
  function icosphere() { // level-1 icosphere: 42 verts, 120 edges, 80 faces
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
    var f = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    v = v.map(function (a) { var l = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]); return [a[0]/l, a[1]/l, a[2]/l]; });
    var mid = {}, faces = [];
    function m(a, b) {
      var k = a < b ? a + '_' + b : b + '_' + a; if (mid[k] != null) return mid[k];
      var A = v[a], B = v[b], x = (A[0]+B[0])/2, y = (A[1]+B[1])/2, z = (A[2]+B[2])/2, l = Math.sqrt(x*x + y*y + z*z);
      v.push([x/l, y/l, z/l]); mid[k] = v.length - 1; return mid[k];
    }
    f.forEach(function (fc) { var a = fc[0], b = fc[1], c = fc[2], ab = m(a,b), bc = m(b,c), ca = m(c,a);
      faces.push([a,ab,ca], [b,bc,ab], [c,ca,bc], [ab,bc,ca]); });
    var edges = [], seen = {};
    faces.forEach(function (fc) { for (var i = 0; i < 3; i++) { var a = fc[i], b = fc[(i+1)%3], lo = Math.min(a,b), hi = Math.max(a,b), k = lo + '_' + hi;
      if (!seen[k]) { seen[k] = 1; edges.push([lo, hi]); } } });
    return { v: v, edges: edges };
  }
  function crystal() { // goodies: three nested shells (icosphere r1.02, icosphere r.58 rotated, icosahedron core r.24)
    var ico = icosphere(), p = [], edges = [];
    function rotY(a, ang) { var c = Math.cos(ang), s = Math.sin(ang); return [a[0]*c - a[2]*s, a[1], a[0]*s + a[2]*c]; }
    ico.v.forEach(function (a) { p.push({ x: a[0]*1.02, y: a[1]*1.02, z: a[2]*1.02 }); });
    ico.v.forEach(function (a) { var b = rotY(a, 0.62); p.push({ x: b[0]*0.58, y: b[1]*0.58, z: b[2]*0.58 }); });
    var core = [];
    for (var i = 0; i < 12; i++) { var b = rotY(ico.v[i], 1.1); core.push({ x: b[0]*0.24, y: b[1]*0.24, z: b[2]*0.24 }); }
    core.forEach(function (c) { p.push(c); });
    ico.edges.forEach(function (e) { edges.push([e[0], e[1]]); edges.push([e[0] + 42, e[1] + 42]); });
    knn(core, 5).forEach(function (e) { edges.push([e[0] + 84, e[1] + 84]); });
    for (var o = 0; o < 42; o += 3) { // sparse spokes: every 3rd outer vertex → nearest inner
      var best = -1, bd = 1e9;
      for (var j = 42; j < 84; j++) { var dx = p[o].x-p[j].x, dy = p[o].y-p[j].y, dz = p[o].z-p[j].z, dd = dx*dx+dy*dy+dz*dz; if (dd < bd) { bd = dd; best = j; } }
      edges.push([o, best]);
    }
    return { pos: p, edges: edges };
  }
  var FX = 12, FZ = 8;
  function field(t) { // blog: 12×8 standing wave (dynamic — rebuilt every frame with t)
    var p = [];
    for (var i = 0; i < FX; i++) for (var j = 0; j < FZ; j++) {
      var x = (i / (FX - 1) - 0.5) * 2.15, z = (j / (FZ - 1) - 0.5) * 1.5;
      var y = Math.sin(x*2.6 + t*1.5) * 0.22 + Math.cos(z*3 + t*1.1) * 0.2 + Math.sin((x+z)*1.8 - t*0.9) * 0.1;
      p.push({ x: x, y: y, z: z });
    }
    return p;
  }
  function fieldEdges() { // grid + one diagonal per cell → a triangle mesh
    var e = [];
    for (var i = 0; i < FX; i++) for (var j = 0; j < FZ; j++) {
      var k = i * FZ + j;
      if (i < FX - 1) e.push([k, k + FZ]);
      if (j < FZ - 1) e.push([k, k + 1]);
      if (i < FX - 1 && j < FZ - 1) e.push([k, k + FZ + 1]);
    }
    return e;
  }
  function spine() { // journal: trunk of 16 + 5 branches each (= the tree timeline)
    var p = [], edges = [], trunk = 16;
    for (var k = 0; k < trunk; k++) { var y = (k / (trunk - 1) - 0.5) * 2.1; p.push({ x: Math.sin(y*1.7)*0.1, y: y, z: Math.cos(y*1.3)*0.08 }); if (k > 0) edges.push([k - 1, k]); }
    var idx = trunk;
    for (k = 0; k < trunk; k++) for (var j = 0; j < 5; j++) {
      var s = k*9 + j*3, a = rand(s+1) * 6.2832, len = 0.2 + rand(s+2) * 0.6, tilt = 0.06 + rand(s+3) * 0.2, t = p[k];
      p.push({ x: t.x + Math.cos(a)*len, y: t.y + tilt*len*2, z: t.z + Math.sin(a)*len });
      edges.push([k, idx]); idx++;
    }
    return { pos: p, edges: edges };
  }

  function helix() { // resume: double helix — 48 rungs, 2.3 turns; strands chained, rungs across, sparse cross-links
    var p = [], edges = [], pairs = N / 2;
    for (var k = 0; k < pairs; k++) {
      var tt = k / (pairs - 1), a = tt * Math.PI * 2 * 2.3, y = (tt - 0.5) * 2.0, r = 0.55;
      p.push({ x: r * Math.cos(a), y: y, z: r * Math.sin(a) });
      p.push({ x: r * Math.cos(a + Math.PI), y: y, z: r * Math.sin(a + Math.PI) });
      edges.push([2 * k, 2 * k + 1]);                                   // rung
      if (k > 0) { edges.push([2 * k - 2, 2 * k]); edges.push([2 * k - 1, 2 * k + 1]); } // strands
    }
    var cross = knn(p, 1, function (a, b) { return Math.abs(a - b) <= 3; });
    return { pos: p, edges: edges.concat(cross) };
  }

  // Build the full registry once: {pos, edges, tris, eset, dynamic}
  function buildShapes() {
    var S = { nebula: nebula(), knot: knot(), crystal: crystal(), field: { pos: field(0), edges: fieldEdges(), dynamic: true }, spine: spine(), helix: helix() };
    Object.keys(S).forEach(function (k) {
      var s = S[k]; s.tris = trisOf(s.edges).slice(0, 260); s.eset = {};
      s.edges.forEach(function (e) { s.eset[e[0] + '_' + e[1]] = 1; });
    });
    return S;
  }

  // deep, dim parallax dot-field far behind the cluster
  function bgField(count) {
    var p = [];
    for (var i = 0; i < count; i++) {
      var u = rand(i + 7), v = rand(i + 77), w = rand(i + 777), r = 1.5 + 1.8 * Math.cbrt(u), a = v * 6.2832, b = Math.acos(2 * w - 1);
      p.push({ x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b), z: r * Math.sin(b) * Math.sin(a) });
    }
    return { pos: p, edges: knn(p, 1) };
  }

  function rotP(p, yaw, pitch) {
    var c = Math.cos(yaw), s = Math.sin(yaw), x1 = p.x * c - p.z * s, z1 = p.x * s + p.z * c, cp = Math.cos(pitch), sp = Math.sin(pitch);
    return { x: x1, y: p.y * cp - z1 * sp, z: p.y * sp + z1 * cp };
  }

  // depth colour: far = cool steel (104,122,138) → near = moss-bright (168,200,145)
  var LUT = [];
  for (var li = 0; li <= 10; li++) { var tt = li / 10; LUT.push(Math.round(lerp(104,168,tt)) + ',' + Math.round(lerp(122,200,tt)) + ',' + Math.round(lerp(138,145,tt))); }
  function col(nr) { return LUT[Math.round(nr * 10)]; }

  // --- per-frame draw passes (sp = projected points {x,y,z,rx,ry}) ---
  function drawDeepField(ctx, bg, W, H, T, px, py, reduced) {
    var fby = reduced ? 0.4 : T * 0.03, fbs = Math.min(W, H) * 0.52, fsp = new Array(bg.pos.length), k;
    for (k = 0; k < bg.pos.length; k++) { var fr = rotP(bg.pos[k], fby, -0.18), ff = 5 / (5 + fr.z); fsp[k] = { x: W/2 + fr.x*ff*fbs - px*ff, y: H/2 + fr.y*ff*fbs - py*ff, z: fr.z }; }
    ctx.lineWidth = 1;
    for (k = 0; k < bg.edges.length; k++) { var fa = fsp[bg.edges[k][0]], fb = fsp[bg.edges[k][1]], fn = 1 - ((fa.z + fb.z) / 2 + 3.3) / 6.6;
      ctx.strokeStyle = 'rgba(120,134,124,' + (0.04 + fn * 0.08).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(fa.x, fa.y); ctx.lineTo(fb.x, fb.y); ctx.stroke(); }
    for (k = 0; k < fsp.length; k++) { fn = clamp(1 - (fsp[k].z + 3.3) / 6.6, 0, 1);
      ctx.fillStyle = 'rgba(143,175,120,' + (0.06 + fn * 0.18).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(fsp[k].x, fsp[k].y, 0.8 + fn * 1.4, 0, 7); ctx.fill(); }
    return fsp;
  }
  // Every pass takes an optional `br` array: per-node brightness 0..1.5 (1 = normal, <1 dims,
  // >1 = "hot": bigger + stronger bloom). Used by the résumé demo to light the helix progressively.
  function bOf(br, k) { return br ? br[k] : 1; }
  function drawFaces(ctx, sp, list, wgt, br) {
    if (wgt <= 0.01) return;
    for (var q = 0; q < list.length; q++) {
      var a = sp[list[q][0]], b = sp[list[q][1]], c = sp[list[q][2]];
      var bw = br ? Math.min(Math.min(br[list[q][0]], br[list[q][1]]), br[list[q][2]]) : 1; if (bw > 1) bw = 1;
      var ux = b.rx-a.rx, uy = b.ry-a.ry, uz = b.z-a.z, vx = c.rx-a.rx, vy = c.ry-a.ry, vz = c.z-a.z;
      var nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx, nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1, sh = Math.abs(nz / nl);
      var nr = nearOf((a.z + b.z + c.z) / 3);
      ctx.fillStyle = 'rgba(' + col(nr) + ',' + ((0.018 + 0.09*sh) * (0.35 + 0.65*nr) * wgt * bw).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.fill();
    }
  }
  function drawEdges(ctx, sp, list, wgt, br) {
    if (wgt <= 0.01) return;
    for (var q = 0; q < list.length; q++) {
      var a = sp[list[q][0]], b = sp[list[q][1]], nr = nearOf((a.z + b.z) / 2);
      var bw = br ? Math.min(br[list[q][0]], br[list[q][1]]) : 1;
      ctx.lineWidth = (0.5 + nr * 1.3) * (bw > 1 ? 1.4 : 1); ctx.strokeStyle = 'rgba(' + col(nr) + ',' + ((0.07 + nr * 0.42) * wgt * Math.min(bw, 1.3)).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function drawPulses(ctx, sp, E, T, step, br) {
    for (var q = 0; q < E.length; q += step) {
      if (br && Math.min(br[E[q][0]], br[E[q][1]]) < 0.5) continue; // no pulses on unlit links
      var a = sp[E[q][0]], b = sp[E[q][1]], ph = (T * 0.5 + q * 0.1973) % 1, nr = nearOf(a.z + (b.z - a.z) * ph);
      ctx.fillStyle = 'rgba(224,236,210,' + (0.25 + nr * 0.5).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * ph, a.y + (b.y - a.y) * ph, 1 + nr * 1.5, 0, 7); ctx.fill();
    }
  }
  // nodes far→near with depth of field: far = soft out-of-focus disc, near = crisp dot + bloom
  function drawNodes(ctx, sp, br) {
    var ord = [], k; for (k = 0; k < N; k++) ord.push(k);
    ord.sort(function (a, b) { return sp[b].z - sp[a].z; });
    for (var o = 0; o < N; o++) {
      k = ord[o]; var P = sp[k], nr = nearOf(P.z), b = bOf(br, k), hot = b > 1, rr = (1.4 + nr * 2.6) * (hot ? 1.5 : 1), c = hot ? '224,236,210' : col(nr);
      var al = Math.min(b, 1);
      if (nr < 0.4 && !hot) {
        var g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 4.5); g.addColorStop(0, 'rgba(' + c + ',' + (0.28 * al).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, 4.5, 0, 7); ctx.fill(); continue;
      }
      if (nr > 0.66 || hot) { var g2 = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr * (hot ? 4.5 : 3.2)); g2.addColorStop(0, 'rgba(' + (hot ? '168,200,145' : c) + ',' + ((hot ? 0.5 : 0.26 * nr) * al).toFixed(3) + ')'); g2.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(P.x, P.y, rr * (hot ? 4.5 : 3.2), 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(' + c + ',' + ((0.4 + nr * 0.6) * al).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, 7); ctx.fill();
    }
  }

  // --- lightning bolts: a jagged steel-blue arc between two UNLINKED nodes that drift close ---
  var SPARK = 0.42;
  function boltLayer(max, cd) { return { s: [], cd: cd, max: max }; }
  function drawBolt(ctx, k) {
    var pr = k.life / SPARK, fs = k.seed + Math.floor(k.life * 90), rise = 0.16, env = pr < rise ? pr / rise : 1 - (pr - rise) / (1 - rise);
    if (env < 0) env = 0; env *= 0.85 + 0.15 * rand(fs + 11);
    var dx = k.bx - k.ax, dy = k.by - k.ay, len = Math.sqrt(dx*dx + dy*dy) || 1, nx = -dy / len, ny = dx / len;
    var P = [[2.6, '120,146,170', 0.26], [0.9, '198,212,226', 0.6]];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var pp = 0; pp < 2; pp++) {
      ctx.beginPath(); ctx.moveTo(k.ax, k.ay);
      for (var s = 1; s < 5; s++) { var t = s / 5, jit = (rand(fs + s*4.7 + pp*0.5) - 0.5) * len * 0.3 * (1 - Math.abs(2*t - 1)); ctx.lineTo(k.ax + dx*t + nx*jit, k.ay + dy*t + ny*jit); }
      ctx.lineTo(k.bx, k.by); ctx.lineWidth = P[pp][0]; ctx.strokeStyle = 'rgba(' + P[pp][1] + ',' + (P[pp][2] * env).toFixed(3) + ')'; ctx.stroke();
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    var fr = 1.5 + 1.5 * env;
    ctx.fillStyle = 'rgba(180,198,214,' + (0.45 * env).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(k.ax, k.ay, fr, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(k.bx, k.by, fr, 0, 7); ctx.fill();
  }
  // closest unlinked on-screen pair within `lim` px (eset flags existing links)
  function closestUnlinked(pts, eset, lim, W, H) {
    var bd = lim * lim, ba = -1, bb = -1, m = 48, n = pts.length;
    function on(P) { return P.x >= -m && P.x <= W + m && P.y >= -m && P.y <= H + m; }
    for (var a = 0; a < n; a++) { if (!on(pts[a])) continue;
      for (var b = a + 1; b < n; b++) { if (eset && eset[a + '_' + b]) continue; if (!on(pts[b])) continue;
        var qx = pts[a].x - pts[b].x, qy = pts[a].y - pts[b].y, qd = qx*qx + qy*qy; if (qd < bd) { bd = qd; ba = a; bb = b; } } }
    return ba >= 0 ? { A: pts[ba], B: pts[bb] } : null;
  }
  function stepBolts(ctx, st, finder, T) {
    st.cd -= 0.016;
    if (st.cd <= 0 && st.s.length < st.max) {
      var pr = finder();
      if (pr) { st.s.push({ ax: pr.A.x, ay: pr.A.y, bx: pr.B.x, by: pr.B.y, life: 0, seed: rand(T * 1.7 + pr.A.x * 0.013 + pr.B.y * 0.017) * 1000 }); st.cd = 0.3 + rand(T * 3.1) * 0.7; }
      else st.cd = 0.08;
    }
    for (var i = st.s.length - 1; i >= 0; i--) { st.s[i].life += 0.016; if (st.s[i].life >= SPARK) { st.s.splice(i, 1); continue; } if (st.s[i].life >= 0) drawBolt(ctx, st.s[i]); }
  }

  // film grain tile (drawn as a repeating pattern at low alpha) + a soft vignette
  function makeGrain() {
    var g = document.createElement('canvas'); g.width = g.height = 140; var x = g.getContext('2d'), im = x.createImageData(140, 140);
    for (var i = 0; i < im.data.length; i += 4) { var vv = 120 + Math.random() * 135; im.data[i] = im.data[i+1] = im.data[i+2] = vv; im.data[i+3] = 255; }
    x.putImageData(im, 0, 0); return x.createPattern(g, 'repeat');
  }
  function buildVignette(c, W, H, dpr) {
    var x = c.getContext('2d'); c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rg = x.createRadialGradient(W*0.5, H*0.45, Math.min(W,H)*0.2, W*0.5, H*0.5, Math.max(W,H)*0.8);
    rg.addColorStop(0, 'rgba(10,12,11,0)'); rg.addColorStop(1, 'rgba(8,9,9,.62)');
    x.clearRect(0, 0, W, H); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  }

  window.GELEUS.geo = {
    N: N, CAM: CAM, rand: rand, lerp: lerp, clamp: clamp, easeIO: easeIO, nearOf: nearOf,
    knn: knn, trisOf: trisOf, buildShapes: buildShapes, field: field, bgField: bgField, rotP: rotP, col: col,
    drawDeepField: drawDeepField, drawFaces: drawFaces, drawEdges: drawEdges, drawPulses: drawPulses, drawNodes: drawNodes,
    boltLayer: boltLayer, stepBolts: stepBolts, closestUnlinked: closestUnlinked,
    makeGrain: makeGrain, buildVignette: buildVignette
  };
})();
