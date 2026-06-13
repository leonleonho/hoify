# hoify-server

> A GraphQL-powered music streaming server built with TypeScript, Express, and Apollo.

## Tech Stack

| Layer            | Technology                                         |
| ---------------- | -------------------------------------------------- |
| Runtime          | [Node.js] &middot; [TypeScript]                    |
| Framework        | [Express]                                          |
| GraphQL          | [Apollo Server]                                    |
| Build / Dev      | [tsx] (watch mode), [tsc] (production build)       |
| Linting          | [ESLint] + [typescript-eslint]                     |
| Database         | [PostgreSQL] 16 (via Docker Compose)               |

[Node.js]: https://nodejs.org/
[TypeScript]: https://www.typescriptlang.org/
[Express]: https://expressjs.com/
[Apollo Server]: https://www.apollographql.com/docs/apollo-server/
[tsx]: https://tsx.is/
[tsc]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[ESLint]: https://eslint.org/
[typescript-eslint]: https://typescript-eslint.io/
[PostgreSQL]: https://www.postgresql.org/

---

## Getting Started

### Prerequisites

- **Node.js** — version managed via [nvm] (see `.nvmrc`)
- **Docker Desktop** or **Docker Compose** (for PostgreSQL)

```bash
# Use the correct Node version
nvm use
```

[nvm]: https://github.com/nvm-sh/nvm

### Setup

```bash
# 1. Install dependencies (installs root + hoify-server deps, sets up git hooks)
npm install

# 2. Copy the environment file (edit if needed)
cp .env.example .env

# 3. Start PostgreSQL (ensure Docker is running)
docker compose up -d

# 4. Start the dev server (hot-reload)
npm run dev
```

The server starts at **http://localhost:4000**.

### Linting

```bash
npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix fixable issues
```

> **ESLint must pass with zero errors before any code is merged.** Warnings are acceptable during active development but should be resolved before opening a pull request.
>
> A pre-commit hook (via [Husky](https://typicode.github.io/husky/)) automatically runs `npm run lint` on every `git commit`. Commits with lint errors are rejected.

---

## Scripts

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start dev server with hot-reload via `tsx`     |
| `npm run build`   | Compile TypeScript and copy `.graphql` files   |
| `npm start`       | Run the production build from `dist/`          |
| `npm test`        | Run unit tests                                 |
| `npm run lint`    | Check code for lint errors (**must pass**)     |
| `npm run lint:fix`| Auto-fix lint errors where possible            |

> **All code changes must pass `npm run lint` before merging.**

---

## Logging

Logging is handled by [Pino](https://getpino.io/).

| Environment | Default Level | Output | Override                    |
| ----------- | ------------- | ------ | --------------------------- |
| Development | `debug`       | Pretty-print (colorized) via `pino-pretty` | `LOG_LEVEL=trace\|debug\|info\|warn\|error\|silent` |
| Production  | `warn`        | JSON on stdout              | `LOG_LEVEL=trace\|debug\|info\|warn\|error\|silent` |

> In production, only `warn` and `error` messages are shown by default. Set `LOG_LEVEL=info` to include startup and request logs.

The logger is configured in [`src/util/logger.ts`](src/util/logger.ts).

---

## API

### GraphQL

All GraphQL requests go to **`POST /graphql`**.

```graphql
# Example
query {
  hello
}
```

Response:

```json
{ "data": { "hello": "Hello, world!" } }
```

The landing page (`GET /`) redirects to `/graphql` where you can use the Apollo Sandbox to explore the schema and run queries.

### Audio Streaming

**`GET /stream/:trackId`**

Streams audio files from the local `./music` directory.

- Supports `Range` headers for seeking (essential for media players)
- Returns the correct MIME type based on the file extension
- Supported formats: `mp3`, `flac`, `wav`, `ogg`, `aac`, `m4a`, `wma`

```bash
# Example — play an MP3 file named "01-track.mp3" in ./music
curl http://localhost:4000/stream/01-track.mp3
```

> **Note:** The music directory doesn't exist yet. Create `./music` and add audio files to start streaming.

---

## Project Structure

```
hoify-server/
├── src/
│   ├── index.ts                     # App entry point (Express + Apollo)
│   ├── routes/
│   │   └── stream.ts                # Audio streaming endpoint
│   └── graphql/
│       ├── schema.ts                # Combines all module schemas & resolvers
│       ├── loadTypeDefs.ts          # Helper to load .graphql files
│       └── helloworld/              # Example resolver module
│           ├── index.ts
│           ├── resolvers.ts
│           └── typeDefs.graphql
├── dist/                            # Compiled output (gitignored)
├── node_modules/                    # Dependencies (gitignored)
├── .env                             # Local env vars (gitignored)
├── .env.example                     # Env var template
├── docker-compose.yml               # PostgreSQL service
├── package.json
└── tsconfig.json
```

New GraphQL modules follow the `helloworld` pattern:
1. Create a folder under `src/graphql/<module-name>/`
2. Add a `typeDefs.graphql` schema file
3. Add a `resolvers.ts` file
4. Wire them into `src/graphql/schema.ts`

---

## Docker

The Docker Compose file sets up PostgreSQL 16 (Alpine) as a development dependency.

| Variable           | Default       | Description              |
| ------------------ | ------------- | ------------------------ |
| `POSTGRES_USER`    | `hoify`       | Database user            |
| `POSTGRES_PASSWORD`| `hoify_dev`   | Database password        |
| `POSTGRES_DB`      | `hoify`       | Database name            |
| `POSTGRES_PORT`    | `5432`        | Mapped host port         |

```bash
# Start PostgreSQL in the background
docker compose up -d

# View logs
docker compose logs -f

# Stop and remove the container
docker compose down

# Wipe the database volume
docker compose down -v
```

The connection string is configured in `.env`:

```
DATABASE_URL=postgresql://hoify:hoify_dev@localhost:5432/hoify
```

---

## Roadmap

- [ ] Add a database driver (`pg`, Prisma, or Drizzle)
- [ ] Implement music metadata models (tracks, albums, artists)
- [ ] User authentication
- [ ] Playlist management