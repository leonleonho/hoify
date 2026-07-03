#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const isApiPath = (url) =>
  url.startsWith('/graphql') || url.startsWith('/stream/') || url.startsWith('/art/');

// Build runtime config object from EXPO_PUBLIC_* env vars
const pubVars = Object.keys(process.env).filter((k) => k.startsWith('EXPO_PUBLIC_'));
const runtimeConfig =
  pubVars.length > 0
    ? `<script>window.__HOIFY_CONFIG__=${JSON.stringify(Object.fromEntries(pubVars.map((k) => [k, process.env[k]])))}</script>`
    : '';

const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('index.html not found at', indexPath);
  process.exit(1);
}

http.createServer((req, res) => {
  if (isApiPath(req.url)) {
    const opts = new URL(BACKEND + req.url);
    const proxy = http.request(
      {
        hostname: opts.hostname,
        port: opts.port,
        path: opts.pathname + opts.search,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    req.pipe(proxy);
    return;
  }

  let filePath = req.url === '/' ? indexPath : path.join(DIST, req.url.split('?')[0]);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(indexPath, (err2, index) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        // Inject runtime config into SPA fallback too
        res.end(runtimeConfig ? index.toString().replace('</head>', `${runtimeConfig}</head>`) : index);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    // Inject runtime config into index.html on-the-fly
    if (filePath === indexPath && runtimeConfig) {
      res.end(data.toString().replace('</head>', `${runtimeConfig}</head>`));
    } else {
      res.end(data);
    }
  });
}).listen(PORT, () => {
  console.log('Frontend ready on :' + PORT);
  if (runtimeConfig) console.log(`Injected ${pubVars.length} runtime config var(s)`);
});
