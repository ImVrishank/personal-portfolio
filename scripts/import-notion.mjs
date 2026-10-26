#!/usr/bin/env node
// Import a Notion "Markdown & CSV" export into content/posts and content/media.
//
//   node scripts/import-notion.mjs <unzipped-export-folder> [options]
//
// Options
//   --dry            Print what would happen, write nothing
//   --draft          Mark every imported post as draft: true
//   --only <regex>   Only import pages whose title matches the regex (case-insensitive)
//   --skip <regex>   Skip pages whose title matches the regex
//
// Handles: hashed filenames, "# Title" + property lines (Created, Tags, Status, ...),
// URL-encoded image paths, links between exported pages, <aside> callouts, odd code-fence languages.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const src = args.find((a, i) => !a.startsWith('--') && (i === 0 || !['--only', '--skip'].includes(args[i - 1])));
if (!src || !fs.existsSync(src)) {
  console.error('Usage: node scripts/import-notion.mjs <unzipped-export-folder> [--dry] [--draft] [--only regex] [--skip regex]');
  process.exit(1);
}
const DRY = flag('--dry'), FORCE_DRAFT = flag('--draft');
const only = opt('--only') && new RegExp(opt('--only'), 'i');
const skip = opt('--skip') && new RegExp(opt('--skip'), 'i');
const POSTS = path.resolve('content/posts'), MEDIA = path.resolve('content/media');

/* ---------- helpers ---------- */
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
const HASH = /\s[0-9a-f]{32}(?=\.|$|\/)/gi;
const stripHash = (s) => s.replace(HASH, '');
const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const LANG = { 'c++': 'cpp', 'c#': 'csharp', 'plain text': 'text', 'shell': 'bash', 'sh': 'bash', 'javascript': 'js', 'typescript': 'ts' };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

/* ---------- discover pages ---------- */
const all = walk(path.resolve(src));
const mdFiles = all.filter((f) => f.toLowerCase().endsWith('.md'));
if (!mdFiles.length) { console.error('No .md files found. Unzip the Notion export first (it may contain a second zip inside).'); process.exit(1); }

const pages = mdFiles.map((file) => {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const h1 = raw.match(/^#\s+(.+?)\s*\r?\n/);
  const title = (h1 ? h1[1] : stripHash(path.basename(file, '.md'))).trim();
  return { file, raw, title, key: path.basename(file) };
}).filter((p) => (!only || only.test(p.title)) && (!skip || !skip.test(p.title)));

// unique slugs
const used = new Set();
fs.existsSync(POSTS) && fs.readdirSync(POSTS).forEach((f) => used.add(f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')));
pages.forEach((p) => {
  let s = slugify(p.title), n = 2; const base = s;
  while (used.has(s)) s = `${base}-${n++}`;
  used.add(s); p.slug = s;
});
// lookup for link rewriting: by decoded basename and by decoded path tail
const bySource = new Map();
pages.forEach((p) => {
  bySource.set(safeDecode(path.basename(p.file)), p);
  bySource.set(stripHash(safeDecode(path.basename(p.file))), p);
});

/* ---------- convert ---------- */
const report = [];
const mediaCopies = [];

function convert(p) {
  let body = p.raw;
  const notes = [];

  // title line
  body = body.replace(/^#\s+.+\r?\n/, '');

  // property block: Key: Value lines right after the title
  const props = {};
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  const start = i;
  while (i < lines.length) {
    const m = lines[i].match(/^([A-Za-z][A-Za-z0-9 _-]{0,40}):\s*(.*)$/);
    if (!m || /^https?$/i.test(m[1])) break;
    props[m[1].trim().toLowerCase()] = m[2].trim(); i++;
  }
  if (Object.keys(props).length) body = lines.slice(i).join('\n'); else body = lines.slice(start).join('\n');
  body = body.replace(/^\s*\n/, '');

  // front matter fields
  const dateStr = props['published'] || props['date'] || props['created'] || props['created time'] || props['last edited time'];
  let date = null;
  if (dateStr) { const d = new Date(dateStr.replace(/@/, '')); if (!isNaN(d)) date = ymd(d); else notes.push(`could not parse date "${dateStr}"`); }
  if (!date) { date = ymd(fs.statSync(p.file).mtime); notes.push('no date property, used file modified date'); }
  const tags = (props['tags'] || props['category'] || props['categories'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const summary = props['summary'] || props['description'] || props['excerpt'] || '';
  const status = props['status'] || '';
  const draft = FORCE_DRAFT || /draft|idea|not started|in progress|todo|backlog/i.test(status);
  const slug = props['slug'] ? slugify(props['slug']) : p.slug;
  if (props['slug']) p.slug = slug;
  const known = new Set(['published', 'date', 'created', 'created time', 'last edited time', 'tags', 'category', 'categories', 'summary', 'description', 'excerpt', 'status', 'slug']);
  const dropped = Object.keys(props).filter((k) => !known.has(k));
  if (dropped.length) notes.push(`dropped properties: ${dropped.join(', ')}`);

  // callouts: <aside> ... </aside> -> blockquote
  body = body.replace(/<aside>\s*([\s\S]*?)\s*<\/aside>/g, (_, inner) => inner.split('\n').map((l) => '> ' + l).join('\n'));

  // code fence languages
  body = body.replace(/^```([^\n`]*)$/gm, (m, lang) => {
    const l = lang.trim().toLowerCase();
    return l ? '```' + (LANG[l] || l.split(/\s+/)[0]) : m;
  });

  // images and links
  const dir = path.dirname(p.file);
  body = body.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, bang, text, href) => {
    if (/^(https?:|mailto:|#|data:)/i.test(href)) return full;
    const decoded = safeDecode(href);
    if (bang) {
      const abs = path.resolve(dir, decoded);
      if (!fs.existsSync(abs)) { notes.push(`missing image: ${decoded}`); return full; }
      const name = slugify(path.basename(abs, path.extname(abs))) + path.extname(abs).toLowerCase();
      const rel = `${p.slug}/${name}`;
      mediaCopies.push({ from: abs, to: path.join(MEDIA, p.slug, name) });
      return `![${text}](/media/${rel})`;
    }
    const target = bySource.get(path.basename(decoded)) || bySource.get(stripHash(path.basename(decoded)));
    if (target) return `[${text}](/writing/${target.slug}/)`;
    if (/\.md$/i.test(decoded)) { notes.push(`link to page that was not imported: ${text}`); return text; }
    return full;
  });

  // front matter
  const fm = ['---', `title: ${q(p.title)}`, `date: ${date}`];
  if (summary) fm.push(`summary: ${q(summary)}`);
  if (tags.length) fm.push(`tags: [${tags.join(', ')}]`);
  fm.push(`slug: ${slug}`);
  if (draft) fm.push('draft: true');
  fm.push('---', '');
  const text = fm.join('\n') + body.trim() + '\n';
  return { text, date, slug, draft, notes, words: (body.match(/\S+/g) || []).length };
}

for (const p of pages) {
  const r = convert(p);
  const out = path.join(POSTS, `${r.date}-${r.slug}.md`);
  report.push({ title: p.title, out: path.relative(process.cwd(), out), ...r });
  if (!DRY) { fs.mkdirSync(POSTS, { recursive: true }); fs.writeFileSync(out, r.text); }
}
if (!DRY) for (const m of mediaCopies) { fs.mkdirSync(path.dirname(m.to), { recursive: true }); fs.copyFileSync(m.from, m.to); }

/* ---------- report ---------- */
console.log(`\n${DRY ? '[dry run] ' : ''}${report.length} page(s), ${mediaCopies.length} image(s)\n`);
for (const r of report) {
  console.log(`- ${r.title}\n    -> ${r.out}  (${r.words} words${r.draft ? ', draft' : ''})`);
  r.notes.forEach((n) => console.log(`    ! ${n}`));
}
console.log('\nNext: review the files in content/posts/, then run `npm run dev`.');
