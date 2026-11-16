import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = fileURLToPath(new URL('./game/', import.meta.url));
const root = resolve(gameRoot);
const port = Number(process.env.PORT || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
};
createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const filename = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    const info = statSync(filename);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': types[extname(filename)] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).on('error', error => {
  console.error(`Cannot start local server: ${error.message}`);
  process.exitCode = 1;
}).listen(port, '127.0.0.1', () => console.log(`NEON COURIER ready: http://localhost:${port}`));
