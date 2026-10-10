import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const host = '127.0.0.1';
const port = 4173;

const mimeTypeByExt = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8']
]);

const safeJoin = (base, targetPath) => {
  const target = path.resolve(base, targetPath);
  if (!target.startsWith(base)) {
    return '';
  }
  return target;
};

const toFilePath = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const cleaned = decoded.replace(/\/{2,}/g, '/');
  const normalized = cleaned === '/' ? '/index.html' : cleaned;
  return normalized.replace(/^\/+/, '');
};

const send404 = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
};

const send500 = (res) => {
  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Internal Server Error');
};

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const relativePath = toFilePath(requestUrl.pathname);
    const absolutePath = safeJoin(rootDir, relativePath);
    if (!absolutePath) {
      send404(res);
      return;
    }
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      send404(res);
      return;
    }
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = mimeTypeByExt.get(ext) || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(absolutePath).pipe(res);
  } catch {
    send500(res);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`e2e server started: http://${host}:${port}\n`);
});
