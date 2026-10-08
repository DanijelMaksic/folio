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

- Playwright config threw `Cannot find name 'process'` — fixed by installing `@types/node`at the root and adding `node` to the types array in the root tsconfig

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

- `global-setup.ts`starts and tears down the Express server around the Vitest test suite, allowing integration tests to hit real HTTP endpoints without a separately running server process.

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

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7.

- Email verification flow untested for non-owner emails as a result

- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint

- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

## Sprint 2 — Document Upload

**Goal:**A logged-in contributor can uplaod a document and anyone can view it.

**Completed:**

- Added `documents` table to Drizzle schema

- Only authenticated users that have `contributor` globalRole or above can access the `documents/upload` page (there is also another role-check in the Back-End)

- Added tRPC `documents.ts` route

- Added two tRPC queries: `list` for getting all documents and `getById` for fetching a single document

- Set up `upload` tRPC mutation: POST request, validates with zod, checks globalRole, accepts file, stores in Cloudinary cloud storage, saves metadata to DB

- On the Front-End I made Document list page on `/documents` and upload form on `documents/upload` page (wired to the upload mutation). After the document is uploaded it will be displayed on `/documents`. Finally, document details can be inspected on `/documents/:id` page

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

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7

- Email verification flow untested for non-owner emails as a result

- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint

- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

- The Playwrright `loginPage` helper function causes test failures when used — login steps are currently inlined in the test as a workaround; needs investigation

## Sprint 3 — Transcription

**Goal:**A logged-in contributor can transcribe a document and access revision history.

**Completed:**

- Added `transcriptions` table to Drizzle schema

- Only authenticated users that have `contributor` globalRole or above can access the transcription block

- Added tRPC `transcriptions.ts` route

- Added two tRPC queries: `getByDocument` for the user's transcription for a given document and `getRevisions` for getting the full edit history for a transcription

- Set up three tRPC mutations: `create`, which creates a new transcription for a document, or returns the existing one; `update`, which saves new content to a transcription and snapshots a revision; and finally, `submit`, which marks a transcription as submitted and waiting for approval by an editor

- On the Front-End I updated the Document details page to include the transcription block that contains textarea, transcription status and revision history list

- Playwright tests the full E2E transcription flow: log in → upload → see it in list → click through to detail → transcribe → check the revision history

**Decisions:**

- Kept `create` and `update` as separate procedures rather than upsert — `create` claims ownership of a document, update handles content saves. Mirrors how real transcription platforms like FromThePage handle document locking

- Transcription panel is gated client-side via `CONTRIBUTOR_ROLES` check on session user, with a matching server-side role check in the `create` procedure — double enforcement at both layers

- Revision history is append-only with no `updatedAt` — `savedAt` is the only timestamp needed since revisions are never modified

- Unique constraint on `(documentId, userId)` enforces one transcription per user per document at the DB level; `create` is idempotent and returns the existing row if it exists

- Refactored e2e test helpers from a shared `helpers.ts` into Playwright fixtures (`fixtures.ts`), extending the base `test` function — login steps are now handled automatically per test via the overridden `page` fixture, solving the inlined login antipattern carried forward from Sprint 2

- `global-setup.ts` handles user seeding before the suite runs, removing the need for `beforeAll` in individual test files

**Issues resolved:**

- OTP verify page was redirecting to `/login` instead of `/` after successful verification — caused by `ProtectedRoute` checking the session before BetterAuth flushed the cookie; fixed by calling `refetch()` on the session before `navigate('/')`

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7

- Email verification flow untested for non-owner emails as a result

- No password strength validation on register — BetterAuth enforces 8 character minimum but nothing beyond that; proper validation deferred to a later sprint

- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

## Sprint 4 — Transcription Review

**Goal:**A logged-in editor can approve or reject a transcription.

**Completed:**

- Only authenticated users that have `editor` globalRole or above can access the review block (on `/documents/:id`)

- Added two tRPC queries: `listQueue` for fetching all submitted transcriptions and `getSubmittedByDocument` for getting specific contributor's transcription (without it, editor would see his own transcription)

- Set up two tRPC mutations: `approve`, which marks the submitted transcription as approved and sends approval email; `reject`, which marks the transcription as rejected and sends rejection mail with rejection reason

- On the Front-End I updated the Document details page to include the transcription review block that contains approve button, rejection reason and reject button (which is disabled if reason is empty). Contributor whose transcription was rejected can see the reason displayed above transcription block, and they can try submitting a new revision

- Added zod validation schemas in `/shared`

**Decisions:**

- `getSubmittedByDocument` added as a separate procedure rather than reusing `getByDocument` — editors need to see the contributor's transcription, not their own slot; reusing the same query would require passing a userId which breaks the ownership model

- Self-review blocked at the procedure level rather than only on the frontend — an editor who is also a contributor cannot approve or reject their own submission even if the UI hides the controls

- Rejection is not terminal — status cycles back through `draft → submitted` after rejection, matching the FromThePage/Scripto pattern; `update` and `submit` procedures updated to accept `rejected` as a valid from-status alongside `draft`

- `isEditor` and `isContributor` helpers imported from `@folio/shared` on both client and server — local `CONTRIBUTOR_ROLES` array removed from `DocumentDetail.tsx` and procedure files

- `@shared` Vite alias added to `vite.config.ts` — previously only worked for type imports (TypeScript strips them at compile time); runtime values like `isEditor` require Vite to resolve the module during bundling

- Cache invalidation via `trpc.useUtils()` instead of threading `refetch` functions — after approve/reject both `getByDocument` and `getSubmittedByDocument` are invalidated so contributor and editor views update without a page reload

- Tests skipped for this sprint — overhead of seeding multiple roles and intercepting email delivery outweighs the benefit at this scale; core logic covered by manual testing

- Refactored Drizzle schemas to NOT infer types, the types are now inferred from zod schemas in `/shared`

**Issues resolved:**

- Editor role users had to log in twice — ProtectedRoute was seeing session: null briefly after login before the session cookie was picked up by useSession; fixed by awaiting refetch() before navigate('/') in Login.tsx, same pattern used in VerifyOtp.tsx

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7

- Email verification flow untested for non-owner emails as a result

- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

- Approved transcription not publicly visible on the document page — only the contributor who wrote it and editors can see it; public display of approved transcriptions deferred to a future sprint

## Sprint 5 — Collections

**Goal:** A logged-in contributor can create a collection.

**Completed:**

- Added `collections` table to Drizzle schema with `title`, `description` and `createdBy` fields; cover image derived from first document in collection via subquery

- Added tRPC `collections.ts` router with `create`, `list`, `getById`, `getCurrentUserCollections`, `update`, `delete`, and `search` procedures

- Added `update` and `delete` procedures to `documents.ts` tRPC router

- Documents are assignable to collections via `collectionId` FK on the `documents` table; update procedure extended with `collectionId` nullable field

- Added `getByCollection` procedure to `documents` router for fetching all documents within a collection

- On the Front-End, built `/collections` page with a grid of `CollectionCard` components, `/collections/create` page, and `/collections/:id` detail page showing collection info and its documents

- Collection detail page includes edit/delete modals and a search input that filters documents within that collection by passing `collectionId` to `documents.search`

- "Add to collection" / "Change collection" flow added to `DocumentDetails` — opens a modal with the user's collections, toggling selection saves the `collectionId` via `documents.update`

- Search added to `/documents` and `/collections` pages with debounce, flicker mitigation via `placeholderData` and `staleTime`, and an "no results" empty state

- Client-side transcription status filter added to `/documents` using `hasApprovedTranscription` from existing list data — no additional procedure needed

- `SearchBar` extracted into a standalone reusable component

- `EditModal`, `DeleteModal`, `ActionsMenu`, and `CollectionPickerModal` extracted as shared components, replacing duplicated modal markup in `DocumentDetails` and `CollectionDetails`

- Vitest mock-based unit tests written for `documents`, `collections`, `transcriptions`, and `admin` routers

- Playwright e2e tests written for document upload, document search, collection creation, and collection search flows; fixture refactored to auto-seed and auto-cleanup a unique user per test

**Decisions:**

- Chose `ilike` for search over full-text search — sufficient for title matching at this scale; full-text search deferred until a later sprint if needed

- Search is driven by a single debounced input (500ms) rather than a submit button — results update as the user types, with `placeholderData: (prev) => prev` and `staleTime: 1000` keeping previous results visible during fetch to prevent flicker

- Cover image for a collection is derived via a subquery from the first document in the collection ordered by `created_at` — no separate image field on the collection, avoids redundant storage

- Collection assignment lives on the document (`collectionId` FK) rather than a join table — collections in this app are simple one-to-many groupings, a join table would be over-engineering at this scale

- `getCurrentUserCollections` takes `userId` as input rather than reading from `ctx.user` — allows the query to be reused flexibly, though currently only called with the session user's id

- Shifted unit tests from integration-style (real DB calls) to mock-based (vi.mock on db/index.js) — faster, no DB dependency, and easier to assert exact values passed to DB calls; Playwright e2e covers the real DB path

- Playwright fixture refactored to auto-seed and auto-cleanup a unique user per test via `seedUser`/`cleanupUser` — eliminates shared user state between test files that caused cross-file test failures when one file's afterAll deleted the shared user before another file finished

- `SearchBar` extracted into a reusable component with an `onChange: (value: string) => void` prop rather than exposing the raw `ChangeEventHandler` — hides event plumbing inside the component and gives consumers a simpler string-based API

- `EditModal`, `DeleteModal`, `ActionsMenu`, and `CollectionPickerModal` extracted as shared/reusable components — both `DocumentDetails` and `CollectionDetails` were duplicating the same modal markup; shared components fix styling and behavior in one place

- `data-testid` values on `ActionsMenu` kept generic (e.g. `edit-modal-btn`) rather than page-prefixed — avoids needing extra props per page and works since the two menus never appear on the same page simultaneously

**Issues resolved:**

- Cross-file Playwright test failures caused by shared test user — `afterAll` in `documents.test.ts` deleted the user before `collections.test.ts` finished; fixed by refactoring the fixture to seed and clean up a unique user per test automatically

- `ChangeEventHandler` type error in `SearchBar` — `ChangeEventHandler` without a generic defaults to `Element`, which has no `value`; fixed by typing the prop as `onChange: (value: string) => void` and handling the event internally

- Collections modal showed empty list — `getCurrentUserCollections` was firing before `user` was available; fixed by adding `enabled: !!user?.id` to the query options

- `ActionsMenu` save/manage button only appeared when document was already in a collection — condition was `inCollection` instead of `onSaveToCollection`; fixed to show whenever the prop is passed

- Authenticated tRPC callers in unit tests threw `UNAUTHORIZED` — `ctx.user` was never set because the test helper only passed `session` but procedures check `ctx.user`; fixed by passing `user` directly in the caller context, matching what `createContext` produces in production

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7

- Email verification flow untested for non-owner emails as a result

- Docker warns about some vulnerabilities related to Golang packages. No idea what that means, but a quick research showed that it's probably a false-flag warning. Will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production. Monitor for a drizzle-kit update that resolves it later

- OTP cannot be tested end-to-end in Vitest since valid codes require intercepting Resend delivery, so only rejection paths are covered

- Review queue has no navigation link — deferred to Sprint 6

## Sprint 6 — PDF Pipeline & Pages

**Goal:** A logged-in contributor can upload a PDF document, which is automatically split into individual pages. Pages can be browsed, searched, filtered, and managed independently.

**Completed:**

- PDF upload pipeline: BullMQ + IORedis queue, pdf-to-img worker splits PDF into PNG buffers, each page is uploaded to Cloudinary and inserted into `document_pages` table with `Page ${i}` default title; original PDF is never stored

- Document hierarchy introduced: Document is now a container; each page has its own image, title, and transcription slot

- Routes refactored: `/documents/:id` now shows a page grid (`DocumentPages.tsx`); `/documents/:id/pages/:pageNumber` shows a single page viewer (`PageDetails.tsx`); review route moved to `/review/:id/:pageNumber?userId=<id>`

- `document_pages` table added to Drizzle schema with `pageNumber`, `imageUrl`, `cloudinaryPublicId`, unique constraint on `(documentId, pageNumber)`; pages exported as `pages` (not `documentPages`) to avoid tRPC router key collision

- `pages` tRPC router added with `getByDocument`, `getById`, `getByPageNumber`, `update`, `delete`, `addPages`, and `replaceImage` procedures

- `getByDocument` returns paginated results with `approvedTranscriptionCount` per page via `COUNT(CASE WHEN status = 'approved' THEN 1 END)::int` and a `leftJoin` on transcriptions — correlated subquery approach returned 0 due to Drizzle interpolation issues

- Page deletion renumbers remaining pages using raw SQL `CASE` to preserve custom titles while updating default `Page N` titles

- `AddPagesModal` and `ReplaceImageModal` added; file input uses shadcn `Attachment` component with a hidden `<input type="file">` triggered programmatically

- Search, pagination, and transcription status filter added to `DocumentPages`; search and pagination state stored in URL params; filter is client-side using `approvedTranscriptionCount`

- `uploadDocumentSchema` refactored from discriminated union to flat `z.object()` with optional `fileType`, `fileBase64`, and `files` fields — document creation with no files now supported

- Transcription procedures migrated from `documentId` to `pageId` — each page has its own transcription slot

- Review queue updated: `listQueue` joins pages and documents to get `documentId` and page number; `ReviewPage` reads `userId` from query params; `getSubmittedByPageAndUser` takes both `pageId` and `userId`

- BullMQ worker startup deferred with `setTimeout` in `server.ts` to prevent cold-boot blocking — on first PC boot Redis takes a few seconds to initialize, causing the first tRPC queries to hang until the is connected

- Vitest unit tests rewritten for `documents`, `collections`, `transcriptions`, and `pages` routers to match updated procedure signatures and query chain shapes (for mocking)

- Playwright e2e tests updated: file input targeting switched from `getByLabel('File')` to `page.locator('input[type="file"]')` due to hidden input behind shadcn Attachment; navigation fixed to use `getByTestId` + `filter({ hasText })` instead of `getByText` to avoid strict mode violations from duplicate text matches; `data-testid` added to `DocumentCard` and `CollectionCard`

**Decisions:**

- `pdf-to-img` chosen over `pdfjs-dist` + `canvas` — canvas bindings produce blank images in Node.js due to rendering limitations; `pdf-to-img` works headlessly without native dependencies

- Pages stored as individual Cloudinary images rather than keeping the original PDF — enables per-page image replacement, lazy loading, and Cloudinary transformations; original PDF has no further use after processing

- `approvedTranscriptionCount` computed via `leftJoin` + `COUNT(CASE WHEN ...)::int` rather than a correlated subquery — Drizzle's `sql` template tag interpolates column references correctly in a join context but not reliably inside a correlated subquery; `::int` cast required because PostgreSQL `COUNT` returns bigint which Drizzle passes back as a string

- Client-side filtering for transcription status rather than server-side — `approvedTranscriptionCount` is already returned per page in `getByDocument`; adding a server-side status filter would require a separate count query or a `HAVING` clause, adding complexity for no real benefit at this scale

- Search and pagination state moved to URL params for `DocumentPages` — consistent with the existing pattern on `/documents` and `/collections`, enables browser back/forward and shareable URLs

- `transcriptionRevisions` append-only with `savedAt` only — revisions are never modified, so `updatedAt` is unnecessary; matches the pattern established in Sprint 3

- BullMQ worker deferred with `setTimeout(3000)` rather than awaiting at server startup — ensures the HTTP server accepts requests immediately on cold boot; PDF jobs submitted during the window sit in the queue and are picked up once the worker connects, so no jobs are lost

- `getByTestId` + `filter({ hasText })` pattern adopted across all Playwright tests — `getByText` causes strict mode violations when multiple cards share the same title (different users' documents/collections); filtering by testid scopes the locator to the card element and avoids ambiguity

**Issues resolved:**

- `approvedTranscriptionCount` returned `'0'` as a string — PostgreSQL `COUNT` returns bigint; fixed with `::int` cast in the raw SQL

- `approvedTranscriptionCount` returned `0` even with approved transcriptions — correlated subquery not resolving `pages.id` correctly inside `sql` template; fixed by switching to `leftJoin` + `COUNT(CASE WHEN ...)`

- PDF worker blocking cold boot — BullMQ tried to connect to Redis before it finished initializing on first PC boot; fixed by deferring worker import with `setTimeout`

- Playwright strict mode violations from duplicate text — multiple cards with the same title caused `getByText` to resolve to multiple elements; fixed with `getByTestId('...').filter({ hasText: title })`

- Hidden file input not reachable by `getByLabel('File')` — shadcn Attachment uses a hidden `<input>` triggered by a button; fixed by targeting `input[type="file"]` directly, which Playwright can interact with regardless of visibility

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification on Resend website deferred to Sprint 7

- Email verification flow untested for non-owner emails as a result

- Docker warns about some vulnerabilities related to Golang packages — likely a false-flag warning, will revisit later

- esbuild moderate vulnerability via drizzle-kit's dependency on `@esbuild-kit` — dev-only, unexploitable in production; monitor for a drizzle-kit update

## Sprint 7 — Dashboard and Profile Settings

**Goal:** A logged-in user has a profile where they can manage their account, see their contribution stats and request a higher role, and contributors have a dashboard summarizing their work.

**Completed:**

- Profile page reworked into a tabbed layout (`/profile?tab=stats|settings|roles`) with a header (avatar, name, `@username`, role pill), a details strip (email, member since) and tabs synced to the URL. The admin-only "Role requests" tab shows a pending-count badge; non-admins fall back to stats

- Avatar upload and removal: base64 goes through `profile.uploadAvatar` to Cloudinary under a fixed `avatars/<userId>` public id (overwrite + invalidate, 400x400 fill crop), then the client calls BetterAuth `updateUser({ image })` so the session stays in sync

- Profile settings: edit profile (name, username), change password (with "sign out other sessions" option), sign out, and a danger zone with delete account. Edit modals validate with shared Zod schemas (`updateProfileSchema`, `changePasswordSchema`)

- Contribution stats: `getUserStats(userId)` helper in `server/src/lib/user-stats.ts` (two parallel `db.select()` aggregates with `::int` casts), shared by `profile.getStats` and the dashboard

- Role request flow end to end: `role_requests` table with a partial unique index (one pending request per user), `profile.requestRole` / `getMyRoleRequest`, admin `listRoleRequests` / `approveRoleRequest` / `rejectRoleRequest`, approval and rejection emails, `RoleRequestCard`, `RequestRoleModal`, `RoleManagement` and `RejectRoleRequestModal`

- `adminProcedure` added to `trpc.ts`; `admin.setUserRole` now uses it instead of an inline role check

- Account deletion: `deleteUserContent(userId)` runs in a single transaction from a BetterAuth `beforeDelete` hook (which also blocks deleting the only admin), followed by best-effort Cloudinary cleanup. Approved transcriptions on other people's documents survive with `userId` set to NULL

- `transcriptions.userId` made nullable (`ON DELETE SET NULL`). Follow-ups: `!transcription.user` guards in `approve` / `reject`, `listQueue` selects `user.id` so its type stays non-null, and `getApprovedByPage` now uses a `leftJoin` on `user` and returns only public author fields (`authorName`, `authorUsername`, `authorImage`) (confirm)

- Approved transcriptions show "Transcribed by [avatar] name" on the page view, falling back to "Deleted user" (confirm)

- Dashboard (`/dashboard`): new `dashboard.getOverview` procedure returning stats, five most recent documents (with page count and cover image), recent rejected transcriptions, a review queue count (editors and above) and a pending role request count (admins). Client components: `OverviewStats`, `AttentionCards`, `RejectedList`, `RecentDocuments`. Viewers see a "become a contributor" gate that links to their profile instead of an empty dashboard. Login now lands on `/dashboard`

- `EditModal` rewritten as a shadcn `Dialog` with the same props (Save disabled until changed, blocked while pending)

- Zod aligned on v4 across client, server and shared

- Vitest mock-based tests added for `dashboard` and `profile` routers, plus new `transcriptions` cases for deleted authors (`approve` / `reject` return `NOT_FOUND`, `getApprovedByPage` with a null author)

- Playwright e2e added for the dashboard (access gate, contributor, editor and admin views) and the profile page (tabs and deep links, edit name, role request flow with an admin approving or rejecting in a second browser context). Fixtures extended with a `loginAs(role)` helper

**Decisions:**

- Dashboard gets its own router and route rather than living under `profile`, since it is a separate page in the client with a different purpose

- Viewers see an explanatory gate on the dashboard instead of a redirect or an empty page, so they know why and where to act (the role request lives on the profile). The Nav link stays visible so they can find it

- The target role of a request is derived server-side from the current role (viewer to contributor, contributor to editor); the client never sends it. A race between two simultaneous submits is caught by the partial unique index (Postgres `23505`) and mapped to `CONFLICT`

- Approval is guarded by `status = 'pending'` inside a transaction, and the approval email is sent in a try/catch so an email failure never undoes the approval

- Role requests are reviewed by admins only. The review queue count on the dashboard excludes the editor's own submissions, since editors can't review their own work

- Avatar upload needs no new DB column: the image URL lives on the BetterAuth `user.image` field and the Cloudinary public id is deterministic per user

- On account deletion, the user's collections are removed by the `collections.createdBy` FK cascade rather than an explicit delete. Other users' documents inside them become uncollected because `documents.collectionId` is `ON DELETE SET NULL`

- Approved transcriptions outlive their author ("Deleted user"), while non-approved ones are deleted with the account. Content cleanup is idempotent, so a retry after a partial failure is safe

- Public author data on approved transcriptions is limited to name, username and image. The `getApprovedByPage` procedure is public, so it must never return the full user row (email)

- Author attribution is shown on the single page view only, not the page grid, to avoid a join and a wall of avatars for no real benefit

- `getByPageNumber` results and list items share a base page schema; `approvedTranscriptionCount` only belongs to the list query, so it is not required where it isn't produced (confirm)

- Two users in one e2e test (for example viewer requests, admin approves) use separate browser contexts, since one `page` shares one set of session cookies

**Issues resolved:**

- `ERR_CONNECTION_REFUSED` on every request after adding new server code: the server had crashed on a bad import or a missing shared export (Node reports "does not provide an export named ..."). Fixed the import and re-exported new shared schemas from `shared/src/index.ts`

- `Property '_zod' is missing in type ...` when wrapping a shared schema in `z.array(...)`: shared schemas were on Zod v3 while the router used v4. Fixed by aligning all workspaces on v4 (`npm ls zod` to check for duplicates)

- Dashboard `useQuery` was enabled for non-contributors instead of contributors (inverted `enabled` condition), leaving contributors on skeletons forever

- `asChild` console warning on shadcn `Button` wrapping a `Link`: the generated button is not Radix-based, so the prop leaked to the DOM. Fixed by using the library's `render` prop (or `buttonVariants` on the `Link`) instead of nesting `<a>` inside `<button>`

- Type error passing a `getByPageNumber` result to `PageViewer`: the viewer's prop type required `approvedTranscriptionCount`, which only the list query returns. Fixed with a base page schema (confirm)

- Playwright strict mode violation on `getByLabel('Name')` in the edit profile dialog, because it also matched "Username" by substring. Fixed with `{ exact: true }`

**Known issues carried forward:**

- Resend free tier: only delivers to Resend account owner email in dev. Real domain verification deferred to Sprint 8, and the email-change flow and non-owner verification emails stay untested until then

- Password strength rule (letter + number) is enforced client-side only; BetterAuth only enforces min/max length server-side. Needs BetterAuth `hooks.before` on `/sign-up/email`, `/change-password` and `/reset-password`, and `passwordSchema` reused in Register

- Stale session after role approval: if the BetterAuth session cookie cache is enabled, an approved user keeps the old role until it expires or they log in again. Option: delete that user's session rows in the approve transaction (this would also push new editors straight into email OTP)

- `dashboard.getOverview` still returns empty or null data for viewers instead of throwing `FORBIDDEN`; the gate is client-side only. Making it strict would allow a non-nullable `stats` in the schema

- Account deletion is not atomic across BetterAuth's steps (content deleted in `beforeDelete`, user row afterward). Deleting while a PDF job is processing makes the worker's inserts fail on the FK (a harmless failed BullMQ job). Password-confirmed deletion works for credential accounts only

- Approved transcriptions on a document that gets cascade-deleted are lost with it

- Role requests can be re-submitted immediately after a rejection (no cooldown)

- Not yet written: unit tests for `deleteUserContent`, `getUserStats` and the admin role-request procedures; e2e for account deletion (throwaway user, redirect to `/login`, login fails afterwards), avatar upload (needs Cloudinary cleanup for `avatars/<userId>`), change password and "Deleted user" attribution

- Not built: Security tab (active sessions, sign out everywhere), toast notifications, role request history, a UI for direct role changes (`setUserRole` exists server-side only), `refetchInterval` for the pending-count badge, `DeleteModal` conversion to `Dialog`, and confirming `express.json` limit is at least 10mb for 5MB avatar uploads (about 6.8MB as base64)

- Resend domain verification (above), Docker Golang warnings and the drizzle-kit esbuild advisory are unchanged from earlier sprints

## Sprint 8 — Deployment

## Sprint 9 — Bug Fixes and General Improvements

## Sprint 10 — Visual Design Revamp
