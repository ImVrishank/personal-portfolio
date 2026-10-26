/* Background + cursor.
   Background: a flow field (smooth vector field of summed sines) traced by drifting particles. It bends around the pointer.
   - Animated only on devices with a fine pointer, no reduced-motion preference and enough CPU.
   - Static streamlines on touch, reduced motion, low-power devices and long-form article pages.
   Cursor: the native cursor is never hidden. A small "probe" ring follows the pointer and reads plane coordinates;
   it grows over links (with a label), and stays out of the way over prose, inputs, embeds and plots. */
(function () {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const weak = (navigator.hardwareConcurrency || 4) <= 2 || !!(navigator.connection && navigator.connection.saveData);
  const reading = body.classList.contains('is-post');
  const dim = body.dataset.bg === 'dim';
  const animated = fine && !reduce && !weak && !reading;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  let W = 0, H = 0, rgb = '20,60,90', sig = '232,84,30', parts = [], raf = 0, last = 0, t = 0;
  const px = { x: -9999, y: -9999, on: 0 };

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    rgb = (cs.getPropertyValue('--fx') || rgb).trim(); sig = (cs.getPropertyValue('--fx-sig') || sig).trim();
  };

  /* smooth flow direction at (x, y, t): sums of sines give a wandering, divergence-light field */
  const angle = (x, y, tt) => {
    const u = x / 380, v = y / 380;
    return Math.sin(u * 1.3 + tt * 0.11) * 1.6 + Math.cos(v * 1.7 - tt * 0.09) * 1.5 + Math.sin((u + v) * 0.9 + tt * 0.05) * 1.1;
  };
  function vel(x, y, tt, out) {
    const a = angle(x, y, tt); let vx = Math.cos(a), vy = Math.sin(a);
    if (px.on > 0.01) {
      const dx = x - px.x, dy = y - px.y, d2 = dx * dx + dy * dy, R = 190;
      if (d2 < R * R) {
        const d = Math.sqrt(d2) || 1, w = Math.pow(1 - d / R, 2) * px.on;
        vx += w * (-dy / d) * 2.4 + w * (dx / d) * 1.1; vy += w * (dx / d) * 2.4 + w * (dy / d) * 1.1;
      }
    }
    out.x = vx; out.y = vy;
  }

  const count = () => Math.round(Math.min(230, Math.max(46, (W * H) / 9500)) * (dim ? 0.55 : 1) * (weak ? 0.5 : 1));
  const spawn = (p) => { p.x = Math.random() * W; p.y = Math.random() * H; p.px = p.x; p.py = p.y; p.life = 120 + Math.random() * 260; p.s = Math.random() < 0.09; return p; };
  const tmp = { x: 0, y: 0 };

  function size() {
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readColors();
    if (animated) { parts = Array.from({ length: count() }, () => spawn({})); ctx.clearRect(0, 0, W, H); }
    else drawStatic();
  }

  /* static: integrate streamlines once and draw them faint */
  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    const n = Math.round(count() * 0.9), a = dim ? 0.1 : 0.16;
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = Math.random() * W, y = Math.random() * H, steps = 70 + (Math.random() * 60 | 0);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < steps; s++) { vel(x, y, 0, tmp); x += tmp.x * 5; y += tmp.y * 5; ctx.lineTo(x, y); }
      ctx.strokeStyle = `rgba(${Math.random() < 0.08 ? sig : rgb},${a * (0.5 + Math.random())})`;
      ctx.stroke();
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 24) return; // ~40fps is plenty for this
    last = now; t += 0.016;
    // fade old trails (transparent canvas, so erase instead of painting over)
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
    const a = dim ? 0.3 : 0.5;
    px.on += ((px.x > -999 ? 1 : 0) - px.on) * 0.08;
    for (const p of parts) {
      vel(p.x, p.y, t, tmp);
      p.px = p.x; p.py = p.y; p.x += tmp.x * 1.35; p.y += tmp.y * 1.35; p.life--;
      if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) { spawn(p); continue; }
      ctx.strokeStyle = `rgba(${p.s ? sig : rgb},${p.s ? a * 1.3 : a})`;
      ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  }
  const start = () => { if (animated && !raf) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  size();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 180); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new MutationObserver(() => { readColors(); if (!animated) drawStatic(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (animated) {
    addEventListener('pointermove', (e) => { px.x = e.clientX; px.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => { px.x = -9999; });
    start();
  }

  /* ---------- the probe ---------- */
  const probe = document.getElementById('probe');
  if (!probe || !fine) { if (probe) probe.remove(); return; }
  const label = probe.querySelector('span');
  let tx = -100, ty = -100, cx = -100, cy = -100, shown = false, mode = '', txt = '';
  const QUIET = '.prose, input, textarea, select, iframe, video, canvas.plot-canvas, .plot, .embed, .code, dialog, .studio';
  const LINKS = 'a[href], button, summary, [role="button"], label[for], .knob';

  function classify(el) {
    if (!el || !el.closest) return '';
    if (el.closest(QUIET)) return 'quiet';
    const l = el.closest(LINKS);
    if (l) { txt = l.dataset.probe || (l.matches('a[href^="http"]') ? '↗' : l.matches('a[href^="mailto"]') ? 'mail' : l.tagName === 'BUTTON' ? '' : 'open'); return 'link'; }
    return '';
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; cx = tx; cy = ty; probe.classList.add('on'); }
    const m = classify(e.target);
    if (m !== mode) { mode = m; probe.classList.toggle('is-link', m === 'link'); probe.classList.toggle('is-quiet', m === 'quiet'); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { shown = false; probe.classList.remove('on'); });
  addEventListener('pointerdown', () => probe.classList.add('is-down'));
  addEventListener('pointerup', () => probe.classList.remove('is-down'));
  const unit = 48;
  let tick = 0;
  (function loop() {
    cx += (tx - cx) * (reduce ? 1 : 0.22); cy += (ty - cy) * (reduce ? 1 : 0.22);
    probe.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    if (shown && !(tick++ % 3)) {
      const next = mode === 'link' ? txt : `${((tx - innerWidth / 2) / unit).toFixed(1)}, ${((innerHeight / 2 - ty) / unit).toFixed(1)}`;
      if (next !== label.textContent) label.textContent = next;
      probe.classList.toggle('flip', tx > innerWidth - 150);
    }
    requestAnimationFrame(loop);
  })();
})();
