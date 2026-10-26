// Dev server: builds, serves ./dist on http://localhost:3000 and rebuilds on changes. Includes drafts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PORT = process.env.PORT || 3000;
const DIST = path.resolve('dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };

const build = () => spawnSync(process.execPath, ['build.mjs'], { stdio: 'inherit', env: { ...process.env, INCLUDE_DRAFTS: '1' } });
build();

let timer;
for (const dir of ['content', 'src', 'build.mjs']) {
  if (!fs.existsSync(dir)) continue;
  fs.watch(dir, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 150); });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': MIME['.html'] }).end(fs.readFileSync(path.join(DIST, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Dev server: http://localhost:${PORT}  (drafts included, rebuilds on save)`));
