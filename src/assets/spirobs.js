/* SpiRobs stage: the arm from my MuJoCo model, in the browser.
   Geometry is the real 35-disk table of the printed arm (z, width, tendon radius), with three tendons at 270/30/150 degrees.
   Each joint can bend by at most gap / lever (the same limit the MuJoCo model uses), so a common pull curls the thin tip
   far more than the base: that is what makes the spiral. The tip follows the pointer; when nobody is steering it traces a slow figure.
   Kinematic and spring-damped (not a physics solve): MuJoCo remains the source of truth for training. */
(function () {
  const DISKS = [[0, 10.6, 21.39, 6.95], [12.1, 27.05, 20.6, 6.7], [28.55, 42.79, 19.7, 6.41], [44.29, 57.86, 18.85, 6.13], [59.36, 72.27, 18.03, 5.87], [73.77, 86.07, 17.24, 5.61], [87.57, 99.29, 16.49, 5.37], [100.79, 111.95, 15.77, 5.14], [113.45, 124.07, 15.08, 4.91], [125.57, 135.69, 14.42, 4.7], [137.19, 146.83, 13.79, 4.5], [148.33, 157.51, 13.15, 4.3], [159.01, 167.75, 12.54, 4.11], [169.25, 177.58, 11.95, 3.93], [179.08, 187.01, 11.4, 3.76], [188.51, 196.06, 10.86, 3.59], [197.56, 204.75, 10.35, 3.43], [206.25, 213.1, 9.87, 3.28], [214.6, 221.12, 9.41, 3.13], [222.62, 228.84, 8.96, 2.99], [230.34, 236.25, 8.54, 2.86], [237.75, 243.39, 8.14, 2.72], [244.89, 250.26, 7.75, 2.6], [251.76, 256.87, 7.38, 2.48], [258.37, 263.24, 7.03, 2.36], [264.74, 269.37, 6.69, 2.25], [270.87, 275.29, 6.37, 2.14], [276.79, 280.99, 6.06, 2.04], [282.49, 286.5, 5.77, 1.94], [288, 291.81, 5.49, 1.84], [293.31, 296.94, 5.22, 1.74], [298.44, 301.9, 4.96, 1.65], [303.4, 306.7, 4.72, 1.57], [308.2, 311.34, 4.46, 1.48], [312.84, 315.56, 4.21, 1.4]]
    .map(([z0, z1, w, rh]) => ({ z0, z1, w, rh }));
  const N = DISKS.length;
  const HOLES = [270, 30, 150].map((d) => (d * Math.PI) / 180);
  const FMAX = 0.95; // fraction of the joint limits the stage allows; near the base the arm coils into the spiral the model is named for
  /* joint k sits in the gap below disk k+1. Max bend = gap / lever */
  const ALPHA = [];
  for (let i = 1; i < N; i++) ALPHA.push((DISKS[i].z0 - DISKS[i - 1].z1) / (DISKS[i].rh + 0.4 * DISKS[i].w));
  const LEN = 1.25; // the stage arm is drawn 25% longer than the printed one; widths and joint limits are unchanged
  DISKS.forEach((d) => { d.z0 *= LEN; d.z1 *= LEN; });
  const ARM = DISKS[N - 1].z1;

  /* forward kinematics for per-joint bend vectors b[i] = (bx, by) (radians). Returns disk frames. */
  function fk(bx, by, out) {
    let R = [1, 0, 0, 0, 1, 0, 0, 0, 1]; let px = 0, py = 0, pz = 0;
    for (let i = 0; i < N; i++) {
      const d = DISKS[i];
      if (i > 0) { // go to the start of disk i through the joint below it
        const gap = d.z0 - DISKS[i - 1].z1;
        px += R[2] * gap; py += R[5] * gap; pz += R[8] * gap;
        const ax = -by[i - 1], ay = bx[i - 1], ang = Math.hypot(ax, ay);
        if (ang > 1e-9) R = mul(R, rot(ax / ang, ay / ang, ang));
      }
      const len = d.z1 - d.z0, o = out[i];
      o.cx = px + R[2] * len * 0.5; o.cy = py + R[5] * len * 0.5; o.cz = pz + R[8] * len * 0.5; o.R = R;
      o.bx = px + R[2] * len; o.by = py + R[5] * len; o.bz = pz + R[8] * len;
      px = o.bx; py = o.by; pz = o.bz;
    }
    return out;
  }
  function rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a), t = 1 - c; // axis (x, y, 0)
    return [t * x * x + c, t * x * y, y * s, t * x * y, t * y * y + c, -x * s, -y * s, x * s, c]; }
  function mul(A, B) { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return r; }

  /* tip locus in a bend plane for a common fraction f of the joint limits, for inverse lookups */
  const LUT = [];
  { const bx = new Array(N - 1), by = new Array(N - 1).fill(0), fr = Array.from({ length: N }, () => ({}));
    for (let k = 0; k <= 160; k++) { const f = (k / 160) * FMAX; for (let i = 0; i < N - 1; i++) bx[i] = ALPHA[i] * f; const t = fk(bx, by, fr)[N - 1]; LUT.push({ f, r: t.bx, z: t.bz }); } }

  function mount(root) {
    const canvas = root.querySelector('canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const readout = root.querySelector('[data-readout]');
    const bars = [...root.querySelectorAll('[data-tendon]')];
    const tipEl = root.querySelector('[data-tip]');
    let W = 0, H = 0, dpr = 1, scale = 1, bx0 = 0, by0 = 0, C = {}, visible = true, raf = 0, last = 0, t = 0;
    const bxs = new Array(N - 1).fill(0), bys = new Array(N - 1).fill(0), vx = new Array(N - 1).fill(0), vy = new Array(N - 1).fill(0);
    const frames = Array.from({ length: N }, () => ({}));
    const trail = [];
    const ptr = { x: 0, y: 0, seen: 0, idle: 99 };
    let sgn = 1, fPrev = 0.2, tgt = { x: 0, z: ARM * 0.7 }, yaw = 0, tendon = [0, 0, 0];

    const col = () => {
      const cs = getComputedStyle(root); // read from the stage itself so a dark band keeps its own palette
      const g = (n) => cs.getPropertyValue(n).trim();
      C = { ink: g('--ink'), ink2: g('--ink-2'), line: g('--line-2'), panel: g('--panel-2'), sig: g('--signal'), plot: g('--plot'), dark: root.classList.contains('stage-dark') || document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches) };
    };
    function size() {
      const r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(280, r.width); H = Math.max(260, r.height); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(H * 0.9 / ARM, W * 0.82 / (ARM * 0.7)); bx0 = W / 2; by0 = H * 0.92;
    }

    /* pointer -> camera-plane target in mm, relative to the base. Works anywhere on the page. */
    addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = (e.clientX - r.left - bx0) / scale; ptr.y = (by0 - (e.clientY - r.top)) / scale; ptr.seen = 1; ptr.idle = 0;
    }, { passive: true });
    addEventListener('pointerleave', () => { ptr.idle = 99; });

    function solve(x, z) { // nearest point of the tip locus, with a little hysteresis for continuity
      const rr = Math.abs(x), sign = x < 0 ? -1 : 1; let best = 1e9, bf = fPrev, gb = 1e9, gf = fPrev;
      for (const p of LUT) { const d = Math.hypot(p.r - rr, p.z - z); if (d < gb) { gb = d; gf = p.f; } if (Math.abs(p.f - fPrev) < 0.05 && d < best) { best = d; bf = p.f; } }
      if (best > gb + 70 && rr > 35) bf = gf; // only jump across the coil when tracking locally has clearly lost the target
      fPrev = bf; return { f: bf, sign };
    }

    function step(dt) {
      t += dt; ptr.idle += dt;
      if (ptr.idle > 4 || !ptr.seen) { // figure-eight when nobody is steering
        tgt.x += ((Math.sin(t * 0.55) * ARM * 0.34) - tgt.x) * Math.min(1, dt * 2); tgt.z += ((ARM * 0.62 + Math.sin(t * 1.1) * ARM * 0.16) - tgt.z) * Math.min(1, dt * 2);
      } else { tgt.x += (ptr.x - tgt.x) * Math.min(1, dt * 7); tgt.z += (ptr.y - tgt.z) * Math.min(1, dt * 7); }
      const s = solve(tgt.x, tgt.z); sgn += (s.sign - sgn) * Math.min(1, dt * 9); const fx = s.f * sgn; // the bend direction blends through straight instead of flipping
      yaw = Math.sin(t * 0.23) * 0.22;
      for (let i = 0; i < N - 1; i++) { // spring-damped joints; the tip is softer, so a wave runs up the arm
        const u = i / (N - 2), K = 300 - 230 * u, c = 2 * Math.sqrt(K) * (0.8 + 0.2 * u);
        const gx = ALPHA[i] * fx, gy = 0;
        vx[i] += ((gx - bxs[i]) * K - c * vx[i]) * dt; vy[i] += ((gy - bys[i]) * K - c * vy[i]) * dt;
        bxs[i] += vx[i] * dt; bys[i] += vy[i] * dt;
      }
      // the bend plane is the camera plane (x right, z up); y of the arm frame is depth
      fk(bxs, bys, frames);
    }

    /* world (arm frame: x right, y depth, z up, mm) -> screen, with a slow orbit of the camera */
    const F = 1400, pitch = 0.1, cp = Math.cos(pitch), sp = Math.sin(pitch);
    function proj(x, y, z, o) {
      const xr = x * Math.cos(yaw) - y * Math.sin(yaw), yr = x * Math.sin(yaw) + y * Math.cos(yaw);
      const yy = yr * cp - z * sp, zz = yr * sp + z * cp, k = F / (F + yy);
      o.x = bx0 + xr * k * scale; o.y = by0 - zz * k * scale; o.k = k; o.d = yy; return o;
    }

    const P = { x: 0, y: 0, k: 1, d: 0 }, tmp = [];
    function ring(f, rad, n, out) { // points of the disk rim in world space
      const R = f.R; for (let j = 0; j < n; j++) { const a = (j / n) * Math.PI * 2, ca = Math.cos(a) * rad, sa = Math.sin(a) * rad;
        out[j] = { x: f.cx + R[0] * ca + R[1] * sa, y: f.cy + R[3] * ca + R[4] * sa, z: f.cz + R[6] * ca + R[7] * sa }; } return out; }

    function draw() {
      ctx.clearRect(0, 0, W, H);
            // reach arc and height ticks: the plane the pointer lives in
      ctx.save(); ctx.strokeStyle = C.line; ctx.fillStyle = C.ink2; ctx.lineWidth = 1; ctx.font = '11px ui-monospace, Menlo, Consolas, monospace'; ctx.globalAlpha = 0.55;
      ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.arc(bx0, by0, ARM * scale * 0.92, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.setLineDash([]);
      for (let m = 0; m <= 400; m += 50) { const y = by0 - m * scale; ctx.beginPath(); ctx.moveTo(bx0 - W * 0.46, y); ctx.lineTo(bx0 - W * 0.46 + (m % 100 === 0 ? 12 : 6), y); ctx.stroke(); if (m % 100 === 0) ctx.fillText(m + ' mm', bx0 - W * 0.46 + 18, y + 4); }
      ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(bx0, by0 + 4, 46 * scale * 0.9 + 14, 9, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

      // tendon holes and disk rings, painter-sorted by depth
      const list = [];
      for (let i = 0; i < N; i++) { const f = frames[i]; proj(f.cx, f.cy, f.cz, P); list.push({ i, d: P.d }); }
      list.sort((a, b) => b.d - a.d);
      const holes = HOLES.map(() => []);
      for (let i = 0; i < N; i++) { const f = frames[i], d = DISKS[i];
        for (let k = 0; k < 3; k++) { const ca = Math.cos(HOLES[k]) * d.rh, sa = Math.sin(HOLES[k]) * d.rh, R = f.R;
          for (const zz of [-0.5, 0.5]) { const L = (d.z1 - d.z0) * zz;
            holes[k].push({ x: f.cx + R[0] * ca + R[1] * sa + R[2] * L, y: f.cy + R[3] * ca + R[4] * sa + R[5] * L, z: f.cz + R[6] * ca + R[7] * sa + R[8] * L }); } } }
      const dark = C.dark;
      for (const { i } of list) {
        const f = frames[i], d = DISKS[i], u = i / (N - 1), n = Math.max(14, Math.round(26 - 10 * u));
        const top = ring({ ...f, cx: f.bx, cy: f.by, cz: f.bz }, d.w / 2, n, []), bot = ring({ ...f, cx: f.cx - (f.bx - f.cx), cy: f.cy - (f.by - f.cy), cz: f.cz - (f.bz - f.cz) }, d.w / 2, n, []);
        const sT = top.map((p) => proj(p.x, p.y, p.z, { x: 0, y: 0 })), sB = bot.map((p) => proj(p.x, p.y, p.z, { x: 0, y: 0 }));
        // body: sides as quads, shaded by how much each faces the viewer
        for (let j = 0; j < n; j++) { const j2 = (j + 1) % n, a = ((j + 0.5) / n) * Math.PI * 2, nx = f.R[0] * Math.cos(a) + f.R[1] * Math.sin(a), ny = f.R[3] * Math.cos(a) + f.R[4] * Math.sin(a);
          const nxr = nx * Math.cos(yaw) - ny * Math.sin(yaw), nyr = nx * Math.sin(yaw) + ny * Math.cos(yaw); if (nyr * cp > 0.15) continue; // back faces
          const lit = 0.5 + 0.5 * (-nxr * 0.55 + (-nyr) * 0.3);
          ctx.beginPath(); ctx.moveTo(sB[j].x, sB[j].y); ctx.lineTo(sB[j2].x, sB[j2].y); ctx.lineTo(sT[j2].x, sT[j2].y); ctx.lineTo(sT[j].x, sT[j].y); ctx.closePath();
          ctx.globalAlpha = 0.93; ctx.fillStyle = shade(i, lit, dark); ctx.fill(); }
        ctx.globalAlpha = 0.55; ctx.lineWidth = 0.8; ctx.strokeStyle = C.ink; ctx.beginPath(); sT.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
        if (f.R[8] > -2) { ctx.globalAlpha = 0.22; ctx.fillStyle = C.panel; ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      // tendons: three hairlines through the holes
      ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
      holes.forEach((h, k) => { ctx.beginPath(); h.forEach((p, j) => { proj(p.x, p.y, p.z, P); j ? ctx.lineTo(P.x, P.y) : ctx.moveTo(P.x, P.y); }); ctx.strokeStyle = k === 0 ? C.sig : C.plot; ctx.globalAlpha = k === 0 ? 0.85 : 0.6; ctx.stroke(); });
      ctx.globalAlpha = 1;

      // tip, trail, target
      const tipf = frames[N - 1]; proj(tipf.bx, tipf.by, tipf.bz, P); const tx = P.x, ty = P.y;
      trail.push({ x: tx, y: ty }); if (trail.length > 70) trail.shift();
      ctx.lineCap = 'round';
      for (let j = 1; j < trail.length; j++) { ctx.globalAlpha = (j / trail.length) * 0.5; ctx.strokeStyle = C.sig; ctx.lineWidth = 1 + (j / trail.length) * 1.6; ctx.beginPath(); ctx.moveTo(trail[j - 1].x, trail[j - 1].y); ctx.lineTo(trail[j].x, trail[j].y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      const gx = bx0 + tgt.x * scale, gy = by0 - tgt.z * scale;
      ctx.save(); ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(gx, gy); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(gx, gy, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx - 14, gy); ctx.lineTo(gx - 5, gy); ctx.moveTo(gx + 5, gy); ctx.lineTo(gx + 14, gy); ctx.moveTo(gx, gy - 14); ctx.lineTo(gx, gy - 5); ctx.moveTo(gx, gy + 5); ctx.lineTo(gx, gy + 14); ctx.stroke(); ctx.restore();
      const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 26); g.addColorStop(0, C.sig); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.4; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 26, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = C.sig; ctx.beginPath(); ctx.arc(tx, ty, 4.2, 0, Math.PI * 2); ctx.fill();

      // readout: change in each tendon's length, from the same geometry as the MuJoCo tendons
      for (let k = 0; k < 3; k++) { let s = 0; for (let i = 0; i < N - 1; i++) s += DISKS[i + 1].rh * (bxs[i] * Math.cos(HOLES[k]) + bys[i] * Math.sin(HOLES[k])); tendon[k] = -s; }
      if (bars.length && ((t * 20) | 0) !== draw.lt) { draw.lt = (t * 20) | 0;
        bars.forEach((b, k) => { const v = tendon[k], m = 32; b.querySelector('b').textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1); b.querySelector('i').style.transform = 'scaleX(' + Math.min(1, Math.abs(v) / m) + ')'; b.querySelector('i').style.transformOrigin = v >= 0 ? 'left' : 'right'; b.classList.toggle('pull', v < 0); });
        if (tipEl) tipEl.textContent = 'x ' + ((tipf.bx) | 0) + '  z ' + ((tipf.bz) | 0) + ' mm'; }
    }
    draw.lt = -1;

    function shade(i, lit, dark) { // base cool grey to warm tip, light or dark theme
      const u = i / (N - 1), warm = Math.max(0, (u - 0.72) / 0.28);
      const base = dark ? [58 + 70 * lit, 74 + 74 * lit, 92 + 76 * lit] : [178 - 70 * (1 - lit), 190 - 66 * (1 - lit), 192 - 58 * (1 - lit)];
      const sig = dark ? [255, 122, 61] : [232, 84, 30];
      const m = (a, b) => Math.round(a + (b - a) * warm * 0.9);
      return 'rgb(' + m(base[0], sig[0] * (0.55 + 0.45 * lit)) + ',' + m(base[1], sig[1] * (0.55 + 0.45 * lit)) + ',' + m(base[2], sig[2] * (0.55 + 0.45 * lit)) + ')';
    }

    function frame(now) {
      raf = 0; if (!visible) return;
      const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
      for (let k = 0; k < 3; k++) step(dt / 3); draw(); raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }
    col(); size(); for (let k = 0; k < 90; k++) step(1 / 60); draw();
    new ResizeObserver(() => { size(); draw(); }).observe(canvas);
    new MutationObserver(() => { col(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { col(); draw(); });
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) start(); }, { threshold: 0.01 }).observe(root);
    if (!reduce) start();
    root.dataset.ready = '1';
  }
  document.querySelectorAll('[data-spirobs]').forEach(mount);
})();
