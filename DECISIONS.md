# Documented Sprints

Agile methodology was utilized in building the Folio app. This file keeps track on my progress and decisions made during each sprint.

---

## Sprint 0 — Walking Skeleton

**Goal:** Scaffolded the project, ensuring the communication between the front and back end working as intended. Zero features, just wiring up essential components of the app.

**Completed:**

- Monorepo wired up via npm workspaces (`/client`, `/server`, `shared`)
- Docker Compose runs Postgres DB locally on port 5432
- Node.js + Express server with a `/api/health` route that queries `SELECT 1` against Postgres
- React client fetches the health endpoint and renders the resutl in the browser
- Vitest unit test confirms the health route returns `{ status: "ok" }`
- Playwright e2e test confirms the browser sees "API status: ok"
- Set up the CI pipeline with GutHub Actions

**Decisions:**

- Opted for Monorepo instead of Polyrepo, so I don't have to manage client and server separately
- Dithced Turborepo in favor of `concurently` utility, as the project contains only three packages
- Decided to use Docker for Postgres, instead of installing it locally, in order to use this chance to familiarize myself with containerization (later, I will also use Docker for Redis)
- Chose Drizzle over Prisma, as I am more familiar with Drizzle syntax thanks to my experience with Supabase DB querying
- The whole app will use Typescript to ensure strict type safety, assisted with the `/shared` folder, which will host the types needed in both `/client` and `/server`

**Issues resolved:**

- Vitest couldn't load `.env`because its cwd is the monorepo root, not`/server`. Fixed by calling `dotenv.config({ path })`explicitly in`vitest.setup.ts`with an absolute path to`server/.env`.
- Playwright config threw `Cannot find name `process``— fixed by installing`@types/node`at the root and adding`node` to the types array in the root tsconfig.
- Playwright test failed because the server wasn't running together with the test — fixed by inserting `webServer` block in the playwright config file

- **Known issues carried forward:**
- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later.
- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later.

## Sprint 1 — Registration and Login

**Completed:**

**Decisions:**

**Issues resolved:**

**Known issues carried forward:**
