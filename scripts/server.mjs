// ==================== LOCAL STATIC SERVER START ====================
// Run npm start. Only this project's public storefront files are served.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const publicFolders = new Set(['css', 'js', 'data', 'images']);

http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      return response.end('Method not allowed');
    }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const segments = relative.split(/[\\/]/);
    const allowed = segments.length === 1 ? relative.endsWith('.html') : publicFolders.has(segments[0]);
    if (!allowed || segments.some(part => part.startsWith('.') || part === '..')) {
      response.writeHead(404); return response.end('Not found');
    }
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(path.resolve(root) + path.sep) || !(await stat(filename)).isFile()) {
      response.writeHead(404); return response.end('Not found');
    }
    const content = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('This page could not be found. Return to http://localhost:' + port);
  }
}).listen(port, '127.0.0.1', () => console.log(`FORME is ready at http://localhost:${port}`));
// ==================== LOCAL STATIC SERVER END ====================
