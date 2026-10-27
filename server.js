// Tiny zero-dependency server: serves the Strudel rig and pushes
// pattern-file edits to the browser (Server-Sent Events) for hot-swapping.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 4321;
const ROOT = path.dirname(fileURLToPath(import.meta.url)); // handles spaces / non-ASCII in the path
const PATTERNS = path.join(ROOT, 'patterns');
const clients = new Set();
const lastWrite = new Map(); // files saved from the browser — don't echo them back

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

fs.watch(PATTERNS, (_evt, file) => {
  if (!file?.endsWith('.js')) return;
  const p = path.join(PATTERNS, file);
  if (!fs.existsSync(p)) return;
  const code = fs.readFileSync(p, 'utf8');
  const recent = lastWrite.get(file);
  if (recent && recent.code === code && Date.now() - recent.at < 2000) return;
  lastWrite.delete(file);
  const msg = `data: ${JSON.stringify({ file, code })}\n\n`;
  for (const res of clients) res.write(msg);
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': hi\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (url.pathname === '/save' && req.method === 'POST') {
    // only our own page may write files: other websites can't send JSON cross-origin without
    // a preflight we never answer, and the Origin must be this server
    const origin = req.headers.origin;
    if (!/^application\/json/.test(req.headers['content-type'] || '') || (origin && new URL(origin).host !== req.headers.host)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 1_000_000) req.destroy(); // 1 MB is plenty for a pattern
    });
    req.on('end', () => {
      try {
        const { file, code, overwrite } = JSON.parse(body);
        if (typeof code !== 'string') throw new Error('nothing to save');
        // keep names simple and inside patterns/
        let name = String(file || '').trim().toLowerCase().replace(/\.js$/, '').replace(/[^a-z0-9-_ ]/g, '').replace(/\s+/g, '-');
        if (!name) throw new Error('please give the file a name');
        name += '.js';
        const target = path.join(PATTERNS, name);
        if (!overwrite && fs.existsSync(target)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `${name} already exists`, file: name }));
        }
        fs.writeFileSync(target, code);
        lastWrite.set(name, { code, at: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ file: name }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  if (url.pathname === '/patterns') {
    const files = fs.readdirSync(PATTERNS).filter((f) => f.endsWith('.js')).sort();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(files));
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(ROOT, rel);
  // stay inside the repo, and never serve dotfiles (.git, .context, …) or node_modules
  const hidden = rel.split(/[\\/]/).some((seg) => seg.startsWith('.') || seg === 'node_modules');
  if (!file.startsWith(ROOT + path.sep) || hidden || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

function listen(port) {
  server.once('error', (err) => {
    if (err.code !== 'EADDRINUSE') throw err;
    console.log(`  port ${port} is busy, trying ${port + 1}...`);
    listen(port + 1);
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`\n  acid rig ready → http://localhost:${port}\n  edit patterns/*.js and save to hot-swap\n`));
}
listen(Number(PORT));
