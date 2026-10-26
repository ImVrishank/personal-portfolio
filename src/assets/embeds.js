/* Client side of the Markdown components (see md.js / WRITING.md).
   - iframe embeds (Desmos, Observable, Vimeo, generic): loaded when near the viewport; click-to-load on Save-Data.
     A visible fallback link always exists; a "taking a while" hint appears if the frame is slow.
   - YouTube: click-to-play facade (no third-party requests until clicked).
   - Lightbox for [data-lightbox] images.
   - ::plot : a real function grapher with sliders (own expression parser, no eval).
   Call window.hydrateEmbeds(rootElement) to (re)initialise a container (the studio preview does). */
(function () {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---------- iframes ---------- */
  function mountIframe(fig) {
    if (fig.dataset.mounted) return; fig.dataset.mounted = '1';
    const frame = fig.querySelector('.embed-frame');
    const iframe = document.createElement('iframe');
    iframe.src = fig.dataset.src; iframe.title = fig.dataset.title || 'Embedded content';
    iframe.loading = 'lazy'; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'fullscreen; clipboard-write'; iframe.allowFullscreen = true;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms');
    frame.classList.add('loading');
    const slow = setTimeout(() => frame.classList.add('slow'), 12000);
    iframe.addEventListener('load', () => { clearTimeout(slow); frame.classList.remove('loading', 'slow'); });
    frame.append(iframe);
  }
  function initIframes(root) {
    const figs = $$('.embed[data-src]', root).filter((f) => !f.dataset.init);
    figs.forEach((f) => (f.dataset.init = '1'));
    if (saveData || !('IntersectionObserver' in window)) {
      figs.forEach((fig) => {
        const link = fig.querySelector('.embed-fallback'); if (!link) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'embed-load'; b.textContent = 'Load interactive content';
        b.addEventListener('click', () => { link.remove(); b.remove(); mountIframe(fig); });
        link.after(b);
      });
      return;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mountIframe(e.target); } }), { rootMargin: '400px 0px' });
    figs.forEach((f) => io.observe(f));
  }

  /* ---------- YouTube facade ---------- */
  function initYouTube(root) {
    $$('.yt[data-yt]', root).filter((f) => !f.dataset.init).forEach((frame) => {
      frame.dataset.init = '1';
      const id = frame.dataset.yt, title = frame.dataset.title || 'YouTube video';
      const link = frame.querySelector('.embed-fallback');
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'yt-play'; btn.setAttribute('aria-label', 'Play: ' + title);
      btn.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-icon" aria-hidden="true"></span>`;
      btn.addEventListener('click', () => {
        const f = document.createElement('iframe');
        f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${frame.dataset.start || ''}`;
        f.title = title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.replaceChildren(f);
      });
      const img = btn.querySelector('img');
      img.addEventListener('error', () => img.remove()); // thumbnail blocked: the button still works
      frame.replaceChildren(btn);
      if (link) frame.dataset.fallback = link.href;
    });
  }

  /* ---------- lightbox ---------- */
  let dlg;
  function lightbox(links, i) {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'lightbox';
      dlg.innerHTML = '<button type="button" class="lb-close" aria-label="Close">×</button><button type="button" class="lb-prev" aria-label="Previous">‹</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-next" aria-label="Next">›</button>';
      document.body.append(dlg);
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('lb-close')) dlg.close(); });
    }
    const show = (n) => {
      i = (n + links.length) % links.length;
      const a = links[i], img = a.querySelector('img'), cap = (a.closest('figure') || {}).querySelector && a.closest('figure').querySelector('figcaption');
      dlg.querySelector('img').src = a.href; dlg.querySelector('img').alt = img ? img.alt : '';
      dlg.querySelector('figcaption').textContent = cap ? cap.textContent : '';
      dlg.querySelectorAll('.lb-prev,.lb-next').forEach((b) => (b.hidden = links.length < 2));
    };
    dlg.querySelector('.lb-prev').onclick = () => show(i - 1);
    dlg.querySelector('.lb-next').onclick = () => show(i + 1);
    dlg.onkeydown = (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); };
    show(i); dlg.showModal();
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-lightbox]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || !window.HTMLDialogElement) return;
    e.preventDefault();
    const group = a.closest('.gallery') ? $$('a[data-lightbox]', a.closest('.gallery')) : [a];
    lightbox(group, group.indexOf(a));
  });

  /* ---------- expression parser (no eval) ---------- */
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    exp: Math.exp, ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign, min: Math.min, max: Math.max, pow: Math.pow };
  const CONST = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };
  function compile(src) {
    const toks = [];
    const re = /\s*(?:(\d*\.?\d+(?:e[+-]?\d+)?)|([a-zA-Z_]\w*)|(\*\*|[-+*/^(),]))/gy;
    let m, pos = 0;
    while (pos < src.length && (m = (re.lastIndex = pos, re.exec(src)))) { pos = re.lastIndex; toks.push(m[1] ? { t: 'n', v: parseFloat(m[1]) } : m[2] ? { t: 'i', v: m[2].toLowerCase() } : { t: 'o', v: m[3] === '**' ? '^' : m[3] }); }
    if (src.slice(pos).trim()) throw new Error('Unexpected "' + src.slice(pos).trim()[0] + '"');
    // implicit multiplication: 2x, 2(x+1), (a)(b), x sin(x)
    const t2 = [];
    toks.forEach((tk, i) => {
      const prev = toks[i - 1];
      const prevVal = prev && (prev.t === 'n' || (prev.t === 'i' && !(prev.v in FN)) || prev.v === ')');
      const nextStart = tk.t === 'n' || tk.t === 'i' || tk.v === '(';
      if (prevVal && nextStart) t2.push({ t: 'o', v: '*' });
      t2.push(tk);
    });
    let p = 0;
    const peek = () => t2[p], eat = () => t2[p++];
    const isOp = (v) => peek() && peek().t === 'o' && peek().v === v;
    function expr() { let l = term(); while (isOp('+') || isOp('-')) { const op = eat().v, r = term(), a = l; l = op === '+' ? (e) => a(e) + r(e) : (e) => a(e) - r(e); } return l; }
    function term() { let l = unary(); while (isOp('*') || isOp('/')) { const op = eat().v, r = unary(), a = l; l = op === '*' ? (e) => a(e) * r(e) : (e) => a(e) / r(e); } return l; }
    function unary() { if (isOp('-')) { eat(); const u = unary(); return (e) => -u(e); } if (isOp('+')) { eat(); return unary(); } return power(); }
    function power() { const b = atom(); if (isOp('^')) { eat(); const x = unary(); return (e) => Math.pow(b(e), x(e)); } return b; }
    function atom() {
      const tk = eat(); if (!tk) throw new Error('Unexpected end');
      if (tk.t === 'n') return () => tk.v;
      if (tk.t === 'i') {
        if (tk.v in FN && isOp('(')) {
          eat(); const args = [];
          if (!isOp(')')) { args.push(expr()); while (isOp(',')) { eat(); args.push(expr()); } }
          if (!isOp(')')) throw new Error('Missing )'); eat();
          const f = FN[tk.v]; return (e) => f(...args.map((a) => a(e)));
        }
        if (tk.v in CONST) return () => CONST[tk.v];
        const name = tk.v; return (e) => (name in e ? e[name] : NaN);
      }
      if (tk.v === '(') { const x = expr(); if (!isOp(')')) throw new Error('Missing )'); eat(); return x; }
      throw new Error('Unexpected "' + tk.v + '"');
    }
    const f = expr(); if (p < t2.length) throw new Error('Unexpected "' + t2[p].v + '"');
    return f;
  }

  /* ---------- plot ---------- */
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
  function niceStep(span, target) { const raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag; }
  const fmt = (v) => (Math.abs(v) < 1e-9 ? '0' : Math.abs(v) >= 1000 || Math.abs(v) < 0.01 ? v.toExponential(1) : +v.toFixed(3) + '');

  function initPlot(fig) {
    if (fig.dataset.init) return; fig.dataset.init = '1';
    let cfg; try { cfg = JSON.parse(fig.dataset.plot); } catch (e) { return; }
    const frame = fig.querySelector('.plot-frame');
    let fns;
    try { fns = cfg.expr.split(';').map((s) => s.trim()).filter(Boolean).map((s) => ({ src: s, f: compile(s) })); }
    catch (err) { frame.innerHTML = `<p class="md-error">Could not read the expression "${cfg.expr.replace(/</g, '&lt;')}": ${String(err.message).replace(/</g, '&lt;')}</p>`; return; }
    const env = { x: 0 }; Object.entries(cfg.params).forEach(([k, p]) => (env[k] = p.val));
    const canvas = document.createElement('canvas'); canvas.className = 'plot-canvas'; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Graph of y = ' + fns.map((f) => f.src).join(' and y = '));
    if (cfg.height) canvas.style.height = cfg.height + 'px';
    const readout = document.createElement('div'); readout.className = 'plot-readout'; readout.setAttribute('aria-hidden', 'true');
    frame.replaceChildren(canvas, readout);
    if (Object.keys(cfg.params).length) {
      const box = document.createElement('div'); box.className = 'plot-sliders';
      Object.entries(cfg.params).forEach(([k, p]) => {
        const lab = document.createElement('label'); const out = document.createElement('output');
        const inp = document.createElement('input'); inp.type = 'range'; inp.min = p.min; inp.max = p.max; inp.step = p.step; inp.value = p.val;
        const upd = () => { env[k] = +inp.value; out.textContent = fmt(env[k]); }; upd();
        inp.addEventListener('input', () => { upd(); draw(); });
        lab.append(Object.assign(document.createElement('span'), { textContent: k + ' =' }), out, inp); box.append(lab);
      });
      frame.append(box);
    }
    let hoverX = null;
    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const g = canvas.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const ink = css('--ink'), ink2 = css('--ink-2'), line = css('--line'), colors = [css('--plot'), css('--signal'), ink];
      const xmin = cfg.xmin, xmax = cfg.xmax, N = Math.max(200, Math.min(1200, W * 1.5 | 0));
      const ys = fns.map((fn) => { const a = new Array(N + 1); for (let i = 0; i <= N; i++) { env.x = xmin + (xmax - xmin) * i / N; let v; try { v = fn.f(env); } catch (e) { v = NaN; } a[i] = Number.isFinite(v) ? v : NaN; } return a; });
      let ymin = cfg.ymin, ymax = cfg.ymax;
      if (ymin === null || ymax === null) {
        const all = ys.flat().filter(Number.isFinite).sort((p, q) => p - q);
        if (!all.length) { ymin = -1; ymax = 1; } else {
          let lo = all[Math.floor(all.length * 0.02)], hi = all[Math.ceil(all.length * 0.98) - 1];
          if (lo === hi) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.15; ymin = ymin ?? lo - pad; ymax = ymax ?? hi + pad;
        }
      }
      const L = 38, B = 22, T = 8, R = 10, pw = W - L - R, ph = H - T - B;
      const sx = (x) => L + (x - xmin) / (xmax - xmin) * pw, sy = (y) => T + (1 - (y - ymin) / (ymax - ymin)) * ph;
      g.font = '11px "Geist Mono", ui-monospace, monospace'; g.textBaseline = 'middle';
      const xs = niceStep(xmax - xmin, W / 90), ysT = niceStep(ymax - ymin, H / 55);
      g.lineWidth = 1;
      for (let x = Math.ceil(xmin / xs) * xs; x <= xmax + 1e-9; x += xs) { g.strokeStyle = line; g.beginPath(); g.moveTo(sx(x), T); g.lineTo(sx(x), T + ph); g.stroke(); g.fillStyle = ink2; g.textAlign = 'center'; g.fillText(fmt(x), sx(x), T + ph + 12); }
      for (let y = Math.ceil(ymin / ysT) * ysT; y <= ymax + 1e-9; y += ysT) { g.strokeStyle = line; g.beginPath(); g.moveTo(L, sy(y)); g.lineTo(L + pw, sy(y)); g.stroke(); g.fillStyle = ink2; g.textAlign = 'right'; g.fillText(fmt(y), L - 6, sy(y)); }
      g.strokeStyle = ink2; g.lineWidth = 1.4;
      if (ymin < 0 && ymax > 0) { g.beginPath(); g.moveTo(L, sy(0)); g.lineTo(L + pw, sy(0)); g.stroke(); }
      if (xmin < 0 && xmax > 0) { g.beginPath(); g.moveTo(sx(0), T); g.lineTo(sx(0), T + ph); g.stroke(); }
      g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip();
      ys.forEach((a, k) => {
        g.strokeStyle = colors[k % colors.length]; g.lineWidth = 2.2; g.lineJoin = 'round'; g.beginPath();
        let pen = false, prev = NaN;
        for (let i = 0; i <= N; i++) {
          const v = a[i]; if (!Number.isFinite(v)) { pen = false; continue; }
          const jump = pen && Math.abs(v - prev) > (ymax - ymin) * 2;
          if (!pen || jump) g.moveTo(sx(xmin + (xmax - xmin) * i / N), sy(v)); else g.lineTo(sx(xmin + (xmax - xmin) * i / N), sy(v));
          pen = true; prev = v;
        }
        g.stroke();
      });
      if (hoverX !== null) {
        g.strokeStyle = ink2; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(sx(hoverX), T); g.lineTo(sx(hoverX), T + ph); g.stroke(); g.setLineDash([]);
        env.x = hoverX; const parts = [];
        fns.forEach((fn, k) => { let v; try { v = fn.f(env); } catch (e) { v = NaN; } if (Number.isFinite(v)) { g.fillStyle = colors[k % colors.length]; g.beginPath(); g.arc(sx(hoverX), sy(v), 4, 0, 6.283); g.fill(); parts.push(fmt(v)); } });
        readout.textContent = `x = ${fmt(hoverX)}   ${parts.map((p, i) => (parts.length > 1 ? `f${i + 1}` : 'y') + ' = ' + p).join('   ')}`;
      } else readout.textContent = '';
      g.restore();
    }
    const move = (e) => { const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, L = 38, pw = r.width - L - 10; hoverX = cfg.xmin + (cfg.xmax - cfg.xmin) * Math.min(1, Math.max(0, (x - L) / pw)); draw(); };
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', move);
    canvas.addEventListener('pointerleave', () => { hoverX = null; draw(); });
    new ResizeObserver(draw).observe(canvas);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    draw();
  }

  function hydrate(root = document) { initIframes(root); initYouTube(root); $$('.plot[data-plot]', root).forEach(initPlot); }
  window.hydrateEmbeds = hydrate;
  window.__compileExpr = compile; // exposed for tests
  hydrate();
})();
