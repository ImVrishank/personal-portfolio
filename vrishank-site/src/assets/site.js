/* Shared site behaviour: copy buttons, theme toggle, print, archive filters, article TOC scroll-spy and progress bar. */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (b) {
    const code = b.closest('.code').querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(() => { const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => (b.textContent = t), 1400); });
  }
  if (e.target.closest('[data-print]')) window.print();
});

/* Theme toggle */
(function () {
  const btn = document.getElementById('theme');
  if (!btn) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (t) => {
    document.documentElement.dataset.theme = t;
    if (meta) meta.content = t === 'dark' ? '#0A0D12' : '#F2F4F3';
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  apply(document.documentElement.dataset.theme || 'light');
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();

/* Writing archive: topic + tag filter and search (the full list works without JS) */
function initArchive() {
  const box = document.getElementById('post-filter');
  if (!box) return;
  box.hidden = false;
  const q = document.getElementById('post-q'), bar = document.getElementById('tagbar');
  const rows = [...document.querySelectorAll('#wgrid > li')], empty = document.getElementById('filter-empty');
  let topic = '', tag = '';
  function apply() {
    const term = q.value.trim().toLowerCase(); let shown = 0;
    rows.forEach((li) => {
      const ok = (!topic || li.dataset.topic === topic) && (!tag || li.dataset.tags.split('|').includes(tag)) && (!term || li.dataset.text.includes(term));
      li.hidden = !ok; if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }
  q.addEventListener('input', apply);
  if (bar) bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    topic = b.dataset.topic || ''; tag = b.dataset.tag || '';
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); apply();
  });
}

/* Electronics: filter by type */
function initParts() {
  const bar = document.getElementById('kindbar'), box = document.getElementById('part-filter');
  if (!bar) return;
  box.hidden = false;
  const items = [...document.querySelectorAll('#parts > li')];
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    items.forEach((li) => (li.hidden = !!b.dataset.kind && li.dataset.kind !== b.dataset.kind));
  });
}

/* Articles: reading progress + table-of-contents scroll-spy */
function initArticle() {
  document.querySelectorAll('.progress').forEach((n) => n.remove());
  if (window.__onScroll) { removeEventListener('scroll', window.__onScroll); window.__onScroll = null; }
  if (!document.body.classList.contains('is-post')) return;
  const bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.append(bar);
  const prose = document.querySelector('.prose');
  let tick = false;
  const upd = () => {
    tick = false;
    const grid = document.querySelector('.art-grid');
    if (prose && grid) { const r = grid.getBoundingClientRect(); if (r) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)))})`; }
  };
  window.__onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(upd); } };
  addEventListener('scroll', window.__onScroll, { passive: true }); upd();
  const links = [...document.querySelectorAll('.toc-col .toc a')];
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const heads = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { links.forEach((a) => a.classList.remove('on')); const a = map.get(en.target.id); if (a) a.classList.add('on'); } });
    }, { rootMargin: '-80px 0px -70% 0px' });
    heads.forEach((h) => io.observe(h));
  }
}

/* run the per-page scripts (a client-side router can call window.initPage() after swapping content) */
window.initPage = () => { initArchive(); initParts(); initArticle(); };
window.initPage();

/* section reveal: fade up as blocks enter the viewport (home only; no-ops without IntersectionObserver or with reduced motion) */
(function () {
  try {
    if (!document.body.classList.contains('home') || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('.block .wrap > *:not(.block-title), .block .block-title').forEach((el) => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal'); io.observe(el); } });
  } catch (e) { /* content stays visible */ }
})();
