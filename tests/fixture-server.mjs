// ==================== ERROR-STATE FIXTURE SERVER START ====================
// This serves temporary responses only: products.json is NEVER modified.
// node tests/fixture-server.mjs empty --port=3001
// node tests/fixture-server.mjs broken-json --port=3002
// node tests/fixture-server.mjs missing-image --port=3003
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'empty';
const defaultPorts = { empty: 3001, 'broken-json': 3002, 'missing-image': 3003 };
const portFlag = process.argv.find(argument => argument.startsWith('--port='));
const port = Number(portFlag?.split('=')[1] || process.env.PORT || defaultPorts[mode]);
if (!Object.hasOwn(defaultPorts, mode) || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: node tests/fixture-server.mjs <empty|broken-json|missing-image> [--port=3001]');
  process.exit(1);
}
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const publicFolders = new Set(['css', 'js', 'data', 'images']);
const server = http.createServer(async (request, response) => {
  const send = (status, body, contentType = 'text/plain; charset=utf-8') => {
    response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  try {
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed');
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const segments = relative.split(/[\\/]/);
    const allowed = segments.length === 1 ? relative.endsWith('.html') : publicFolders.has(segments[0]);
    if (!allowed || segments.some(segment => segment.startsWith('.'))) return send(404, 'Not found');
    if (relative === 'data/products.json') {
      if (mode === 'empty') return send(200, '[]', mimeTypes['.json']);
      if (mode === 'broken-json') return send(500, JSON.stringify({ error: 'Intentional fixture: catalogue unavailable.' }), mimeTypes['.json']);
      const products = JSON.parse(await readFile(path.join(root, 'data/products.json'), 'utf8'));
      const product = products.find(entry => entry.id === 'tshirt1');
      if (product) {
        const originalImage = product.image;
        product.image = 'images/not-found.jpeg';
        product.images = ['images/not-found.jpeg', originalImage];
      }
      return send(200, JSON.stringify(products), mimeTypes['.json']);
    }
    if (mode === 'missing-image' && relative === 'images/not-found.jpeg') return send(404, 'Intentional fixture: missing product image.');
    const filename = path.resolve(root, relative);
    const relativeToRoot = path.relative(root, filename);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot) || !(await stat(filename)).isFile()) return send(404, 'Not found');
    return send(200, await readFile(filename), mimeTypes[path.extname(filename)] || 'application/octet-stream');
  } catch { return send(404, 'Fixture page not found'); }
});
server.on('error', error => { console.error(`Fixture server failed: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`FORME ${mode} fixture: http://localhost:${port} (real product data is unchanged)`));
// ==================== ERROR-STATE FIXTURE SERVER END ====================
