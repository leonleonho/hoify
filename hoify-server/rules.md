# Project rules

## Comment discipline
- Do NOT insert comments that explain what the code already expresses. No `// increment counter`, `// loop through items`, `// import X`.
- Docstrings on exported functions/types are fine when they clarify non-obvious contract, behavior, or side effects. Keep them short.
- Group-related code with section comments only when the grouping isn't already obvious from the structure (e.g. `// -------------------------------------------------------------------------` dividers around helpers vs resolvers).

## Architecture
- Monorepo? In the future. Just `hoify-server/` — a single Apollo Server v4 + Express + TypeScript app. We'll have a react native app for the front end in the future but for now it's just hoify-server.
- GraphQL modules live in `src/graphql/<feature>/`. Each has `typeDefs.graphql`, `resolvers.ts`, `index.ts` (barrel export). Wire them together in `src/graphql/schema.ts`.
- **Resolvers are thin** — they validate inputs, call services, format outputs for GraphQL. No business logic or direct DB queries in resolvers.
- **Service layer** — each feature has a `services.ts` that contains all business logic and data fetching. Resolvers delegate to services. Services are plain async functions, not classes.
- Drizzle ORM + PostgreSQL via `postgres.js`. DB schema in `src/db/schema.ts`.
- Context is built by `resolveAuthContext()` in `src/util/auth.ts`. Import it, don't inline.
- `src/` uses `.js` extensions in imports (ESM convention) even though source is `.ts`.

## Auth model
- JWT-based. Token comes from `Authorization: Bearer <token>` header (preferred) or `token` cookie (fallback).
- The `authPlugin` in `src/graphql/auth/plugin.ts` guards all Query/Mutation fields via `willResolveField`. It checks `PUBLIC_OPERATIONS` — add new public ops there, not to individual resolvers.
- `requireAuth()` in `src/graphql/auth/requireAuth.ts` throws `UNAUTHENTICATED`. Used by the plugin.
- Login sets an `httpOnly` cookie on the response. `me` query returns the authenticated user.

## Naming
- Tables: plural (`users`). Columns: snake_case in the DB, camelCase via Drizzle column aliases where appropriate.
- GraphQL types: PascalCase. Fields: camelCase. Input types: `CreateXInput`, `UpdateXInput`.
- Files: kebab-case (`typeDefs.graphql`, `resolvers.ts`).
- Exports: named exports, not defaults. Barrel files index.ts re-export `typeDefs` and `resolvers`.

## Testing
- E2E tests live in `src/__tests__/e2e/`. Each test file gets its own isolated Postgres container via Docker.
- Use `setupE2e()` from `src/__tests__/helpers/setup-e2e.ts` in `beforeAll` — it spins up a Postgres container (random port), runs all Drizzle migrations, creates the Express+Apollo app, and returns a supertest `agent` + `cleanup` function.
- Tear down with `fixture.cleanup()` in `afterAll` to stop the container.
- GraphQL queries/mutations are defined as exported constants in `src/__tests__/helpers/graphql.ts`. Use `executeGraphQL(agent, { query, variables, token })` for all operations.
- Every new query or mutation **must** have a corresponding test. Follow the pattern in `users.test.ts` and `music.test.ts`.
- Docker must be installed and running locally for e2e tests. The helpers check for `docker info` at startup.