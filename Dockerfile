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

ARG DOCKER_EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
ENV EXPO_PUBLIC_API_URL=$DOCKER_EXPO_PUBLIC_API_URL

RUN npm run build:web

# Stage 3: Runtime
FROM node:22-alpine

RUN addgroup -S hoify && adduser -S hoify -G hoify

# Backend (run via tsx — avoids pre-existing TS strict-mode type errors)
COPY --from=build-backend --chown=hoify:hoify /build/backend/src                   /app/backend/src
COPY --from=build-backend --chown=hoify:hoify /build/backend/node_modules           /app/backend/node_modules
COPY --from=build-backend --chown=hoify:hoify /build/backend/package.json           /app/backend/
COPY --from=build-backend --chown=hoify:hoify /build/backend/drizzle.config.ts      /app/backend/
COPY --from=build-backend --chown=hoify:hoify /build/backend/src/db/migrations      /app/backend/src/db/migrations

# Frontend (pre-built static files)
COPY --from=build-frontend --chown=hoify:hoify /build/frontend/dist  /app/frontend/dist

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER hoify

EXPOSE 4000 3000

ENV PORT=4000 \
    FRONTEND_PORT=3000

ENTRYPOINT ["docker-entrypoint.sh"]
