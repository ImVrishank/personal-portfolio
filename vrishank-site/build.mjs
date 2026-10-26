// Static site generator. Markdown + JSON in, HTML out.
//   node build.mjs                      -> builds ./dist
//   INCLUDE_DRAFTS=1 node build.mjs     -> also builds posts marked draft: true
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Marked } from 'marked';
import katex from 'katex';
import { ART } from './art.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const require = createRequire(import.meta.url);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const site = JSON.parse(read('content/site.json'));
const INCLUDE_DRAFTS = !!process.env.INCLUDE_DRAFTS;

/* ---------- helpers ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const em = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>'); // *word* -> italic in headlines
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function write(rel, content) { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b); }
}
const loadUmd = (rel) => { const m = { exports: {} }; new Function('module', 'exports', read(rel))(m, m.exports); return m.exports; };

/* ---------- front matter (kept in sync with src/assets/studio.js) ---------- */
const unq = (s) => { // strip quotes and honour YAML escapes (\\ and \") inside double quotes
  const m = s.match(/^(['"])(.*)\1$/);
  return !m ? s : m[1] === '"' ? m[2].replace(/\\(["\\])/g, '$1') : m[2].replace(/''/g, "'");
};
export function parseFrontMatter(raw) {
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
    else if (v.startsWith('[') && v.endsWith(']')) data[key] = v.slice(1, -1).split(',').map((s) => unq(s.trim())).filter(Boolean);
    else if (v === 'true' || v === 'false') data[key] = v === 'true';
    else data[key] = unq(v);
  }
  return { data, body: m[2] };
}

/* ---------- markdown (shared with the studio preview) ---------- */
const { highlight } = loadUmd('src/assets/highlight.js');
const Markdown = loadUmd('src/assets/md.js');
const md = Markdown.create({ marked: { Marked }, katex, highlight });
const stripMd = (s) => s.replace(/```[\s\S]*?```/g, ' ').replace(/^:{2,3}.*$/gm, ' ').replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\[\^[^\]]+\]:?.*$/gm, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`$\\|-]/g, ' ').replace(/\s+/g, ' ').trim();
const kt = (tex, display = false) => katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });

/* ---------- topics ---------- */
const TOPICS = site.topics || [];
const topicOf = (slug) => TOPICS.find((t) => t.slug === slug);
const DOMAIN = { robotics: 'Robotics', hardware: 'Hardware', ai: 'AI / ML', software: 'Software', math: 'Mathematics' };

/* ---------- content loaders ---------- */
function readDir(rel) {
  const dir = path.join(ROOT, rel);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => ({ f, full: path.join(dir, f) })) : [];
}
const baseName = (f) => f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
const dateOf = (f, data, full) => data.date ? String(data.date).slice(0, 10) : ((f.match(/^(\d{4}-\d{2}-\d{2})-/) || [])[1] || fs.statSync(full).mtime.toISOString().slice(0, 10));

function loadPosts() {
  const out = [];
  for (const { f, full } of readDir('content/posts')) {
    const { data, body } = parseFrontMatter(fs.readFileSync(full, 'utf8'));
    if (data.draft && !INCLUDE_DRAFTS) continue;
    const r = md.render(body);
    const plain = stripMd(body);
    const words = plain.split(/\s+/).filter(Boolean).length;
    out.push({
      slug: slugify(data.slug || baseName(f)), title: data.title || baseName(f).replace(/-/g, ' '), date: dateOf(f, data, full),
      updated: data.updated ? String(data.updated).slice(0, 10) : '',
      tags: Array.isArray(data.tags) ? data.tags : [], category: data.category || '', cover: data.cover || '', coverAlt: data.coverAlt || '',
      featured: !!data.featured, layout: ['photo', 'math'].includes(data.layout) ? data.layout : 'default', equation: data.equation || '',
      project: data.project || '', draft: !!data.draft,
      summary: data.summary || plain.slice(0, 170).replace(/\s+\S*$/, '') + '…',
      minutes: Math.max(1, Math.round(words / 220)), ...r,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

const specsOf = (arr) => (Array.isArray(arr) ? arr : []).map((s) => { const i = String(s).indexOf(':'); return i < 0 ? [String(s), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()]; });
function loadCollection(dir, defKind) {
  const items = [];
  for (const { f, full } of readDir(dir)) {
    const { data, body } = parseFrontMatter(fs.readFileSync(full, 'utf8'));
    if (data.draft && !INCLUDE_DRAFTS) continue;
    const r = md.render(body);
    items.push({
      slug: slugify(data.slug || baseName(f)), title: data.title || baseName(f), kind: data.kind || defKind, art: data.art || '', links: (Array.isArray(data.links) ? data.links : []).map((l) => { const i = String(l).indexOf('|'); return i < 0 ? [l, l] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }), tagline: data.tagline || '',
      specs: specsOf(data.specs), status: data.status || 'used', project: data.project || '', image: data.image || '', date: dateOf(f, data, full),
      order: Number(data.order) || 0, core: data.core === true, hasBody: stripMd(body).length > 0, ...r,
    });
  }
  return items.sort((a, b) => b.order - a.order || (a.date < b.date ? 1 : -1) || a.title.localeCompare(b.title));
}
const posts = loadPosts();
const parts = loadCollection('content/electronics', 'board');
const aiItems = loadCollection('content/ai', 'model');
const docs = {};
for (const { f, full } of readDir('content/projects')) { const { data, body } = parseFrontMatter(fs.readFileSync(full, 'utf8')); docs[f.replace(/\.md$/, '')] = { data, ...md.render(body), hasBody: stripMd(body).length > 0 }; }
const hasPosts = posts.length > 0;
const projects = site.projects || [];
const projectBy = (slug) => projects.find((p) => p.slug === slug);

/* ---------- generated art for parts without photos ---------- */
function partArt(title, kind, art) {
  if (art && ART[art]) return `<svg class="art" viewBox="0 0 200 124" role="img" aria-label="${esc(title)} illustration" fill="none" stroke="currentColor" stroke-width="1.6">${ART[art]()}</svg>`;
  const h = hash(title), t = title.toLowerCase();
  const pin = (x, y, w, hgt) => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="1"/>`;
  let inner = '';
  if (/cam/.test(t)) {
    inner = `<rect x="52" y="26" width="96" height="74" rx="4"/><path d="M52 40h-26v10h14v-8h12m-26 12h26" fill="none"/>`
      + `<circle cx="100" cy="56" r="21"/><circle cx="100" cy="56" r="12" class="sig-s"/><circle cx="100" cy="56" r="3.5" class="sig-f"/><rect x="78" y="86" width="44" height="9" rx="2"/>`
      + Array.from({ length: 9 }, (_, i) => pin(46, 32 + i * 7.5, 6, 3.5) + pin(148, 32 + i * 7.5, 6, 3.5)).join('');
  } else if (/jetson/.test(t)) {
    inner = `<rect x="22" y="20" width="156" height="84" rx="9"/>` + [[32, 30], [168, 30], [32, 94], [168, 94]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')
      + `<rect x="62" y="32" width="64" height="58" rx="3" class="sig-s"/>` + Array.from({ length: 7 }, (_, i) => `<path d="M${72 + i * 8} 37v48" fill="none"/>`).join('')
      + `<circle cx="38" cy="62" r="8"/><circle cx="38" cy="62" r="3"/><rect x="156" y="40" width="20" height="14"/><rect x="156" y="62" width="20" height="14"/>`;
  } else if (/raspberry|\bpi\b/.test(t)) {
    inner = `<rect x="22" y="20" width="156" height="84" rx="9"/>` + [[32, 94], [168, 94]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')
      + Array.from({ length: 20 }, (_, i) => `<circle cx="${44 + i * 6.2}" cy="31" r="1.5"/><circle cx="${44 + i * 6.2}" cy="38" r="1.5"/>`).join('')
      + `<rect x="78" y="52" width="30" height="30" rx="3" class="sig-s"/><rect x="146" y="46" width="30" height="16"/><rect x="146" y="68" width="30" height="16"/><rect x="34" y="62" width="22" height="22"/>`;
  } else if (/esp|module/.test(t)) {
    inner = `<rect x="52" y="26" width="96" height="74" rx="4"/><path d="M52 40h-26v10h14v-8h12m-26 12h26" fill="none"/><rect x="64" y="46" width="40" height="40" rx="2" class="sig-s"/>`
      + Array.from({ length: 9 }, (_, i) => pin(46, 32 + i * 7.5, 6, 3.5) + pin(148, 32 + i * 7.5, 6, 3.5)).join('');
  } else if (kind === 'sbc') {
    inner = `<rect x="22" y="20" width="156" height="84" rx="9"/>` + [[32, 30], [168, 30], [32, 94], [168, 94]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')
      + `<rect x="74" y="42" width="40" height="40" rx="3" class="sig-s"/><rect x="170" y="48" width="12" height="16"/><rect x="170" y="70" width="12" height="16"/><path d="M34 60h26M34 68h26M34 76h26" fill="none"/>`;
  } else if (kind === 'display' || /oled|ssd|lcd|display/.test(t)) {
    inner = `<rect x="34" y="22" width="132" height="80" rx="5"/><rect x="44" y="32" width="112" height="56" rx="2" fill="none"/>`
      + Array.from({ length: 8 * 14 }, (_, i) => { const x = i % 14, y = (i / 14) | 0; return (hash(title + i) % 5 < 2) ? `<circle cx="${50 + x * 7.6}" cy="${38 + y * 6.6}" r="1.9" class="sig-f"/>` : ''; }).join('')
      + `<path d="M60 102v6M80 102v6M100 102v6M120 102v6" fill="none"/>`;
  } else if (kind === 'power' || /ubec|regulator|lipo|battery|buck|bec/.test(t)) {
    inner = `<rect x="44" y="30" width="112" height="60" rx="5"/><path d="M60 60h20l8-14 12 28 8-14h32" fill="none" class="sig-s"/><path d="M44 48H30M44 72H30M156 48h14M156 72h14" fill="none"/>`;
  } else if (kind === 'ai' || kind === 'model') {
    const cols = [3, 5, 5, 3], xs = [34, 80, 120, 166], pts = cols.map((c, ci) => Array.from({ length: c }, (_, j) => [xs[ci], 62 + (j - (c - 1) / 2) * 17]));
    inner = pts.slice(1).map((col, ci) => col.map((b) => pts[ci].map((a) => `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke-width=".6" opacity="${0.25 + (hash(title + a + b) % 5) / 10}"/>`).join('')).join('')).join('')
      + pts.map((col, ci) => col.map((q, j) => `<circle cx="${q[0]}" cy="${q[1]}" r="4.6" ${ci === 3 && j === 1 ? 'class="sig-f"' : 'fill="var(--bg)"'}/>`).join('')).join('');
  } else {
    const n = 8 + (h % 3) * 2;
    inner = `<rect x="58" y="22" width="84" height="${n * 5 + 16}" rx="3"/><circle cx="100" cy="30" r="4" fill="none"/>`
      + Array.from({ length: n }, (_, i) => pin(48, 36 + i * 10, 10, 4) + pin(142, 36 + i * 10, 10, 4)).join('')
      + `<text x="100" y="${22 + (n * 5 + 16) / 2 + 6}" text-anchor="middle" class="art-t">${esc(title.replace(/[^A-Za-z0-9-]/g, '').slice(0, 9).toUpperCase())}</text>`;
  }
  return `<svg class="art" viewBox="0 0 200 124" role="img" aria-label="${esc(title)} illustration" fill="none" stroke="currentColor" stroke-width="1.6">${inner}</svg>`;
}
const projArt = (p) => { const k = p.art || p.slug; return ART[k] ? `<svg class="art" viewBox="0 0 200 124" role="img" aria-label="${esc(p.title)} illustration" fill="none" stroke="currentColor" stroke-width="1.6">${ART[k]()}</svg>` : ''; };
const partVisual = (p) => p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : partArt(p.title, p.kind, p.art);

/* ---------- SpiRobs stage ---------- */
const simStage = (cls = '') => `<figure class="sim ${cls}" data-spirobs>
  <div class="sim-stage"><canvas role="img" aria-label="Animated SpiRobs arm. Its tip follows your pointer."></canvas>
  <div class="sim-hud" aria-hidden="true">
    <p class="sim-title"><span class="dot"></span>SpiRobs <small>35 disks · 3 tendons</small></p>
    <ul class="sim-ten">${[0, 1, 2].map((k) => `<li data-tendon="${k}"><span>T${k}</span><em><i></i></em><b>0.0</b><small>mm</small></li>`).join('')}</ul>
    <p class="sim-tip" data-tip>x 0  z 0 mm</p>
  </div></div>
  <figcaption><span class="fig-n">Live</span> The arm from my MuJoCo model, rebuilt for the browser. Move your pointer: the tip follows it, and the three readouts are the tendon pulls it takes to get there.</figcaption>
</figure>`;

/* ---------- layout ---------- */
const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..800,0..100,0..1;1,9..144,300..800,0..100,0..1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap';

function layout({ title, desc, urlPath, body, bodyClass = '', scripts = [], noindex = false, styles = [], math = false, bg = 'full', ogImage = '' }) {
  const base = site.url ? site.url.replace(/\/$/, '') : '';
  const og = ogImage || '/assets/og.png';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${base ? `<link rel="canonical" href="${esc(base + urlPath)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
${base ? `<meta property="og:image" content="${esc(/^https?:/.test(og) ? og : base + og)}">
<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="#F1F3F2">
<script>try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%230A0D12'/%3E%3Cpath d='M26 74 52 40 76 56' fill='none' stroke='%23FF7A3D' stroke-width='9' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='26' cy='74' r='7' fill='%23FF7A3D'/%3E%3Ccircle cx='76' cy='56' r='7' fill='%23FF7A3D'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
${math ? '<link rel="stylesheet" href="/assets/katex/katex.min.css">' : ''}
${styles.map((s) => `<link rel="stylesheet" href="${s}">`).join('\n')}
</head>
<body class="${bodyClass}" data-bg="${bg}">
${bg !== 'off' ? '<canvas id="bg" aria-hidden="true"></canvas><div class="probe" id="probe" aria-hidden="true"><i></i><span></span></div>' : ''}
<a class="skip" href="#main">Skip to content</a>
${header()}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/site.js" defer></script>
${bg !== 'off' ? '<script src="/assets/bg.js" defer></script>' : ''}
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>`;
}

const ARM_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 19 11 9l8 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="19" r="2.2" fill="currentColor"/><circle cx="19" cy="14" r="2.2" fill="var(--signal)"/></svg>`;
function header() {
  const links = [['/writing/', 'Blog'], ['/projects/', 'Projects'], aiItems.length && ['/ai/', 'AI'], parts.length && ['/electronics/', 'Electronics'], ['/about/', 'About']].filter(Boolean);
  return `<header class="top">
  <div class="wrap bar">
    <a class="mark" href="/">${ARM_ICON}<span>${esc(site.short.toLowerCase())}</span></a>
    <nav aria-label="Primary">
      ${links.map(([h, l]) => `<a href="${h}" data-probe="${esc(l.toLowerCase())}">${l}</a>`).join('\n      ')}
      <button type="button" class="theme" id="theme" aria-label="Switch color theme"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.5a7.5 7.5 0 0 1 0 15z" fill="currentColor"/></svg></button>
    </nav>
  </div>
</header>`;
}
function footer() {
  const built = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `<footer class="foot">
  <div class="wrap foot-row">
    <p class="foot-note">${esc(site.name)} · ${esc(site.location)}<br><span>Hand-built static pages. No trackers. Last built ${built}.</span></p>
    <p class="foot-links">${[['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['x', 'X']].filter(([k]) => (site.links || {})[k]).map(([k, l]) => `<a href="${esc(site.links[k])}" target="_blank" rel="noopener">${l}</a>`).join('')}<a href="/resume/">Resume</a><a href="/feed.xml">RSS</a></p>
  </div>
</footer>`;
}

/* ---------- shared fragments ---------- */
function linkButtons(extra = '') {
  const L = { ...(site.links || {}) }; if (!L.resume) L.resume = '/resume/';
  const defs = [['email', 'Email', (v) => `mailto:${v}`, true], ['github', 'GitHub', (v) => v], ['linkedin', 'LinkedIn', (v) => v], ['x', 'X', (v) => v], ['resume', 'Resume', (v) => v]];
  return defs.filter(([k]) => L[k]).map(([k, label, href, primary]) =>
    `<a class="btn${primary ? ' primary' : ''} ${extra}" href="${esc(href(L[k]))}"${k === 'email' || L[k] === '/resume/' ? '' : ' target="_blank" rel="noopener"'}>${label}</a>`).join('\n');
}
const specList = (specs, cls = 'specs') => specs.length ? `<dl class="${cls}">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
const chips = (tags) => tags.length ? `<ul class="chips">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
const topicLabel = (slug) => (topicOf(slug) || {}).label || slug;
const tocHtml = (toc) => toc.length >= 3 ? `<nav class="toc" aria-label="On this page"><p class="toc-title">On this page</p><ol>${toc.map((t) => `<li class="d${t.depth}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '';

function postRow(p) {
  return `<li data-topic="${esc(p.category)}" data-tags="${esc(p.tags.map((t) => t.toLowerCase()).join('|'))}" data-text="${esc((p.title + ' ' + p.summary + ' ' + p.tags.join(' ')).toLowerCase())}"><a class="post-row" href="/writing/${p.slug}/" data-probe="read">
    <time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>
    <span class="post-main"><span class="post-title">${esc(p.title)}</span><span class="post-sum">${esc(p.summary)}</span></span>
    <span class="post-meta">${p.category ? esc(topicLabel(p.category)) + ' · ' : ''}${p.minutes} min</span>
  </a></li>`;
}

/* ---------- home ---------- */
function renderHome() {
  const feat = projects.filter((p) => p.group === 'featured'), scratch = projects.filter((p) => p.group === 'scratch');
  const lead = posts.find((p) => p.featured) || posts[0], rest = posts.filter((p) => p !== lead).slice(0, 3);
  const links = linkButtons();
  const home = site.home || {};
  const core = parts.filter((p) => p.core);
  const body = `
<section class="wrap hero" aria-label="Introduction">
  <div class="hero-copy">
    <p class="kicker">Hi, I'm</p>
    <h1 class="hero-name">${esc(site.name)}</h1>
    <p class="statement">${em(site.statement)}</p>
    <p class="hero-role"><span><i class="live"></i>Intern at Hoogway.ai</span><span>Joining Dell · June 2027</span><span>${esc(site.location)}</span></p>
    <p class="hero-links"><a class="btn primary" href="/projects/">See what I've built</a><a class="btn" href="/writing/">Read the blog</a></p>
    <div class="btns inline hero-social">${linkButtons()}</div>
  </div>
  <div class="hero-sim">${simStage('in-hero')}</div>
</section>

<nav class="jump wrap" aria-label="On this page"><a href="#about"><b>01</b> About</a><a href="#projects"><b>02</b> Projects</a><a href="#ai"><b>03</b> AI</a><a href="#bench"><b>04</b> Electronics</a><a href="#lately"><b>05</b> Blog</a><a href="#contact"><b>06</b> Contact</a></nav>

<section class="block" id="about"><div class="wrap about-intro">
  <h2 class="block-title"><em class="sec-n">01</em><span>About me</span><small>The short version</small></h2>
  <div class="about-body">
    ${((site.about && site.about.paragraphs) || site.bio).map((x, k) => `<p class="${k ? '' : 'about-lede'}">${esc(x)}</p>`).join('')}
    <dl class="facts">
      <div><dt>Now</dt><dd>AI and software engineering intern, <b>Hoogway.ai</b></dd></div>
      <div><dt>Next</dt><dd>Joining <b>Dell</b>, June 2027</dd></div>
      <div><dt>Studying</dt><dd>${esc(site.education.degree.replace('B.Tech, ', ''))}, UVCE</dd></div>
      <div><dt>Based in</dt><dd>${esc(site.location)}</dd></div>
    </dl>
    ${site.about && site.about.explore ? `<ul class="chips">${site.about.explore.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <p><a href="/about/">The longer story →</a></p>
  </div>
</div></section>

<section class="block" id="projects"><div class="wrap">
  <h2 class="block-title"><em class="sec-n">02</em><span>Things that move</span><small>${esc(home.projectsNote || 'Builds, experiments and half-answers')}</small></h2>
  <div class="proj-feature">
    ${feat.map((p, i) => projectFeature(p, i)).join('')}
  </div>
  ${scratch.length ? `<h3 class="subtitle">Built from scratch, to see how it works</h3>
  <ol class="scratch">${scratch.map((p, i) => `<li><a href="/projects/${esc(p.slug)}/" data-probe="open"><span class="idx">${String(i + 1).padStart(2, '0')}</span><span class="s-title">${esc(p.title)}</span><span class="s-sum">${esc(p.summary[0])}</span><span class="s-dom">${esc(DOMAIN[p.domain] || '')}</span></a></li>`).join('')}</ol>` : ''}
  <p class="more"><a href="/projects/">All projects →</a></p>
</div></section>

${aiItems.length ? `<section class="block" id="ai"><div class="wrap">
  <h2 class="block-title"><em class="sec-n">03</em><span>AI</span><small>${esc(home.aiNote || 'Models I build, train and ship')}</small></h2>
  <ul class="bench">${aiItems.slice(0, 4).map((p, i) => `<li class="b${i % 4}"><a href="/ai/${esc(p.slug)}/" data-probe="open"><span class="bench-art">${partVisual(p)}</span><span class="bench-name">${esc(p.title)}</span><span class="bench-tag">${esc(p.tagline)}</span></a></li>`).join('')}</ul>
  <p class="more"><a href="/ai/">All the AI work →</a></p>
</div></section>` : ''}

${core.length ? `<section class="block" id="bench"><div class="wrap">
  <h2 class="block-title"><em class="sec-n">04</em><span>On the bench</span><small>${esc(home.benchNote || 'The boards I program')}</small></h2>
  <ul class="bench">${core.map((p, i) => `<li class="b${i % 4}"><a href="/electronics/${esc(p.slug)}/" data-probe="open"><span class="bench-art">${partVisual(p)}</span><span class="bench-name">${esc(p.title)}</span><span class="bench-tag">${esc(p.tagline)}</span></a></li>`).join('')}</ul>
  <p class="more"><a href="/electronics/">Boards, plus the parts around them →</a></p>
</div></section>` : ''}

${lead ? `<section class="block" id="lately"><div class="wrap">
  <h2 class="block-title"><em class="sec-n">05</em><span>Lately</span><small>${esc(home.latelyNote || 'The newest notes')}</small></h2>
  <div class="lately">
    <a class="lead-post${lead.cover ? ' has-cover' : ''}" href="/writing/${lead.slug}/" data-probe="read">
      ${lead.cover ? `<img src="${esc(lead.cover)}" alt="${esc(lead.coverAlt)}" loading="lazy">` : (lead.equation ? `<div class="lead-eq" aria-hidden="true">${kt(lead.equation, true)}</div>` : '')}
      <span class="lead-meta">${lead.category ? esc(topicLabel(lead.category)) + ' · ' : ''}${fmtDate(lead.date)} · ${lead.minutes} min</span>
      <span class="lead-title">${esc(lead.title)}</span>
      <span class="lead-sum">${esc(lead.summary)}</span>
    </a>
    ${rest.length ? `<ul class="post-list compact">${rest.map((p) => postRow(p)).join('')}</ul>` : ''}
  </div>
  <p class="more"><a href="/writing/">Everything I've written →</a></p>
</div></section>` : `<section class="block" id="lately"><div class="wrap">
  <h2 class="block-title"><em class="sec-n">05</em><span>Blog</span><small>${esc(home.latelyNote || 'Notes and write-ups')}</small></h2>
  <p class="empty">Posts are moving over from my older site. <a href="/writing/">Open the blog →</a></p>
</div></section>`}

<section id="contact" class="block contact"><div class="wrap">
  <h2 class="contact-title">${em(home.contactHeadline || 'Say *hello*.')}</h2>
  <p class="contact-copy">${esc(home.contactCopy || 'Internships, projects and odd hardware ideas are all welcome.')}</p>
  ${links ? `<div class="btns">${links}</div>` : ''}
</div></section>`;
  return layout({ title: site.title, desc: site.description, urlPath: '/', body, bodyClass: 'home', math: !!(lead && lead.equation), scripts: ['/assets/spirobs.js'] });
}

function projectFeature(p, i) {
  const rel = parts.filter((e) => e.project === p.slug);
  return `<article class="feat feat-${i % 2 ? 'b' : 'a'} dom-${esc(p.domain || 'hardware')}" id="${esc(p.slug)}">
    <div class="feat-main">
      <div class="feat-ico">${projArt(p)}</div>
      <p class="feat-kind"><span class="dom">${esc(DOMAIN[p.domain] || 'Project')}</span> ${esc(p.kind)}</p>
      <h3><a href="/projects/${esc(p.slug)}/" data-probe="open">${esc(p.title)}</a> <span class="tag">${esc(p.status)}</span></h3>
      ${p.summary.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${rel.length ? `<p class="feat-parts">${rel.map((e) => `<a href="/electronics/${esc(e.slug)}/">${esc(e.title)}</a>`).join('')}</p>` : ''}
    </div>
    ${p.image ? `<img class="feat-img" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : ''}
    ${specList(p.specs)}
  </article>`;
}

/* ---------- writing ---------- */
function renderWritingIndex() {
  const byTopic = {}; posts.forEach((p) => { if (p.category) byTopic[p.category] = (byTopic[p.category] || 0) + 1; });
  const used = TOPICS.filter((t) => byTopic[t.slug]);
  const tags = [...new Set(posts.flatMap((p) => p.tags.map((t) => t.toLowerCase())))];
  const feat = posts.find((p) => p.featured), list = posts.filter((p) => p !== feat);
  const card = (p) => `<li data-topic="${esc(p.category)}" data-tags="${esc(p.tags.map((t) => t.toLowerCase()).join('|'))}" data-text="${esc((p.title + ' ' + p.summary + ' ' + p.tags.join(' ')).toLowerCase())}">
    <a class="wcard${p.cover ? ' has-cover' : ' text-only'}" href="/writing/${p.slug}/" data-probe="read">
      ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.coverAlt)}" loading="lazy">` : (p.equation ? `<span class="wc-eq" aria-hidden="true">${kt(p.equation)}</span>` : `<span class="wc-glyph" aria-hidden="true">${esc((topicOf(p.category) || {}).glyph || '·')}</span>`)}
      <span class="wc-meta">${p.category ? esc(topicLabel(p.category)) + ' · ' : ''}${fmtDate(p.date)}</span>
      <span class="wc-title">${esc(p.title)}</span>
      <span class="wc-sum">${esc(p.summary)}</span>
    </a></li>`;
  const body = `
<section class="wrap page-head">
  <p class="kicker">Notebook</p>
  <h1 class="page-title">Blog</h1>
  <p class="page-sub">Mathematics, robots, models and whatever else I end up poking at.</p>
</section>
<section class="wrap">
  ${feat ? `<a class="wfeature${feat.cover ? ' has-cover' : ''}" href="/writing/${feat.slug}/" data-probe="read">
    ${feat.cover ? `<img src="${esc(feat.cover)}" alt="${esc(feat.coverAlt)}" loading="lazy">` : (feat.equation ? `<span class="wf-eq" aria-hidden="true">${kt(feat.equation, true)}</span>` : '')}
    <span class="wf-body"><span class="wc-meta">Featured · ${feat.category ? esc(topicLabel(feat.category)) + ' · ' : ''}${fmtDate(feat.date)}</span><span class="wf-title">${esc(feat.title)}</span><span class="wc-sum">${esc(feat.summary)}</span></span>
  </a>` : ''}
  ${posts.length >= 3 ? `<div class="filter" id="post-filter" hidden>
    <input type="search" id="post-q" placeholder="Search the notebook" aria-label="Search posts" autocomplete="off">
    ${(used.length || tags.length) ? `<div class="tagbar" id="tagbar" role="group" aria-label="Filter by topic"><button type="button" class="on" data-topic="" data-tag="">All</button>${used.map((t) => `<button type="button" data-topic="${esc(t.slug)}">${esc(t.label)} <small>${byTopic[t.slug]}</small></button>`).join('')}${tags.slice(0, 10).map((t) => `<button type="button" class="tg" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
  </div>` : ''}
  ${list.length ? `<ul class="wgrid" id="wgrid">${list.map(card).join('')}</ul><p class="empty" id="filter-empty" hidden>Nothing matches that. Try fewer words.</p>` : (feat ? '' : '<p class="empty">Posts are moving over from my older site. They will appear here as they land.</p>')}
</section>`;
  return layout({ title: `Blog · ${site.name}`, desc: 'Posts on mathematics, robotics, embedded systems and AI.', urlPath: '/writing/', body, bodyClass: 'page-writing', bg: 'dim', math: posts.some((p) => p.equation) });
}

function renderPost(p, prev, next) {
  const rel = posts.filter((q) => q !== p && ((p.category && q.category === p.category) || q.tags.some((t) => p.tags.includes(t)))).slice(0, 3);
  const proj = p.project && projectBy(p.project);
  const meta = `<p class="meta"><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time> · ${p.minutes} min read${p.updated ? ` · updated ${fmtDate(p.updated)}` : ''}${p.draft ? ' · <strong>Draft</strong>' : ''}</p>`;
  const head = p.layout === 'photo' && p.cover
    ? `<header class="ph full"><img src="${esc(p.cover)}" alt="${esc(p.coverAlt)}"><div class="ph-over">${p.category ? `<a class="kicker" href="/writing/">${esc(topicLabel(p.category))}</a>` : ''}<h1>${esc(p.title)}</h1><p class="dek">${esc(p.summary)}</p>${meta}</div></header>`
    : p.layout === 'math' && p.equation
      ? `<header class="mh wide">${p.category ? `<p class="kicker">${esc(topicLabel(p.category))}</p>` : ''}<div class="mh-eq" aria-hidden="true">${kt(p.equation, true)}</div><h1>${esc(p.title)}</h1><p class="dek">${esc(p.summary)}</p>${meta}${chips(p.tags)}</header>`
      : `<header class="dh">${p.category ? `<p class="kicker"><a href="/writing/">${esc(topicLabel(p.category))}</a></p>` : ''}<h1>${esc(p.title)}</h1><p class="dek">${esc(p.summary)}</p>${meta}${chips(p.tags)}</header>`;
  const cover = p.cover && p.layout === 'default' ? `<figure class="fig wide dcover"><img src="${esc(p.cover)}" alt="${esc(p.coverAlt)}"></figure>` : '';
  const body = `
<article class="article layout-${p.layout}">
  <div class="art-grid">
    <p class="crumb"><a href="/writing/">← Blog</a></p>
    ${head}
    ${cover}
    ${p.toc.length >= 3 ? `<aside class="toc-col">${tocHtml(p.toc)}</aside><details class="toc-mobile"><summary>On this page</summary>${tocHtml(p.toc)}</details>` : ''}
    <div class="prose">${p.html}</div>
    <footer class="art-foot">
      ${proj ? `<p class="related-proj">Part of <a href="/projects/${esc(proj.slug)}/">${esc(proj.title)}</a></p>` : ''}
      ${rel.length ? `<div class="related"><h2>Keep reading</h2><ul class="post-list compact">${rel.map((q) => postRow(q)).join('')}</ul></div>` : ''}
      <nav class="pager" aria-label="More posts">
        ${prev ? `<a href="/writing/${prev.slug}/"><span>Newer</span>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="r" href="/writing/${next.slug}/"><span>Older</span>${esc(next.title)}</a>` : '<span></span>'}
      </nav>
    </footer>
  </div>
</article>`;
  return layout({
    title: `${p.title} · ${site.name}`, desc: p.summary, urlPath: `/writing/${p.slug}/`, body, bodyClass: 'is-post', bg: 'dim',
    math: p.hasMath || !!p.equation, scripts: p.html.includes('class="mermaid"') ? ['/assets/embeds.js', '/assets/mermaid-init.js'] : ['/assets/embeds.js'], ogImage: p.cover || '',
  });
}

/* ---------- projects ---------- */
function renderProjectsIndex() {
  const domains = Object.keys(DOMAIN).filter((d) => projects.some((p) => (p.domain || 'hardware') === d));
  const body = `
<section class="wrap page-head">
  <p class="kicker">Builds and experiments</p>
  <h1 class="page-title">Projects</h1>
  <p class="page-sub">Hardware, software and models. Some are finished, some are still on the desk.</p>
</section>
<section class="wrap">
  ${domains.map((d) => `<div class="pdom dom-${d}"><h2 class="pdom-title">${DOMAIN[d]}</h2>
    <ul class="plist">${projects.filter((p) => (p.domain || 'hardware') === d).map((p) => `<li><a href="/projects/${esc(p.slug)}/" data-probe="open">
      <span class="pl-ico">${projArt(p)}</span><span class="pl-title">${esc(p.title)}</span><span class="pl-kind">${esc(p.kind)}</span><span class="pl-sum">${esc(p.summary[0])}</span><span class="tag">${esc(p.status)}</span>
    </a></li>`).join('')}</ul></div>`).join('')}
</section>`;
  return layout({ title: `Projects · ${site.name}`, desc: 'Hardware, software and AI projects.', urlPath: '/projects/', body, bodyClass: 'page-projects', bg: 'dim' });
}

function renderProject(p, doc, prev, next) {
  const links = (p.links || []).map((l) => `<a class="btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
  const rel = posts.filter((q) => q.project === p.slug || q.tags.some((t) => (p.tags || []).includes(t))).slice(0, 4);
  const used = parts.filter((e) => e.project === p.slug);
  const dom = p.domain || 'hardware';
  const body = `
<article class="article project dom-${esc(dom)}">
  <div class="art-grid">
    <p class="crumb"><a href="/projects/">← Projects</a></p>
    <header class="proj-head wide">
      <div>
        <div class="ph-ico">${projArt(p)}</div>
        <p class="kicker">${esc(DOMAIN[dom] || 'Project')} · ${esc(p.kind)}</p>
        <h1>${esc(p.title)} <span class="tag">${esc(p.status)}</span></h1>
        <p class="dek">${esc((doc && doc.data.summary) || p.summary[0])}</p>
        ${links ? `<div class="btns inline">${links}</div>` : ''}
      </div>
      ${specList(p.specs)}
    </header>
    ${p.slug === 'spirobs' ? `<div class="wide">${simStage('in-project')}</div>` : ''}
    ${p.image ? `<figure class="fig wide"><img src="${esc(p.image)}" alt="${esc(p.title)}"></figure>` : ''}
    ${doc && doc.toc.length >= 3 ? `<aside class="toc-col">${tocHtml(doc.toc)}</aside>` : ''}
    <div class="prose">
      ${doc && doc.hasBody ? doc.html : p.summary.slice(1).map((t) => `<p>${esc(t)}</p>`).join('') + `<aside class="callout callout-note"><strong>Full write-up coming</strong><p>Photos, video and build notes for this project will go here.</p></aside><!-- To add the write-up: create content/projects/${esc(p.slug)}.md (start from _TEMPLATE.md) -->`}
    </div>
    <footer class="art-foot">
      ${used.length ? `<div class="related"><h2>Parts on the bench</h2><ul class="mini-parts">${used.map((e) => `<li><a href="/electronics/${esc(e.slug)}/"><span class="mp-art">${partVisual(e)}</span><span>${esc(e.title)}<small>${esc(e.tagline)}</small></span></a></li>`).join('')}</ul></div>` : ''}
      ${rel.length ? `<div class="related"><h2>Related writing</h2><ul class="post-list compact">${rel.map((q) => postRow(q)).join('')}</ul></div>` : ''}
      <nav class="pager" aria-label="More projects">
        ${prev ? `<a href="/projects/${prev.slug}/"><span>Previous</span>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="r" href="/projects/${next.slug}/"><span>Next</span>${esc(next.title)}</a>` : '<span></span>'}
      </nav>
    </footer>
  </div>
</article>`;
  return layout({ title: `${p.title} · ${site.name}`, desc: (doc && doc.data.summary) || p.summary[0], urlPath: `/projects/${p.slug}/`, body, bodyClass: 'is-post', bg: 'dim', math: !!(doc && doc.hasMath), scripts: p.slug === 'spirobs' ? ['/assets/embeds.js', '/assets/spirobs.js'] : ['/assets/embeds.js'], ogImage: p.image || '' });
}

/* ---------- electronics ---------- */
const STATUS = { programmed: 'I program this', bench: 'On the bench', used: 'Used in a build', shelf: 'On the shelf', wishlist: 'Wishlist', built: 'Built from scratch', training: 'Training', shipped: 'In production', studying: 'Studying' };
const COLL = {
  electronics: { base: '/electronics/', label: 'Electronics', kicker: 'The bench', sub: 'The boards I write code for, and the parts that sit around them. A growing notebook, not a shop.', h1: 'Boards I program', h2: 'Around the boards', h2sub: 'Displays, drivers and power: the supporting cast.', note: "The specs above come from the manufacturer's datasheet. My own notes, wiring diagrams and photos will go here.", desc: 'The boards I program, and the parts around them.' },
  ai: { base: '/ai/', label: 'AI', kicker: 'The model shelf', sub: 'Models I have built, trained or put into production, and the ideas under them. Written for people who like seeing how it works.', h1: 'Things I run and train', h2: 'Rebuilt from scratch', h2sub: 'Reimplemented without a framework, to see how it works.', note: 'Short summary for now. The longer write-up, with code and plots, is on its way.', desc: 'Models, training runs and ML systems I have built.' },
};
const reposBlock = (tags) => { const r = (site.repos || []).filter((x) => !tags || tags.includes(x.tag)); return r.length ? `<h2 class="parts-h second">Code on GitHub</h2><p class="parts-sub">The repositories behind all of this. <a href="${esc((site.links || {}).github || '#')}" target="_blank" rel="noopener">All of GitHub ↗</a></p>
  <ul class="repos">${r.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener" data-probe="open"><span class="repo-top"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span class="repo-name">${esc(x.name)}</span><span class="tag">${esc(x.tag)}</span></span><span class="repo-desc">${esc(x.desc || 'Notebooks and code')}</span>${x.lang ? `<span class="repo-lang">${esc(x.lang)}</span>` : ''}</a></li>`).join('')}</ul>` : ''; };
function renderCollectionIndex(key, parts) {
  const C = COLL[key];
  const core = parts.filter((p) => p.core), rest = parts.filter((p) => !p.core);
  const card = (p) => `<li><a class="part${p.core ? ' core' : ''}" href="${C.base}${esc(p.slug)}/" data-probe="open">
    <span class="part-art">${partVisual(p)}</span>
    <span class="part-body"><span class="part-top"><span class="part-name">${esc(p.title)}</span><span class="tag">${esc(STATUS[p.status] || p.status)}</span></span>
    <span class="part-tag">${esc(p.tagline)}</span>
    ${p.specs.length ? `<span class="part-specs">${p.specs.slice(0, 3).map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</span>` : ''}
    </span></a></li>`;
  const body = `
<section class="wrap page-head">
  <p class="kicker">${C.kicker}</p>
  <h1 class="page-title">${C.label}</h1>
  <p class="page-sub">${C.sub}</p>
</section>
<section class="wrap">
  ${core.length ? `<h2 class="parts-h">${C.h1}</h2><ul class="parts core-parts">${core.map(card).join('')}</ul>` : ''}
  ${rest.length ? `<h2 class="parts-h second">${C.h2}</h2><p class="parts-sub">${C.h2sub}</p><ul class="parts">${rest.map(card).join('')}</ul>` : ''}
  ${key === 'ai' ? reposBlock(['AI', 'Robotics']) : key === 'electronics' ? reposBlock(['Hardware', 'Robotics']) : ''}
</section>`;
  return layout({ title: `${C.label} · ${site.name}`, desc: C.desc, urlPath: C.base, body, bodyClass: 'page-parts', bg: 'dim' });
}

function renderPart(key, p, prev, next) {
  const C = COLL[key];
  const proj = p.project && projectBy(p.project);
  const rel = posts.filter((q) => (proj && q.project === proj.slug) || q.tags.some((t) => t.toLowerCase() === p.slug)).slice(0, 3);
  const body = `
<article class="article part-page">
  <div class="art-grid">
    <p class="crumb"><a href="${C.base}">← ${C.label}</a></p>
    <header class="part-head wide">
      <div class="ph-art">${partVisual(p)}</div>
      <div>
        <p class="kicker">${esc(p.kind)} · ${esc(STATUS[p.status] || p.status)}</p>
        <h1>${esc(p.title)}</h1>
        <p class="dek">${esc(p.tagline)}</p>
        ${p.links && p.links.length ? `<div class="btns inline">${p.links.map(([l, h], i) => `<a class="btn${i ? '' : ' primary'}" href="${esc(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${esc(l)}${/^https?:/.test(h) ? ' ↗' : ''}</a>`).join('')}</div>` : ''}
        ${proj ? `<p class="used-in">Project page: <a href="/projects/${esc(proj.slug)}/">${esc(proj.title)}</a></p>` : ''}
      </div>
      ${specList(p.specs, 'specs datasheet')}
    </header>
    <div class="prose">${p.hasBody ? p.html : '<aside class="callout callout-note"><strong>Notes to come</strong><p>' + esc(C.note) + '</p></aside>'}</div>
    <footer class="art-foot">
      ${rel.length ? `<div class="related"><h2>Related writing</h2><ul class="post-list compact">${rel.map((q) => postRow(q)).join('')}</ul></div>` : ''}
      <nav class="pager" aria-label="More parts">
        ${prev ? `<a href="${C.base}${prev.slug}/"><span>Previous</span>${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="r" href="${C.base}${next.slug}/"><span>Next</span>${esc(next.title)}</a>` : '<span></span>'}
      </nav>
    </footer>
  </div>
</article>`;
  return layout({ title: `${p.title} · ${site.name}`, desc: p.tagline, urlPath: `${C.base}${p.slug}/`, body, bodyClass: 'is-post', bg: 'dim', math: p.hasMath, scripts: ['/assets/embeds.js'], ogImage: p.image || '' });
}

/* ---------- about ---------- */
function renderAbout() {
  const a = site.about || {};
  const e = site.education;
  const body = `
<section class="wrap page-head">
  <p class="kicker">About</p>
  <h1 class="page-title">${em(a.title || "Hello, I'm *" + site.short + '*')}</h1>
</section>
<section class="wrap about-grid">
  <div class="about-text">
    ${(a.paragraphs || site.bio).map((t) => `<p>${esc(t)}</p>`).join('')}
    ${a.approach && a.approach.length ? `<h2>How I like to build</h2><ul class="plain">${a.approach.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <h2>Say hello</h2>
    <p>${esc((site.home && site.home.contactCopy) || 'Internships, projects and odd hardware ideas are all welcome.')}</p>
    <div class="btns inline">${linkButtons()}</div>
  </div>
  <aside class="about-side">
    ${a.explore && a.explore.length ? `<h2>Currently curious about</h2><ul class="chips big">${a.explore.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <h2>Studying</h2><p>${esc(e.degree)}<br>${esc(e.school)}, ${esc(e.place)}<br><span class="dim">${esc(e.note)}</span></p>
    <h2>Elsewhere</h2><p><a href="/resume/">Printable resume</a><br><a href="/feed.xml">RSS feed</a></p>
  </aside>
</section>`;
  return layout({ title: `About · ${site.name}`, desc: `About ${site.name}.`, urlPath: '/about/', body, bodyClass: 'page-about', bg: 'dim' });
}

/* ---------- resume ---------- */
function renderResume() {
  const L = site.links || {};
  const contact = [site.location, L.email, L.github && L.github.replace(/^https?:\/\//, ''), L.linkedin && L.linkedin.replace(/^https?:\/\//, '')].filter(Boolean);
  const e = site.education;
  const body = `
<article class="wrap resume">
  <div class="resume-actions"><button type="button" class="btn" data-print>Print or save as PDF</button></div>
  <header class="resume-head"><h1>${esc(site.name)}</h1><p class="resume-line">${esc(site.statement.replace(/\*/g, ''))}</p><p class="meta">${contact.map(esc).join(' · ')}</p></header>
  <section><h2>Experience</h2>${site.work.map((w) => `<div class="r-item"><div class="r-row"><h3>${esc(w.role)}, ${esc(w.company)}</h3><span class="meta">${esc(w.period)}</span></div><p>${esc(w.intro)}</p><ul>${w.items.map((it) => `<li><strong>${esc(it.title)}.</strong> ${esc(it.text[0])}</li>`).join('')}</ul></div>`).join('')}</section>
  <section><h2>Projects</h2>${projects.map((p) => `<div class="r-item"><div class="r-row"><h3>${esc(p.title)}</h3><span class="meta">${esc(p.kind)}</span></div><p>${esc(p.summary[0])}</p></div>`).join('')}</section>
  <section><h2>Skills</h2><dl class="r-skills">${site.skills.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
  <section><h2>Education</h2><div class="r-item"><div class="r-row"><h3>${esc(e.school)}</h3><span class="meta">${esc(e.note)}</span></div><p>${esc(e.degree)}, ${esc(e.place)}</p></div></section>
</article>`;
  return layout({ title: `Resume · ${site.name}`, desc: `Resume of ${site.name}.`, urlPath: '/resume/', body, bodyClass: 'is-resume', bg: 'off' });
}

/* ---------- studio pages ---------- */
const ghFields = () => read('src/_gh-fields.html');
function renderStudio() {
  return layout({
    title: `Studio · ${site.name}`, desc: 'Write and export Markdown posts.', urlPath: '/studio/',
    body: read('src/studio.html').replace('<!--GH_FIELDS-->', ghFields()), bodyClass: 'is-studio', noindex: true, bg: 'off', math: true,
    scripts: ['/assets/marked.umd.js', '/assets/katex/katex.min.js', '/assets/highlight.js', '/assets/md.js', '/assets/embeds.js', '/assets/gh.js', '/assets/studio.js'], styles: ['/assets/studio.css'],
  });
}
function renderSiteEditor() {
  return layout({
    title: `Site editor · ${site.name}`, desc: 'Edit site content.', urlPath: '/studio/site/',
    body: read('src/site-editor.html').replace('<!--GH_FIELDS-->', ghFields()), bodyClass: 'is-studio', noindex: true, bg: 'off',
    scripts: ['/assets/gh.js', '/assets/site-editor.js'], styles: ['/assets/studio.css'],
  });
}

/* ---------- feed ---------- */
function renderFeed() {
  const base = (site.url || 'https://example.com').replace(/\/$/, '');
  const items = posts.slice(0, 20).map((p) => `
  <item><title>${esc(p.title)}</title><link>${base}/writing/${p.slug}/</link><guid>${base}/writing/${p.slug}/</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.summary)}</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(site.name)}</title><link>${base}/</link><description>${esc(site.description)}</description>${items}\n</channel></rss>`;
}

/* ---------- run ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

write('index.html', renderHome());
write('writing/index.html', renderWritingIndex());
posts.forEach((p, i) => write(`writing/${p.slug}/index.html`, renderPost(p, posts[i - 1], posts[i + 1])));
write('projects/index.html', renderProjectsIndex());
projects.forEach((p, i) => write(`projects/${p.slug}/index.html`, renderProject(p, docs[p.slug], projects[i - 1], projects[i + 1])));
if (parts.length) {
  write('electronics/index.html', renderCollectionIndex('electronics', parts));
  parts.forEach((p, i) => write(`electronics/${p.slug}/index.html`, renderPart('electronics', p, parts[i - 1], parts[i + 1])));
}
if (aiItems.length) {
  write('ai/index.html', renderCollectionIndex('ai', aiItems));
  aiItems.forEach((p, i) => write(`ai/${p.slug}/index.html`, renderPart('ai', p, aiItems[i - 1], aiItems[i + 1])));
}
write('about/index.html', renderAbout());
write('resume/index.html', renderResume());
write('studio/index.html', renderStudio());
write('studio/site/index.html', renderSiteEditor());
write('studio/site/site.json', JSON.stringify(site));
write('feed.xml', renderFeed());
{
  const base = (site.url || '').replace(/\/$/, '');
  if (base) {
    const urls = ['/', ...(hasPosts ? ['/writing/'] : []), '/projects/', '/about/', '/resume/', ...(parts.length ? ['/electronics/'] : []), ...(aiItems.length ? ['/ai/'] : []), ...aiItems.map((p) => `/ai/${p.slug}/`), ...posts.map((p) => `/writing/${p.slug}/`), ...projects.map((p) => `/projects/${p.slug}/`), ...parts.map((p) => `/electronics/${p.slug}/`)];
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  }
  write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /studio/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`);
}
write('404.html', layout({
  title: `Not found · ${site.name}`, desc: 'Page not found.', urlPath: '/404.html', noindex: true,
  body: `<section class="wrap page-head"><p class="kicker">Error 404</p><h1 class="page-title">Off the graph.</h1><p class="page-sub">That page doesn't exist at these coordinates. <a href="/">Back to the origin</a>.</p></section>`,
}));

copyDir(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'content/media'), path.join(OUT, 'media'));
if (fs.existsSync(path.join(ROOT, 'src/_headers'))) fs.copyFileSync(path.join(ROOT, 'src/_headers'), path.join(OUT, '_headers'));

// third-party assets from node_modules: marked (studio preview) and KaTeX (css, woff2 fonts, js for the studio)
function pkgDir(name) { try { return path.dirname(require.resolve(`${name}/package.json`)); } catch { return path.resolve(path.dirname(require.resolve(name)), '..'); } }
try {
  fs.copyFileSync(path.join(path.dirname(require.resolve('marked')), 'marked.umd.js'), path.join(OUT, 'assets/marked.umd.js'));
} catch { console.warn('! Could not copy marked.umd.js (studio preview will not render).'); }
try {
  const kd = path.join(pkgDir('katex'), 'dist');
  fs.mkdirSync(path.join(OUT, 'assets/katex/fonts'), { recursive: true });
  let css = fs.readFileSync(path.join(kd, 'katex.min.css'), 'utf8');
  css = css.replace(/,url\([^)]*\) format\("woff"\)/g, '').replace(/,url\([^)]*\) format\("truetype"\)/g, ''); // modern browsers only need woff2
  fs.writeFileSync(path.join(OUT, 'assets/katex/katex.min.css'), css);
  fs.copyFileSync(path.join(kd, 'katex.min.js'), path.join(OUT, 'assets/katex/katex.min.js'));
  for (const f of fs.readdirSync(path.join(kd, 'fonts')).filter((f) => f.endsWith('.woff2'))) fs.copyFileSync(path.join(kd, 'fonts', f), path.join(OUT, 'assets/katex/fonts', f));
} catch (e) { console.warn('! Could not copy KaTeX assets (math will render unstyled):', e.message); }

const L = site.links || {};
if (!L.email && !L.github && !L.linkedin) console.warn('! No contact links set in content/site.json');
console.log(`Built ${posts.length} post(s), ${projects.length} project(s), ${parts.length} part(s) -> dist/`);
