#!/bin/sh
set -e

# Fix ownership of bind-mounted dirs to match container user
chown -R node:node /music /album-art /ingest /app/backend 2>/dev/null || true

# Wait for Postgres to accept connections
echo "Waiting for postgres..."
for i in $(seq 1 30); do
  pg_isready -h postgres -U hoify -d hoify -q 2>/dev/null && break
  sleep 1
done

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

http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
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
