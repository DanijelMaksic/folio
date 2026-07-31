# Documented Sprints

Agile methodology was utilized in building the Folio app. This file keeps track on my progress and decisions made during each sprint.

---

## Sprint 0 — Walking Skeleton

**Goal:** Scaffold the project, ensuring the communication between the front and back end works as intended. Zero features, just wiring up essential components of the app.

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

- Vitest couldn't load `.env`because its cwd is the monorepo root, not`/server`. Fixed by calling `dotenv.config({ path })`explicitly in`vitest.setup.ts`with an absolute path to`server/.env`
- Playwright config threw `Cannot find name `process``— fixed by installing`@types/node`at the root and adding`node` to the types array in the root tsconfig.
- Playwright test failed because the server wasn't running together with the test — fixed by inserting `webServer` block in the playwright config file

- **Known issues carried forward:**
- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later
- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

## Sprint 1 — Registration and Login

**Goal:**A real user can create an account and log in through the browser.

**Completed:**

- Better Auth generates basic Drizzle schema, onto which I added username and globalRole additional fields
- Converted the project to ESM, as Better Auth doesn't support CommonJS module system
- Built registration and login forms, HTML and Better Auth handle basic validation (will add Zod validation for tRPC procedures later)
- Form submission is handled with formData API
- On registration, user data is sent to the DB, but with emailVerified set to false. User can't log in until email is verified
- Upon user data being stored in DB, Resend sends verification email, which when confirmed tells Better Autg to set emailVerified field to true. Now user can log in.
- First admin is bootstrapped via a one-time seed script.
- Integrated Better Auth's Two Factor plugin for `editor` and `admin` roles via `twoFactorEnabled: true`
- On the Front-End, React Router's `ProtectedRoute` prevents rendering the UI (`/` route) for the logged-out users. On the Back-End, the actual route protection is enforced by Better Auth and tRPC's `protectedProcedure`
- Enabled CORS, because `locahhost:5173` works with `localhost:3000`, enabling communication between two origins.
- Vitest tests the registration, login, session and 2FA flows.
- `globalSetup.ts`starts and tears down the Express server around the Vitest test suite, allowing integration tests to hit real HTTP endpoints without a separately running server process.

**Decisions:**

- Chose Better Auth over manual auth setup and JWT, since Better Auth handles boilerplate hashing algorithms, tokens and email verification (via Resend)
- Gave up on REST in favor of tRPC, because this app is a monorepo full stack project based on TypeScript, a perfect candidate for tRPC, as tRPC ensures end-to-end type safety and synchronization over the whole stack
- For this sprint there are no E2E tests, just Vitest integration tests related to registration and login, because email verification is currently restricted to just one email (Resend requires real domain, until then I'm restricted to just one email for testing)
- Chose to split tRPC init (`trpc.ts`) from route assembly (`router.ts`) to avoid circular dependency between the admin router and the main router

**Issues resolved:**

- Docker volume retains the initial password — changing `POSTGRES_PASSWORD` in `.env` and `docker-compose.yml` has no effect without `docker-compose down -v` to wipe and reinitialize the volume. Made me wonder why I got DB related errors when running the app, even though I changed the password everywhere.
- CORS blocked BetterAuth requests — fixed by adding cors middleware with `credentials: true` before the BetterAuth handler
- Email verification redirected to `localhost:3000` (Express) instead of `localhost:5173` (Vite) — fixed by passing `callbackURL: VITE_CLIENT_URL` from the client at signup time, not from server config
- After email verification, user was redirected to `/login` instead of `/` — fixed with `autoSignInAfterVerification: true`

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 9.
- Email verification flow untested for non-owner emails as a result
- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint
- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later
- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later
- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

## Sprint 2 — Document Upload

**Goal:**A logged-in contributor can uplaod a document and anyone can view it.

**Completed:**

- Added `documents` table to schema.
- Only authenticated users that have `contributor` globalRole or above can access the `documents/upload` page (there is also another role-check in the back-end)
- Added tRPC `documents.ts` route
- Set up tRPC mutation: POST request, validates with zod, checks globalRole, accepts file, stores in Cloudinary cloud storage, saves metadata to DB
- Added two tRPC queries: `list` for getting all documents and `getById` for fetching a single document
- On front-end I made Document list page on `documents` and upload form on `documents/upload` page (wired to the upload mutation). After the document is uploaded it will be displayed on `/documents`. Finally, document details can be inspected on `/documents/:id` page
- Vitest tests the upload mutation server-side
- Playwright tests the full E2E upload flow: log in → upload → see it in list → click through to detail

**Decisions:**

- Chose Cloudinary over Cloudflare R2 for cloud storage because Cloudflare's dashboard looks archaic
- Added shadcn for component styling, starting with auth and document pages
- `list` and `getById` procedures use `publicProcedure` since anyone can view documents per the sprint goal; only `upload` requires authentication and a contributor+ role check

**Issues resolved:**

- tRPC wasn't forwarding session cookies — fixed by adding `credentials: 'include'` to the fetch call in the tRPC client config `drizzle-kit migrate` silently did nothing in every attempt — root cause was missing `import 'dotenv/config'` in `drizzle.config.ts`. Switched to a programmatic migration script (`src/scripts/migrate.ts`) using Drizzle's `migrate()` function directly, which is more reliable than the CLI
- DB columns were a mix of camelCase and snake_case due to migrations running before `casing: 'snake_case'` was added to both the Drizzle config and `drizzle.config.ts` — resolved by wiping the DB and regenerating a single clean migration from the current schema
- Playwright `page.goto()` was aborting on the login page — fixed by inlining the login steps directly in the test rather than abstracting them into a helper function

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 9.
- Email verification flow untested for non-owner emails as a result
- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint
- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later
- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later
- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered
- The Playwrright `loginPage` helper function causes test failures when used — login steps are currently inlined in the test as a workaround; needs investigation
