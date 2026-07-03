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
su-exec node node /app/frontend/serve.mjs &

wait
