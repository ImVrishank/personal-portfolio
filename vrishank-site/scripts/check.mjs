#!/usr/bin/env node
// Post-build checks on ./dist: broken internal links/assets, missing anchors, alt text, headings, meta.
//   npm run check      (builds first, then checks; exits 1 if there are errors)
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
if (!fs.existsSync(DIST)) { console.error('No dist/. Run `npm run build` first.'); process.exit(1); }

const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; };
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const errors = [], warnings = [];
const rel = (f) => '/' + path.relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');

const resolve = (urlPath) => {
  let p = path.join(DIST, decodeURIComponent(urlPath));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p) && !path.extname(p)) p = path.join(p, 'index.html');
  return fs.existsSync(p) ? p : null;
};
const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) { const h = fs.readFileSync(file, 'utf8'); ids.set(file, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); }
  return ids.get(file);
};

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const where = rel(file);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, ''); // ignore code samples

  // links and assets
  for (const m of body.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|blob:|\/\/)/.test(url)) continue;
    const [pathPart, hash] = url.split('#');
    const target = pathPart ? resolve(pathPart.startsWith('/') ? pathPart : path.posix.join(where, pathPart)) : file;
    if (!target) { errors.push(`${where}  broken link/asset: ${url}`); continue; }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) errors.push(`${where}  missing anchor: ${url}`);
  }
  // images
  for (const m of body.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) errors.push(`${where}  <img> without alt: ${m[0].slice(0, 80)}`);
  // headings and meta
  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && !/404/.test(where)) errors.push(`${where}  expected 1 <h1>, found ${h1}`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${where}  missing <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) warnings.push(`${where}  missing meta description`);
  if (!/<html lang="/.test(html)) errors.push(`${where}  missing html lang`);
  // heading order
  let last = 0;
  for (const m of body.matchAll(/<h([1-6])[\s>]/g)) { const n = +m[1]; if (last && n > last + 1) { warnings.push(`${where}  heading jumps h${last} -> h${n}`); break; } last = n; }
}

// content-level warnings
try {
  const site = JSON.parse(fs.readFileSync('content/site.json', 'utf8'));
  const L = site.links || {};
  ['email', 'github', 'linkedin'].forEach((k) => !L[k] && warnings.push(`content/site.json  links.${k} is empty`));
  if (!site.url) warnings.push('content/site.json  "url" is empty (needed for sitemap, canonical and share image)');
} catch {}

console.log(`Checked ${pages.length} page(s).`);
warnings.forEach((w) => console.log('  warn  ' + w));
errors.forEach((e) => console.log('  ERROR ' + e));
console.log(errors.length ? `\n${errors.length} error(s).` : '\nNo errors.');
process.exit(errors.length ? 1 : 0);
