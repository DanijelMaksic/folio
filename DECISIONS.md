# Documented Sprints

Agile methodology was utilized in building the Folio app. This file keeps track on my progress and decisions made during each sprint.

---

## Sprint 0 — Walking Skeleton

**Goal:** Scaffolded the project, ensuring the communication between the front and back end works as intended. Zero features, just wiring up essential components of the app.

**Completed:**

- Monorepo wired up via npm workspaces (`/client`, `/server`, `shared`)
- Docker Compose runs Postgres DB locally on port 5432
- Node.js + Express server with a `/api/health` route that queries `SELECT 1` against Postgres
- React client fetches the health endpoint and renders the resutl in the browser
- Vitest unit test confirms the health route returns `{ status: "ok" }`
- Playwright e2e test confirms the browser sees "API status: ok"
- Set up the CI pipeline via GutHub Actions

**Decisions:**

- Opted for Monorepo instead of Polyrepo, so I don't have to manage client and server separately
- Ditched Turborepo in favor of `concurently` utility, as the project contains only three packages
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

**Goal:** Set up bare authentication and authorization via Better Auth. Only essential features were implemented, such as registration, email verification and login.

**Completed:**

- Better Auth generates basic Drizzle schema, onto which I added username and globalRole additional fields
- Converted the project to ESM, as Better Auth doesn't support CommonJS module system
- Built registration and login forms, HTML handles basic validation
- Form submission is handled with formData API
- On registration, user data is sent to the DB, but with emailVerified set to false. User can't log in until email is verified.
- Upon user data being stored in DB, Resend sends verification email, which when confirmed tells Better Autg to set emailVerified field to true. Now user can log in.
- On the Front-End, React Router's `ProtectedRoute` prevents rendering the UI (`/` route) for the logged-out users. On the Back-End, the actual route protection is enforced by Better Auth and tRPC's `protectedProcedure`
- Enabled CORS, because `locahhost:5173` works with `localhost:3000`, enabling communication between two origins
- Vitest tests the

**Decisions:**

- Chose Better Auth over manual auth setup and JWT, since Better Auth handles boilerplate hashing algorithms, tokens and email verification (via Resend)
- Gave up on REST in favor of tRPC, because this app is a monorepo full stack project based on TypeScript, a perfect candidate for tRPC, as tRPC ensures end-to-end type safety and synchronization over the whole stack
- For this sprint there are no E2E tests, just Vitest integration tests related to registration and login, because email verification is currently restricted to just one email (Resend requires real domain, until then I'm restricted to just one email for testing)

**Issues resolved:**

- Docker volume retains the initial password — changing `POSTGRES_PASSWORD` in `.env` and `docker-compose.yml` has no effect without `docker-compose down -v` to wipe and reinitialize the volume. Made me wonder why I got DB related errors when running the app, even though I changed the password everywhere.
- CORS blocked BetterAuth requests — fixed by adding cors middleware with `credentials: true` before the BetterAuth handler
- Email verification redirected to `localhost:3000` (Express) instead of `localhost:5173` (Vite) — fixed by passing `callbackURL: VITE_CLIENT_URL` from the client at signup time, not from server config
- After email verification, user was redirected to `/login` instead of `/` — fixed with `autoSignInAfterVerification: true`

**Known issues carried forward:**

- Resend free tier with `onboarding@resend.dev` can only deliver to the Resend account owner's email — real domain verification deferred to Sprint 9
- Email verification flow untested for non-owner emails as a result
- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint
- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later.
- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later.
