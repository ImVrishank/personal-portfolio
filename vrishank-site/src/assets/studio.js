/* Writing studio: drafts library, Markdown editor, live preview, import/export.
   Drafts are stored in this browser (localStorage). Export a post as .md and commit it to content/posts/. */
(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'vas-studio-drafts-v1';
  const els = {
    studio: $('studio'), list: $('draft-list'), title: $('f-title'), date: $('f-date'), slug: $('f-slug'),
    tags: $('f-tags'), summary: $('f-summary'), category: $('f-category'), layout: $('f-layout'), cover: $('f-cover'), equation: $('f-equation'), featured: $('f-featured'), draft: $('f-draft'), body: $('body'), preview: $('preview'),
    count: $('count'), saved: $('saved'), hint: $('publish-hint'), images: $('image-list'),
  };

  /* ---------- helpers ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const unq = (s) => { // strip quotes and honour YAML escapes (\\ and \") inside double quotes
  const m = s.match(/^(['"])(.*)\1$/);
  return !m ? s : m[1] === '"' ? m[2].replace(/\\(["\\])/g, '$1') : m[2].replace(/''/g, "'");
};
  const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

  // Same rules as build.mjs
  function parseFrontMatter(raw) {
    const m = raw.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: raw };
    const data = {}; let key = null;
    for (const line of m[1].split(/\r?\n/)) {
      const li = line.match(/^\s+-\s+(.*)$/);
      if (li && key) { if (!Array.isArray(data[key])) data[key] = []; data[key].push(unq(li[1].trim())); continue; }
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv) continue;
      key = kv[1]; const v = kv[2].trim();
      if (v === '') data[key] = [];
      else if (v[0] === '[' && v[v.length - 1] === ']') data[key] = v.slice(1, -1).split(',').map((s) => unq(s.trim())).filter(Boolean);
      else if (v === 'true' || v === 'false') data[key] = v === 'true';
      else data[key] = unq(v);
    }
    return { data, body: m[2] };
  }

  const serialize = (d) => {
    const fm = ['---', `title: ${q(d.title || 'Untitled')}`, `date: ${d.date}`];
    if (d.summary) fm.push(`summary: ${q(d.summary)}`);
    if (d.tags.length) fm.push(`tags: [${d.tags.join(', ')}]`);
    if (d.category) fm.push(`category: ${d.category}`);
    if (d.layout && d.layout !== 'default') fm.push(`layout: ${d.layout}`);
    if (d.cover) fm.push(`cover: ${d.cover}`);
    if (d.equation) fm.push(`equation: ${q(d.equation)}`);
    if (d.featured) fm.push('featured: true');
    if (d.slug) fm.push(`slug: ${d.slug}`);
    if (d.draft) fm.push('draft: true');
    fm.push('---', '');
    return fm.join('\n') + d.body.replace(/^\n+/, '') + (d.body.endsWith('\n') ? '' : '\n');
  };
  const filename = (d) => `${d.date}-${d.slug || slugify(d.title) || 'untitled'}.md`;

  /* ---------- state ---------- */
  let drafts = [];
  try { drafts = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { drafts = []; }
  let current = null;
  const images = new Map(); // filename -> { blob, url }
  let slugTouched = false, saveTimer = 0;

  const blank = () => ({ id: uid(), title: '', date: today(), slug: '', tags: [], summary: '', draft: true, body: '', updated: Date.now(), remotePath: '', category: '', layout: 'default', cover: '', equation: '', featured: false });
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(drafts)); els.saved.textContent = 'Saved in this browser'; }
    catch (e) { els.saved.textContent = 'Could not save (storage full or blocked). Export now.'; }
  }
  function scheduleSave() {
    els.saved.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { current.updated = Date.now(); persist(); renderList(); }, 400);
  }

  /* ---------- UI ---------- */
  function renderList() {
    const sorted = [...drafts].sort((a, b) => b.updated - a.updated);
    els.list.innerHTML = '';
    sorted.forEach((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      if (current && d.id === current.id) b.setAttribute('aria-current', 'true');
      const t = document.createElement('b'); t.textContent = d.title || 'Untitled';
      const s = document.createElement('span'); s.textContent = `${d.date}${d.draft ? ' · draft' : ''}`;
      b.append(t, s); b.onclick = () => open(d.id);
      li.append(b); els.list.append(li);
    });
  }

  function open(id) {
    current = drafts.find((d) => d.id === id) || drafts[0];
    els.title.value = current.title; els.date.value = current.date; els.slug.value = current.slug;
    els.tags.value = current.tags.join(', '); els.summary.value = current.summary;
    els.draft.checked = current.draft; els.body.value = current.body;
    els.category.value = current.category || ''; els.layout.value = current.layout || 'default'; els.cover.value = current.cover || '';
    els.equation.value = current.equation || ''; els.featured.checked = !!current.featured;
    slugTouched = !!current.slug;
    update(false); renderList();
  }

  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe, object, embed, style, link, meta').forEach((n) => n.remove());
    doc.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }));
    return doc.body.innerHTML;
  }

  let md = null, lastHtml = '';
  function pipeline() {
    if (md || !window.marked || !window.Markdown) return md;
    md = window.Markdown.create({ marked: window.marked, katex: window.katex, highlight: window.Highlight && window.Highlight.highlight });
    return md;
  }
  function renderPreview() {
    const m = pipeline();
    if (!m) { els.preview.textContent = 'Preview unavailable: scripts did not load.'; return; }
    const r = m.render(current.body || '');
    const html = sanitize(r.html);
    const sig = html + '|' + current.title + current.date + current.draft + images.size;
    if (sig === lastHtml) return; lastHtml = sig;
    const box = document.createElement('div'); box.className = 'prose'; box.innerHTML = html;
    box.querySelectorAll('img, a[data-lightbox]').forEach((n) => {
      const attr = n.tagName === 'IMG' ? 'src' : 'href';
      const mm = (n.getAttribute(attr) || '').match(/^\/media\/(.+)$/);
      if (mm && images.has(decodeURIComponent(mm[1]))) n.setAttribute(attr, images.get(decodeURIComponent(mm[1])).url);
    });
    const head = document.createElement('div');
    head.innerHTML = `<p class="meta"></p><h1 style="font-family:var(--display);font-weight:500;letter-spacing:-.035em;font-size:clamp(30px,4vw,48px);line-height:1.05;margin:8px 0 18px"></h1>`;
    head.querySelector('.meta').textContent = `${current.date}${current.draft ? ' · Draft' : ''}`;
    head.querySelector('h1').textContent = current.title || 'Untitled';
    els.preview.replaceChildren(head, box);
    if (window.hydrateEmbeds) window.hydrateEmbeds(els.preview);
  }
  let previewT = 0;
  const renderPreviewSoon = () => { clearTimeout(previewT); previewT = setTimeout(renderPreview, 220); };

  function renderImages() {
    els.images.innerHTML = '';
    if (!images.size) return;
    const h = document.createElement('li'); h.className = 'hint'; h.textContent = 'Add these images to content/media/ in your repo (same file names):';
    els.images.append(h);
    images.forEach((v, name) => {
      const li = document.createElement('li');
      const im = document.createElement('img'); im.src = v.url; im.alt = '';
      const c = document.createElement('code'); c.textContent = name;
      const a = document.createElement('a'); a.href = v.url; a.download = name; a.textContent = 'Download';
      li.append(im, c, a); els.images.append(li);
    });
  }

  function update(save = true) {
    const words = (current.body.match(/\S+/g) || []).length;
    els.count.textContent = `${words} words · ${Math.max(1, Math.round(words / 220))} min read`;
    els.hint.textContent = `Save as content/posts/${filename(current)} in your repo, then commit and push. Draft posts stay hidden until you remove "draft: true".`;
    if (save) renderPreviewSoon(); else renderPreview();
    if (save) scheduleSave();
  }

  /* ---------- input wiring ---------- */
  els.title.addEventListener('input', () => {
    current.title = els.title.value;
    if (!slugTouched) { current.slug = slugify(current.title); els.slug.value = current.slug; }
    update();
  });
  els.slug.addEventListener('input', () => { slugTouched = true; current.slug = slugify(els.slug.value); update(); });
  els.date.addEventListener('input', () => { current.date = els.date.value || today(); update(); });
  els.tags.addEventListener('input', () => { current.tags = els.tags.value.split(',').map((s) => s.trim()).filter(Boolean); update(); });
  els.summary.addEventListener('input', () => { current.summary = els.summary.value; update(); });
  els.draft.addEventListener('change', () => { current.draft = els.draft.checked; update(); });
  els.category.addEventListener('change', () => { current.category = els.category.value; update(); });
  els.layout.addEventListener('change', () => { current.layout = els.layout.value; update(); });
  els.cover.addEventListener('input', () => { current.cover = els.cover.value.trim(); update(); });
  els.equation.addEventListener('input', () => { current.equation = els.equation.value; update(); });
  els.featured.addEventListener('change', () => { current.featured = els.featured.checked; update(); });
  els.body.addEventListener('input', () => { current.body = els.body.value; update(); });

  /* ---------- toolbar ---------- */
  function wrapSel(before, after = before, ph = 'text') {
    const t = els.body, s = t.selectionStart, e = t.selectionEnd, sel = t.value.slice(s, e) || ph;
    t.setRangeText(before + sel + after, s, e, 'end');
    t.setSelectionRange(s + before.length, s + before.length + sel.length);
    t.focus(); t.dispatchEvent(new Event('input'));
  }
  function linePrefix(prefix) {
    const t = els.body, s = t.selectionStart, e = t.selectionEnd;
    const start = t.value.lastIndexOf('\n', s - 1) + 1;
    const block = t.value.slice(start, e).split('\n').map((l) => prefix + l).join('\n');
    t.setRangeText(block, start, e, 'end'); t.focus(); t.dispatchEvent(new Event('input'));
  }
  function insert(text) { const t = els.body; t.setRangeText(text, t.selectionStart, t.selectionEnd, 'end'); t.focus(); t.dispatchEvent(new Event('input')); }
  const actions = {
    h2: () => linePrefix('## '), h3: () => linePrefix('### '), ul: () => linePrefix('- '), quote: () => linePrefix('> '),
    bold: () => wrapSel('**'), italic: () => wrapSel('*'), code: () => wrapSel('`', '`', 'code'),
    link: () => wrapSel('[', '](https://)', 'link text'),
    codeblock: () => wrapSel('\n```cpp\n', '\n```\n', 'code'),
    table: () => insert('\n| Part | Role |\n| --- | --- |\n| ESP32 | Controller |\n| PCA9685 | Servo driver |\n'),
  };
  document.querySelector('.toolbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (b) actions[b.dataset.act]();
  });
  els.body.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Tab') { e.preventDefault(); insert('  '); }
    else if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); actions.bold(); }
    else if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); actions.italic(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); download(); }
  });

  /* ---------- images ---------- */
  function addImage(file) {
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
    let base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image', name = base + ext, n = 2;
    while (images.has(name)) name = `${base}-${n++}${ext}`;
    images.set(name, { blob: file, url: URL.createObjectURL(file) });
    insert(`\n![${base.replace(/-/g, ' ')}](/media/${name})\n`);
    renderImages();
  }
  $('img-input').addEventListener('change', (e) => { [...e.target.files].forEach(addImage); e.target.value = ''; });
  els.body.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].filter((x) => x.type.startsWith('image/'));
    if (f.length) { e.preventDefault(); f.forEach(addImage); }
  });

  /* ---------- import / export ---------- */
  async function importFiles(files) {
    let last = null, pruned = false;
    for (const f of files) {
      if (!/\.(md|markdown|txt)$/i.test(f.name)) continue;
      const raw = await f.text();
      const { data, body } = parseFrontMatter(raw);
      const d = blank();
      let text = body;
      d.title = data.title || '';
      const h1 = text.match(/^\s*#\s+(.+)\r?\n/);
      if (!d.title && h1) { d.title = h1[1].trim(); text = text.slice(h1[0].length); }
      if (!d.title) d.title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
      const fd = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
      d.date = data.date ? String(data.date).slice(0, 10) : fd ? fd[1] : today();
      d.slug = data.slug || slugify(d.title);
      d.summary = data.summary || ''; d.tags = Array.isArray(data.tags) ? data.tags : [];
      d.category = data.category || ''; d.layout = data.layout || 'default'; d.cover = data.cover || ''; d.equation = data.equation || ''; d.featured = !!data.featured;
      d.draft = data.draft === undefined ? true : !!data.draft;
      d.body = text.replace(/^\n+/, '');
      if (!pruned) { drafts = drafts.filter((x) => x.title || x.body.trim()); pruned = true; }
      drafts.push(d); last = d;
    }
    if (last) { persist(); open(last.id); }
  }
  $('import').addEventListener('change', (e) => { importFiles([...e.target.files]); e.target.value = ''; });
  const drop = $('drop'); let depth = 0;
  addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { depth++; drop.hidden = false; } });
  addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.hidden = true; });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', (e) => {
    e.preventDefault(); depth = 0; drop.hidden = true;
    const fs = [...e.dataTransfer.files];
    const imgs = fs.filter((f) => f.type.startsWith('image/'));
    imgs.forEach(addImage);
    importFiles(fs.filter((f) => !f.type.startsWith('image/')));
  });

  function download() {
    const blob = new Blob([serialize(current)], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename(current);
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('download').onclick = download;
  $('copy').onclick = () => navigator.clipboard.writeText(serialize(current)).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => ($('copy').textContent = 'Copy Markdown'), 1400); });
  $('new').onclick = () => { const d = blank(); drafts.push(d); persist(); open(d.id); els.title.focus(); };
  $('delete').onclick = () => {
    if (!confirm('Delete this draft from this browser? Export it first if you want to keep it.')) return;
    drafts = drafts.filter((d) => d.id !== current.id);
    if (!drafts.length) drafts.push(blank());
    persist(); open(drafts[0].id);
  };

  /* narrow screens: write / preview toggle */
  function view(v) {
    els.studio.dataset.view = v;
    $('v-write').setAttribute('aria-pressed', v === 'write'); $('v-preview').setAttribute('aria-pressed', v === 'preview');
  }
  $('v-write').onclick = () => view('write'); $('v-preview').onclick = () => view('preview');


  /* ---------- GitHub: commit posts + images, pull posts (helpers live in gh.js) ---------- */
  const GH = window.GH;
  $('gh-publish').onclick = async () => {
    const btn = $('gh-publish'); btn.disabled = true;
    try {
      const postPath = current.remotePath || `content/posts/${filename(current)}`;
      const files = [{ path: postPath, text: serialize(current) }];
      // only images actually referenced by this post
      images.forEach((v, name) => { if (current.body.includes(`/media/${name}`)) files.push({ path: `content/media/${name}`, blob: v.blob }); });
      const r = await GH.commit({ files, message: `${current.remotePath ? 'Update' : 'Add'} post: ${current.title || 'Untitled'}` });
      current.remotePath = postPath; persist();
      GH.say(`Committed ${r.count} file(s) to ${r.branch}.${current.draft ? ' The post is still marked draft, so it stays hidden until you untick Draft and commit again.' : ' Your host should rebuild shortly.'}`, 'ok');
    } catch (err) { GH.say(err.message, 'err'); }
    btn.disabled = false;
  };

  $('gh-pull').onclick = async () => {
    const btn = $('gh-pull'); btn.disabled = true;
    try {
      GH.say('Listing posts…');
      const list = await GH.api(`/contents/content/posts?ref=${encodeURIComponent(GH.branch())}`);
      const files = list.filter((f) => f.type === 'file' && /\.md$/i.test(f.name));
      let n = 0, last = null;
      for (const f of files) {
        GH.say(`Pulling ${f.name} (${++n}/${files.length})…`);
        const { data, body } = parseFrontMatter(await GH.readFile(f.path));
        const existing = drafts.find((d) => d.remotePath === f.path);
        const d = existing || blank();
        d.title = data.title || f.name.replace(/\.md$/, ''); d.date = data.date ? String(data.date).slice(0, 10) : (f.name.match(/^\d{4}-\d{2}-\d{2}/) || [today()])[0];
        d.slug = data.slug || slugify(d.title); d.summary = data.summary || ''; d.tags = Array.isArray(data.tags) ? data.tags : [];
        d.category = data.category || ''; d.layout = data.layout || 'default'; d.cover = data.cover || ''; d.equation = data.equation || ''; d.featured = !!data.featured;
        d.draft = !!data.draft; d.body = body.replace(/^\n+/, ''); d.remotePath = f.path; d.updated = Date.now();
        if (!existing) drafts.push(d);
        last = d;
      }
      if (last) { drafts = drafts.filter((x) => x.title || x.body.trim()); persist(); open(last.id); }
      GH.say(`Pulled ${files.length} post(s) into your drafts.`, 'ok');
    } catch (err) { GH.say(err.message, 'err'); }
    btn.disabled = false;
  };

  /* topics for the Topic select come from the published site.json (falls back to a basic list) */
  (async function () {
    let topics = [['robotics', 'Robotics'], ['math', 'Mathematics'], ['ai', 'AI / ML'], ['electronics', 'Electronics'], ['notes', 'Notes']];
    try { const j = await (await fetch('/studio/site/site.json')).json(); if (j.topics && j.topics.length) topics = j.topics.map((t) => [t.slug, t.label]); } catch (e) {}
    topics.forEach(([v, l]) => els.category.append(Object.assign(document.createElement('option'), { value: v, textContent: l })));
    els.category.value = (current && current.category) || '';
  })();

  /* ---------- boot ---------- */
  if (!drafts.length) { drafts.push(blank()); persist(); }
  open(drafts.sort((a, b) => b.updated - a.updated)[0].id);
})();
