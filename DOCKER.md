# Docker

Single container running backend (4000) + frontend (3000).

## Build

```bash
docker build -t hoify .
```

### Build arg

| Arg | Default | Description |
|---|---|---|
| `DOCKER_EXPO_PUBLIC_API_URL` | `http://localhost:4000/graphql` | Frontend GraphQL endpoint (set at build time, inlined by Metro) |

Override when frontend talks to external backend:

```bash
docker build \
  --build-arg DOCKER_EXPO_PUBLIC_API_URL=https://api.example.com/graphql \
  -t hoify .
```

## Run

```bash
docker run -p 4000:4000 -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/hoify \
  -e JWT_SECRET=change-me \
  -e REDIS_URL=redis://host:6379/0 \
  hoify
```

## Runtime env vars

### Required

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `REDIS_URL` | Redis connection string |

### Optional — application

| Var | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend listen port |
| `FRONTEND_PORT` | `3000` | Frontend static server port |
| `MUSIC_LIBRARY_PATH` | `./music` | Music file directory |
| `ALBUM_ART_PATH` | `./album-art` | Album art directory |
| `BEETS_INGEST_PATH` | — | Beets ingest drop zone |
| `ENRICHMENT_CONCURRENCY` | `5` | Metadata enrichment workers |
| `LOG_LEVEL` | `info` | Pino log level (`trace`/`debug`/`info`/`warn`/`error`/`silent`) |

### Optional — slskd (Soulseek)

| Var | Default | Description |
|---|---|---|
| `SLSKD_ENABLED` | `false` | Enable Soulseek integration |
| `SLSKD_URL` | `http://localhost:5030` | slskd HTTP endpoint |
| `SLSKD_API_KEY` | — | slskd API key |
| `SLSKD_DOWNLOAD_DIR` | `./ingest` | Download directory |

### Optional — music fingerprinting

| Var | Description |
|---|---|
| `ACOUSTID_API_KEY` | AcoustID API key (https://acoustid.org/register) |
| `MUSICBRAINZ_USER_AGENT` | MusicBrainz API user agent |

## Run with .env file

```bash
docker run -p 4000:4000 -p 3000:3000 --env-file .env hoify
```

## Ports

| Port | Service |
|---|---|
| `4000` | Backend (GraphQL API + streaming) |
| `3000` | Frontend (static web) |

## Notes

- Backend runs via `tsx` (ts-node replacement), not pre-compiled JS.
- Frontend is pre-built static files served by embedded Node HTTP server. No nginx required.
- Container runs as non-root `hoify` user.
- GraphQL endpoint at `/graphql`, stream at `/stream/:trackId`, album art at `/art/:filename`.
