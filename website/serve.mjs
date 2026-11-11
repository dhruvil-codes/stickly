import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.vtt': 'text/vtt', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/stickly/')) { res.writeHead(404).end(); return; }
    let file = resolve(root, decodeURIComponent(url.pathname.slice('/stickly/'.length)));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const bytes = await readFile(file);
    const headers = { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = Math.min(bytes.length - 1, range[2] ? Number(range[2]) : bytes.length - 1);
      if (start > end || start >= bytes.length) { res.writeHead(416).end(); return; }
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${bytes.length}`, 'content-length': end - start + 1 });
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
    } else {
      res.writeHead(200, { ...headers, 'content-length': bytes.length });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    }
  } catch { res.writeHead(404).end(); }
});
server.listen(Number(process.env.STICKLY_SITE_PORT || 4317), '127.0.0.1', () => console.log(`Stickly website QA: http://127.0.0.1:${server.address().port}/stickly/`));
