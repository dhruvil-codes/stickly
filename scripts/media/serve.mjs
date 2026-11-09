import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.mp4': 'video/mp4' };
export async function startServer(port = 4178) {
 const routes = [['/launch/', resolve(root, 'scripts/media')], ['/shots/', resolve(root, 'docs/images')], ['/brand/', resolve(root, 'public')], ['/fonts/', resolve(root, 'src/assets/fonts')]];
 const server = createServer(async (req, res) => {
  try {
   const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
   const route = routes.find(([prefix]) => pathname.startsWith(prefix));
   const base = route?.[1] ?? resolve(root, 'dist');
   const relative = route ? pathname.slice(route[0].length) : pathname === '/' ? 'index.html' : pathname.slice(1);
   const file = resolve(base, relative);
   if (!file.startsWith(base + sep)) { res.writeHead(403).end(); return; }
   const bytes = await readFile(file);
   res.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
   res.end(bytes);
  } catch { res.writeHead(404).end(); }
 });
 await new Promise((ok, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', ok); });
 return { url: `http://127.0.0.1:${port}`, close: () => new Promise(ok => server.close(ok)) };
}
