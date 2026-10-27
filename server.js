// Tiny zero-dependency server: serves the Strudel rig and pushes
// pattern-file edits to the browser (Server-Sent Events) for hot-swapping.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 4321;
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PATTERNS = path.join(ROOT, 'patterns');
const clients = new Set();
const lastWrite = new Map(); // files saved from the browser — don't echo them back

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

fs.watch(PATTERNS, (_evt, file) => {
  if (!file?.endsWith('.js')) return;
  const p = path.join(PATTERNS, file);
  if (!fs.existsSync(p)) return;
  const code = fs.readFileSync(p, 'utf8');
  if (lastWrite.get(file) === code) return;
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
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { file, code, overwrite } = JSON.parse(body);
        // keep names simple and inside patterns/
        let name = String(file || '').trim().toLowerCase().replace(/\.js$/, '').replace(/[^a-z0-9-_ ]/g, '').replace(/\s+/g, '-');
        if (!name) throw new Error('please give the file a name');
        name += '.js';
        const target = path.join(PATTERNS, name);
        if (!overwrite && fs.existsSync(target)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `${name} already exists`, file: name }));
        }
        lastWrite.set(name, code);
        fs.writeFileSync(target, code);
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
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
  server.listen(port, () =>
    console.log(`\n  acid rig ready → http://localhost:${port}\n  edit patterns/*.js and save to hot-swap\n`));
}
listen(Number(PORT));
