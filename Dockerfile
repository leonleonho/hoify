# Stage 1: Install backend deps + copy source
FROM node:22-alpine AS build-backend

WORKDIR /build/backend
COPY hoify-server/package*.json ./
RUN npm ci
COPY hoify-server/ ./

# Stage 2: Build frontend (Expo web)
FROM node:22-alpine AS build-frontend

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./

RUN npm run build:web

# Stage 3: Runtime
FROM node:22-alpine

RUN apk add --no-cache beets chromaprint ffmpeg py3-packaging su-exec

# Backend (run via tsx — avoids pre-existing TS strict-mode type errors)
COPY --from=build-backend /build/backend/src                   /app/backend/src
COPY --from=build-backend /build/backend/node_modules           /app/backend/node_modules
COPY --from=build-backend /build/backend/package.json           /app/backend/
COPY --from=build-backend /build/backend/drizzle.config.ts      /app/backend/
COPY --from=build-backend /build/backend/src/db/migrations      /app/backend/src/db/migrations

# Frontend (pre-built static files + serve script)
COPY --from=build-frontend /build/frontend/dist       /app/frontend/dist
COPY --from=build-frontend /build/frontend/serve.mjs  /app/frontend/serve.mjs

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4000 3000

ENV PORT=4000 \
    FRONTEND_PORT=3000

ENTRYPOINT ["docker-entrypoint.sh"]
