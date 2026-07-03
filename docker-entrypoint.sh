#!/bin/sh
set -e

# Fix ownership of bind-mounted dirs to match container user
chown -R node:node /music /album-art /ingest /beets-data /app/backend 2>/dev/null || true

echo "Running database migrations..."
su-exec node sh -c "cd /app/backend && npx drizzle-kit migrate" & wait $!

echo "Starting hoify backend..."
su-exec node sh -c "cd /app/backend && npx tsx src/index.ts" &

sleep 1

echo "Starting hoify frontend on port ${FRONTEND_PORT:-3000}..."
cd /app/frontend/dist
exec su-exec node node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

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

// Proxy /graphql, /stream/*, /art/* to backend
const isApiPath = (url) =>
  url.startsWith('/graphql') || url.startsWith('/stream/') || url.startsWith('/art/');

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

  // Serve static files
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for unknown routes
      fs.readFile(path.join(__dirname, 'index.html'), (err2, index) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('Frontend ready on :' + PORT));
" &

wait
