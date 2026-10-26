/* Site editor: a schema-driven form for content/site.json.
   Edits autosave in this browser. Output: download site.json, or commit it (plus uploaded images/PDF) to GitHub. */
(function () {
  const $ = (id) => document.getElementById(id);
  const GH = window.GH;
  const KEY = 'vas-site-draft-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  let data = {}, published = null;
  const pending = new Map(); // file name -> { blob, url }
  const open = new Set();    // open list items, by path

  /* ---------- uploaded files survive reloads (IndexedDB) ---------- */
  const idb = {
    db: null,
    open() { return this.db ||= new Promise((res, rej) => { const r = indexedDB.open('vas-site', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('files', mode); const out = fn(t.objectStore('files')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); },
    put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)).catch(() => {}); },
    clear() { return this.tx('readwrite', (s) => s.clear()).catch(() => {}); },
    async all() { try { const db = await this.open(); return await new Promise((res) => { const out = []; const r = db.transaction('files').objectStore('files').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; r.onerror = () => res([]); }); } catch (e) { return []; } },
  };

  /* ---------- schema ---------- */
  const F = (key, label, type = 'text', x = {}) => ({ key, label, type, ...x });
  const SECTIONS = [
    { id: 'profile', title: 'Profile', fields: [
      F('name', 'Full name'), F('short', 'Short name (shown in the header)'), F('title', 'Browser tab title'),
      F('description', 'Search and share description', 'area'), F('location', 'Location'),
      F('availability', 'Availability line (LED panel)', 'text', { hint: 'Also baked into the share image, so regenerate that if you change it.' }),
      F('url', 'Site URL', 'text', { hint: 'Your final domain, e.g. https://vrishank.dev. Enables the sitemap, canonical URLs and the share image.' }),
    ] },
    { id: 'links', title: 'Links', obj: (d) => (d.links ||= {}), fields: [
      F('email', 'Email'), F('github', 'GitHub URL'), F('linkedin', 'LinkedIn URL'),
      F('resume', 'Resume link', 'file', { accept: '.pdf', hint: 'Leave empty to use the printable /resume/ page, or upload a PDF.', prefix: 'resume' }),
    ] },
    { id: 'intro', title: 'Home page intro', fields: [
      F('statement', 'Headline', 'area', { hint: 'Wrap a word in *asterisks* to make it italic and orange.' }),
      F('bio', 'Bio', 'paras', { hint: 'Blank line between paragraphs.' }),
    ] },
    { id: 'home', title: 'Home page wording', obj: (d) => (d.home ||= {}), fields: [
      F('kicker', 'Small line above the headline'), F('latelyNote', 'Note under "Lately"'), F('projectsNote', 'Note under "Things that move"'),
      F('benchNote', 'Note under "On the bench"'), F('contactHeadline', 'Closing headline', 'text', { hint: '*asterisks* work here too.' }), F('contactCopy', 'Closing line', 'area'),
    ] },
    { id: 'about', title: 'About page', obj: (d) => (d.about ||= {}), fields: [
      F('title', 'Page headline', 'text', { hint: '*asterisks* make a word italic and orange.' }), F('lede', 'Home page teaser (one paragraph)', 'area'),
      F('paragraphs', 'Main text', 'paras', { hint: 'Blank line between paragraphs.' }), F('approach', 'How I like to build', 'lines', { hint: 'One point per line.' }),
      F('explore', 'Currently curious about', 'lines', { hint: 'One per line. Shown as tags.' }),
    ] },
    { id: 'topics', title: 'Writing topics', list: 'topics', itemLabel: (it) => it.label || 'New topic', blank: () => ({ slug: '', label: '', glyph: '' }),
      fields: [F('label', 'Name'), F('slug', 'Slug', 'text', { hint: 'Used as `category:` in post front matter.' }), F('glyph', 'Symbol', 'text', { hint: 'One character shown on text-only cards, e.g. ∑ or Ω.' })] },
    { id: 'work', title: 'Work', list: 'work', itemLabel: (it) => [it.company, it.role].filter(Boolean).join(' · ') || 'New role',
      blank: () => ({ company: '', role: '', period: '', location: '', intro: '', items: [] }),
      fields: [F('company', 'Company'), F('role', 'Role'), F('period', 'Period'), F('location', 'Location'), F('intro', 'Intro', 'area'),
        F('items', 'Highlights', 'list', { itemLabel: (it) => it.title || 'New highlight', blank: () => ({ title: '', text: [], chips: [] }),
          fields: [F('title', 'Title'), F('text', 'Text', 'paras', { hint: 'Blank line between paragraphs.' }), F('chips', 'Tags', 'chips', { hint: 'Comma separated.' })] })] },
    { id: 'projects', title: 'Projects', list: 'projects', itemLabel: (it) => it.title || 'New project',
      blank: () => ({ slug: '', group: 'featured', domain: 'hardware', tags: [], title: '', kind: '', status: 'Built', summary: [], specs: [], image: '', links: [] }),
      fields: [F('title', 'Title'), F('slug', 'Slug', 'text', { hint: 'Used in the URL and to match content/projects/<slug>.md.' }),
        F('group', 'Section', 'select', { options: [['featured', 'Featured (full spec sheet)'], ['scratch', 'Built from scratch (compact)']] }),
        F('domain', 'Kind of project', 'select', { options: [['hardware', 'Hardware'], ['software', 'Software'], ['ai', 'AI / ML'], ['math', 'Mathematics']] }),
        F('tags', 'Tags', 'chips', { hint: 'Comma separated. Posts sharing a tag show up as related writing.' }),
        F('kind', 'One-line description'), F('status', 'Status tag'), F('summary', 'Summary', 'paras', { hint: 'Blank line between paragraphs.' }),
        F('specs', 'Spec table', 'pairs', { hint: 'One per line: Label: value' }),
        F('image', 'Photo', 'file', { accept: 'image/*', prefix: 'projects' }),
        F('links', 'Links', 'linkpairs', { hint: 'One per line: Label | https://url' })] },
    { id: 'skills', title: 'Skills', fields: [F('skills', 'Skill groups', 'pairs', { hint: 'One per line: Group: item, item, item' })] },
    { id: 'education', title: 'Education', obj: (d) => (d.education ||= {}), fields: [F('school', 'School'), F('degree', 'Degree'), F('place', 'Place'), F('note', 'Note (e.g. CGPA)')] },
  ];

  /* ---------- value <-> text ---------- */
  const lines = (v) => v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const TO = {
    text: (v) => v || '', area: (v) => v || '', select: (v) => v || '', file: (v) => v || '',
    paras: (v) => (v || []).join('\n\n'), lines: (v) => (v || []).join('\n'), chips: (v) => (v || []).join(', '),
    pairs: (v) => (v || []).map((p) => `${p[0]}: ${p[1]}`).join('\n'),
    linkpairs: (v) => (v || []).map((l) => `${l.label} | ${l.href}`).join('\n'),
  };
  const FROM = {
    text: (v) => v, area: (v) => v, select: (v) => v, file: (v) => v.trim(),
    paras: (v) => v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
    lines: lines, chips: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
    pairs: (v) => lines(v).map((l) => { const i = l.indexOf(':'); return i < 0 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
    linkpairs: (v) => lines(v).map((l) => { const i = l.indexOf('|'); return i < 0 ? { label: l, href: '' } : { label: l.slice(0, i).trim(), href: l.slice(i + 1).trim() }; }).filter((l) => l.href),
  };

  /* ---------- persistence ---------- */
  let saveT = 0;
  function changed() {
    $('se-saved').textContent = 'Editing… (saved in this browser, not published)';
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); $('se-saved').textContent = 'Edits saved in this browser. Not published yet.'; } catch (e) { $('se-saved').textContent = 'Could not save locally. Download site.json.'; } }, 350);
  }

  /* ---------- rendering ---------- */
  const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); kids.forEach((k) => k && n.append(k)); return n; };

  function fileName(prefix, file) {
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
    const base = prefix === 'resume' ? 'resume' : slugify(file.name.replace(/\.[^.]+$/, '')) || 'file';
    return base + ext;
  }

  function renderField(f, obj, onEdit) {
    if (f.type === 'list') return renderList(f, obj, f.key, f.key);
    const label = el('label'); label.append(el('span', { textContent: f.label }));
    let input;
    if (f.type === 'select') {
      input = el('select'); f.options.forEach(([v, t]) => input.append(el('option', { value: v, textContent: t })));
      input.value = obj[f.key] || f.options[0][0];
    } else if (f.type === 'text' || f.type === 'file') {
      input = el('input', { type: 'text', value: TO[f.type](obj[f.key]), autocomplete: 'off' });
    } else {
      input = el('textarea', { value: TO[f.type](obj[f.key]) });
      input.rows = Math.min(14, Math.max(3, (input.value.match(/\n/g) || []).length + 2));
    }
    input.addEventListener('input', () => { obj[f.key] = FROM[f.type](input.value); onEdit && onEdit(); changed(); });
    label.append(input);
    if (f.hint) label.append(el('span', { className: 'h', textContent: f.hint }));
    if (f.type === 'file') {
      const pick = el('input', { type: 'file', accept: f.accept || '*' });
      pick.addEventListener('change', () => {
        const file = pick.files[0]; if (!file) return;
        const name = fileName(f.prefix, file);
        pending.set(name, { blob: file, url: URL.createObjectURL(file) }); idb.put(name, file);
        input.value = `/media/${name}`; input.dispatchEvent(new Event('input'));
        renderPending(); rerender();
      });
      label.append(pick);
      const cur = String(obj[f.key] || ''), m = cur.match(/^\/media\/(.+)$/);
      if (/image/.test(f.accept || '') && cur) label.append(el('img', { className: 'se-thumb', alt: '', src: m && pending.has(m[1]) ? pending.get(m[1]).url : cur }));
    }
    return label;
  }

  function renderFields(fields, obj, onEdit) {
    const box = el('div', { className: 'se-fields' });
    fields.forEach((f) => box.append(renderField(f, obj, onEdit)));
    return box;
  }

  function renderList(f, parent, key, path) {
    const arr = (parent[key] ||= []);
    const wrap = el('div', { className: 'se-sub' });
    wrap.append(el('span', { className: 'h', textContent: f.label || f.title }));
    const list = el('div', { className: 'se-list' });
    arr.forEach((item, i) => {
      const p = `${path}[${i}]`;
      const lbl = el('span', { className: 'lbl', textContent: f.itemLabel(item) });
      const mk = (txt, title, fn) => el('button', { type: 'button', textContent: txt, title, onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); } });
      const det = el('details', { className: 'se-item', open: open.has(p) });
      det.addEventListener('toggle', () => (det.open ? open.add(p) : open.delete(p)));
      det.append(el('summary', {}, lbl,
        mk('↑', 'Move up', () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; open.clear(); changed(); rerender(); } }),
        mk('↓', 'Move down', () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; open.clear(); changed(); rerender(); } }),
        mk('Remove', 'Remove', () => { if (confirm(`Remove "${f.itemLabel(item)}"?`)) { arr.splice(i, 1); open.clear(); changed(); rerender(); } })));
      const body = el('div', { className: 'se-item-body' });
      f.fields.forEach((sf) => body.append(sf.type === 'list' ? renderList(sf, item, sf.key, `${p}.${sf.key}`) : renderField(sf, item, () => (lbl.textContent = f.itemLabel(item)))));
      det.append(body); list.append(det);
    });
    wrap.append(list, el('button', { type: 'button', className: 's-btn', textContent: `Add ${(f.label || f.title).toLowerCase().replace(/s$/, '')}`, onclick: () => { arr.push(f.blank()); open.add(`${path}[${arr.length - 1}]`); changed(); rerender(); } }));
    return wrap;
  }

  function rerender() {
    const y = window.scrollY;
    const form = $('se-form'); form.replaceChildren();
    SECTIONS.forEach((s) => {
      const sec = el('section', { className: 'se-sec', id: `sec-${s.id}` }, el('h2', { textContent: s.title }));
      if (s.list) sec.append(renderList(s, data, s.list, s.list));
      else sec.append(renderFields(s.fields, s.obj ? s.obj(data) : data));
      form.append(sec);
    });
    window.scrollTo(0, y);
  }

  function renderNav() {
    const ul = $('se-sections'); ul.replaceChildren();
    SECTIONS.forEach((s) => ul.append(el('li', {}, el('a', { href: `#sec-${s.id}`, textContent: s.title }))));
  }

  function renderPending() {
    const ul = $('se-pending'); ul.replaceChildren();
    if (!pending.size) return;
    ul.append(el('li', { className: 'hint', textContent: 'Uploaded files (kept in this browser, committed with your changes):' }));
    pending.forEach((v, name) => ul.append(el('li', {}, el('code', { textContent: name }), el('a', { href: v.url, download: name, textContent: 'Download' }))));
  }

  /* ---------- output ---------- */
  const json = () => JSON.stringify(data, null, 2) + '\n';
  $('se-download').onclick = () => {
    const a = el('a', { href: URL.createObjectURL(new Blob([json()], { type: 'application/json' })), download: 'site.json' });
    document.body.append(a); a.click(); a.remove();
  };
  $('se-reset').onclick = () => {
    if (!confirm('Discard all local edits and reload the published content?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = clone(published || {}); pending.clear(); idb.clear(); renderPending(); open.clear(); rerender(); $('se-saved').textContent = 'Reset to published content.';
  };
  $('se-commit').onclick = async () => {
    const btn = $('se-commit'); btn.disabled = true;
    try {
      const text = json();
      const files = [{ path: 'content/site.json', text }];
      pending.forEach((v, name) => { if (text.includes(`/media/${name}`)) files.push({ path: `content/media/${name}`, blob: v.blob }); });
      // every /media/ file the JSON points to must exist on the live site or be part of this commit
      const refs = [...new Set([...text.matchAll(/"(\/media\/[^"]+)"/g)].map((m) => m[1]))];
      const missing = [];
      for (const r of refs) {
        if (pending.has(r.replace('/media/', ''))) continue;
        try { const res = await fetch(r, { method: 'HEAD' }); if (!res.ok) missing.push(r); } catch (e) { missing.push(r); }
      }
      if (missing.length && !confirm(`These files are referenced but not found on the live site and not uploaded in this session:\n\n${missing.join('\n')}\n\nCommit anyway? (Upload them in the form first.)`)) { GH.say('Cancelled. Re-upload the missing files, then commit.', 'err'); btn.disabled = false; return; }
      const r = await GH.commit({ files, message: 'Update site content' });
      GH.say(`Committed ${r.count} file(s) to ${r.branch}. Your host should rebuild shortly.`, 'ok');
      published = clone(data); pending.clear(); idb.clear(); renderPending();
      try { localStorage.removeItem(KEY); } catch (e) {}
      $('se-saved').textContent = 'Published. Local edits cleared.';
    } catch (err) { GH.say(err.message, 'err'); }
    btn.disabled = false;
  };
  $('se-load').onclick = async () => {
    const btn = $('se-load'); btn.disabled = true;
    try {
      GH.say('Reading content/site.json…');
      data = JSON.parse(await GH.readFile('content/site.json')); published = clone(data);
      try { localStorage.removeItem(KEY); } catch (e) {}
      open.clear(); rerender(); GH.say('Loaded the latest site.json from the repo.', 'ok'); $('se-saved').textContent = 'Loaded from repo.';
    } catch (err) { GH.say(err.message, 'err'); }
    btn.disabled = false;
  };

  /* ---------- boot ---------- */
  (async function () {
    try { published = await (await fetch('/studio/site/site.json')).json(); } catch (e) { published = null; }
    let local = null;
    try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    data = clone(local || published || {});
    $('se-saved').textContent = local ? 'Restored your unpublished edits from this browser.' : published ? 'Showing the published content.' : 'Could not load site.json. Use "Load from repo".';
    for (const [name, blob] of await idb.all()) pending.set(name, { blob, url: URL.createObjectURL(blob) });
    renderNav(); renderPending(); rerender();
  })();
})();
