# DigiScript — Core System

DigiScript is an intelligent document management + financial operating
system for K-12 school districts. This repository implements the **core
system**: the multi-tenant backend that document ingestion, AI
categorization, role-based access, escalation workflows, and the audit
trail all run on. It is the foundation the System Owner / Super User
portals, the mobile PWA, and the WhatsApp/email/SMS channels described in
the source specs are built on top of.

Source requirements live in [`docs/specs/`](./docs/specs):

- `PRD.md` — product requirements, personas, MVP use cases, release plan
- `complete-application-specification.md` — three-tier architecture,
  screen-by-screen breakdown per role
- `ui-design-briefs-by-role.md` — detailed screen designs per role
- `mvp-use-cases.md` — district-level financial consolidation workflows

A separate screenshot deck was reverse-engineered into
[`docs/design/mobile-app-screens-catalog.md`](./docs/design/mobile-app-screens-catalog.md) —
read it before starting any frontend work. It originally flagged an
unresolved conflict (the deck mixes two different visual/branding systems)
and two roles not covered by the specs above; those have since been
decided (see **Product decisions** below) — the catalog file itself still
describes them as open questions and hasn't been rewritten to match.

## Product decisions

Scope questions the screenshot catalog raised have been resolved:

| Question | Decision |
|---|---|
| Two visual systems (blue chat-first vs. indigo school-suite) | **Both, as separate apps** — System A (blue) is the mobile chat app for Parent/Teacher/Supervisor; System B (indigo) is the web back-office for System Owner/Super User. This matches the Application Spec's existing two-portal split, so no architecture change was needed. |
| Student login (the deck's My Courses/Assignments/Progress app) | **Yes, but narrow** — a `STUDENT` role exists with login and read-only access to their own `Student` record (`GET /students/me`). Courses, assignments, grades, and learning resources are explicitly **not** built — that would be a separate, much larger LMS-style feature. |
| Scanning Team (bulk ID/document capture with OCR field extraction) | **Deferred** — not in the PRD's role list; not built. |
| Full Financial Management module (budgets, transactions, bank reconciliation, treasury/payroll integration) | **Deferred** — matches the PRD's own release plan, which places full financial consolidation after MVP Phase 1. The `Budget` model remains a minimal stub. |

All four non-back-office roles of System A now have a working frontend:
[`web/mobile-app`](./web/mobile-app) — an installable PWA (React + Vite +
`vite-plugin-pwa`) covering Parent (chat, My Child, Notifications),
Teacher (class roster, read-only documents), Supervisor (escalations,
document upload + AI categorization, staff replies), and a narrow Student
self-view, all wired to the real backend below.

System B, the web back-office, now has a first build too:
[`web/back-office`](./web/back-office) — a desktop portal (React + Vite,
no PWA) covering System Owner (multi-school overview, district audit),
Super User (school dashboard, document library with upload and AI
categorization, user management, student records, escalations, audit),
and Support (escalations and audit only). The modules with no data model
behind them — budgets, financial consolidation, government reports,
knowledge base, exports — are left out rather than mocked, and its README
lists them.

## Architecture

```
District (System Owner scope)
  └── School (Super User scope)
        ├── User (SYSTEM_OWNER / SUPER_USER / SUPERVISOR / TEACHER / PARENT / SUPPORT / STUDENT)
        │     ├── assignedClassName (scopes TEACHER/SUPERVISOR rosters)
        │     └── studentId (STUDENT's own record, 1:1 — see User.student)
        ├── Student ──< ParentStudentLink >── User (PARENT)
        ├── Document ──> DocumentCategory
        │     └── Escalation (created when AI confidence is low)
        ├── Conversation ──< Message (AI / PARENT / STAFF, staff notes can be internal-only)
        │     └── Escalation (created when a chat answer's confidence is low)
        └── AuditLog (append-only)
```

Three integration points are deliberately abstracted behind interfaces so
they can be swapped for real providers without touching the ingestion
pipeline, RBAC, or audit trail:

| Interface | Dev implementation | Production target |
|---|---|---|
| `StorageService` (`src/services/storage`) | Local disk | AWS S3 (PRD 4.5) |
| `CategorizationService` (`src/services/ai`) | Keyword heuristic | LLM-backed categorization (PRD 4.4) |
| `QueryService` (`src/services/ai`) | Keyword match against a student's categorized documents | LLM + semantic search over the knowledge base (PRD 4.6–4.7) |

### Document ingestion pipeline (PRD 4.3–4.5, Use Case 2)

1. File is uploaded and saved via `StorageService`.
2. `CategorizationService` suggests a category + confidence score.
3. Confidence routing (PRD 4.4 thresholds, configurable via env):
   - `>= 0.85` — auto-categorized, indexed immediately.
   - `0.70–0.85` — categorized but flagged for confirmation.
   - `< 0.70` — routed to the **escalation queue** for human review.
4. Folder path is generated as `{academicYear}/{term}/{category}`
   (mirrors the S3 layout in PRD 4.5).
5. Every step is written to the immutable audit log.
6. Confirming a category (`POST /documents/:id/confirm-category`) also
   auto-resolves that document's escalation, if it has one — the other
   half of PRD Use Case 3 ("document auto-organized" / "Mark as
   Resolved"), so a supervisor reviewing a low-confidence document doesn't
   have to separately resolve its escalation afterward.

The categorization result also carries a short `reasons: string[]` list —
the "why we think this" explanation shown on the AI Categorization screen
(`docs/design/mobile-app-screens-catalog.md`, page 04) — stored on the
document as `categoryReasons`.

### Chat & escalation pipeline (PRD 4.7, Use Case 1)

1. A parent starts (or resumes) a conversation about one of their linked
   children — `POST /conversations`. Access is enforced the same way as
   student records: a parent may only open a conversation about a child
   they're linked to.
2. Each parent message runs through `QueryService`, which searches that
   student's already-categorized documents and drafts an answer with a
   confidence score and the list of source document ids it drew from.
3. Below `QUERY_LOW_CONFIDENCE` (default `0.7`), the conversation is marked
   `ESCALATED` and an `Escalation` (`PARENT_QUERY_UNRESOLVED`) is created —
   the same queue low-confidence document categorizations land in.
4. Staff reply through `POST /conversations/:id/staff-reply`, either as a
   parent-visible reply or an `isInternal` note (never returned to the
   parent — see the "Add Note (internal)" field on the Respond to Parent
   screen). `POST /conversations/:id/resolve` closes the conversation and
   any linked escalation.

### RBAC (PRD 4.8)

Enforced in `src/middleware/rbac.ts`:

- Row-level tenant scoping — a request scoped to a `schoolId` must match
  the caller's own school, except for `SYSTEM_OWNER` (cross-school
  oversight).
- Role groups (`ROLE_GROUPS`) gate which roles can manage schools/users,
  review documents, handle escalations, or read the audit log — matching
  the access rules in PRD 4.8 (parents see only their child, teachers see
  their class, admins see everything in their school, etc).
- `assertCanAccessStudent` (`src/modules/students/student.service.ts`) is
  the single per-student authorization check, reused by the student and
  conversation modules: `SYSTEM_OWNER`/`SUPER_USER` see the whole school,
  `TEACHER`/`SUPERVISOR` are scoped to `assignedClassName`, `PARENT`
  requires a `ParentStudentLink`, and `STUDENT` may only access the one
  record matching their own `studentId`.
- Documents have their own, narrower scoping in
  `src/modules/documents/document.service.ts`: `ROLE_GROUPS.documentRead`
  (`SYSTEM_OWNER`/`SUPER_USER`/`SUPERVISOR`/`TEACHER`) can list/view, but
  only `ROLE_GROUPS.documentReview` (excludes `TEACHER`) can upload or
  confirm a category — matching the PRD's "Teacher: view documents, no
  upload access." `TEACHER` additionally only sees documents with no
  student attached (school-wide) or attached to a student in their
  `assignedClassName`. **Known gap:** `SUPERVISOR` is not similarly
  class-scoped for documents — an unset `assignedClassName` (the common
  case) already means school-wide by design, but even a supervisor whose
  `assignedClassName` is set can currently see every class's documents.

### Audit trail (PRD 4.10)

`src/modules/audit/audit.service.ts` is the single write path into
`audit_logs`. It is append-only by convention — no code path updates or
deletes a row — and every module (auth, documents, users, escalations)
calls into it rather than logging independently.

## What's out of scope here

Per the PRD release plan, this core system covers **MVP Phase 1**: school
registration, user/role management, student records, document ingestion +
AI categorization, a web-channel chat/query interface with AI response
generation, RBAC, escalations, and audit trail. Not yet implemented (later
phases in the PRD):

- WhatsApp/SMS/email as actual delivery channels — `Conversation.channel`
  models them, but only the `WEB` channel has a working pipeline
- Semantic search / vector embeddings (PRD 4.6) — `QueryService` currently
  matches by keyword against a student's own categorized documents, not a
  real knowledge-base index
- The System B modules with no data model behind them — budget tracking
  and approvals, financial consolidation, government compliance reports,
  the knowledge-base index, Reports &amp; Analytics, settings/branding and
  integrations, bulk CSV import, password-reset email, and PDF/Excel
  export. [`web/back-office`](./web/back-office) covers the rest; its
  README enumerates each gap. Native (non-PWA) apps aren't planned; see
  `docs/design/mobile-app-screens-catalog.md` and **Product decisions**
  above for which visual system each app follows.
- Serving document files back over HTTP — the backend records a storage
  key but has no endpoint that returns the bytes, so neither frontend
  offers preview or download.
- Multi-school financial consolidation and government report generation
  (the `Budget` model exists as a minimal seed for this, not the full
  reporting engine described in `mvp-use-cases.md`) — deferred by decision
- The Scanning Team (data-capturing) role from the screenshot deck —
  deferred by decision
- A student learning-management experience (courses, assignments, grades,
  resources) — the `STUDENT` role exists, but scoped to login + read-only
  self-view only, by decision

## Getting started

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET
docker compose up -d        # starts Postgres, or point DATABASE_URL at your own
npm install
npm run prisma:migrate      # applies the schema
npm run seed                # loads the demo district (see "Running a demo")
npm run dev                 # starts the API on :4000
```

## Running a demo

`npm run seed` loads a South African school district — Gauteng East, two
schools, learners and staff with names from several SA language groups,
Rand amounts, SA grades and school terms — sized so PRD use cases 1-4 can
be walked without setting anything up first. It is safe to re-run between
demo runs: it clears prior data and starts over.

Start the API with demo mode on:

```bash
DEMO_MODE=true npm run dev
```

Both apps then show their ordinary email/password form with a **demo
section underneath it**: choose a role, choose which of the seeded people
to be, and one click signs you in. The normal login keeps working
throughout — the demo section is an addition, not a replacement. Each app
offers only the roles it serves (the mobile app shows
Supervisor/Teacher/Parent/Learner, the back office shows District
Office/Principal/Support Desk), so the picker can never land you on a
"wrong app" screen.

### Two switches

| Switch | Scope | Who controls it |
| --- | --- | --- |
| `DEMO_MODE` env var | The whole deployment | Whoever runs the server |
| `School.demoModeEnabled` | One school | A **System Owner**, from the back office's Multi-School screen |

`DEMO_MODE` decides whether demo mode exists at all. It currently
**defaults to on** — every deployment is a demo deployment while the
product is being shown — so a deployment is demo-capable unless you set
`DEMO_MODE=false`, at which point both apps show a plain login form and
`/demo/*` returns 404. Once it is on, each
school is switched on or off individually — a school that is off
contributes no demo accounts to either picker, and its personas are refused
by the sign-in endpoint even if someone calls it directly. District Office
personas follow the env switch alone, since hiding them would remove the
very account needed to turn a school back on.

### No password is shown or sent

The picker's buttons carry only the persona's email. `POST /demo/login`
has the server run the ordinary password login with the demo credential it
holds — so it is a real authentication, with the same status checks,
`lastLoginAt` update and audit entry, and the credential never reaches the
browser, the network tab, or the JS bundle. That endpoint refuses any
address not in the persona list, so it cannot be aimed at a real account
that happens to share the database.

The apps discover demo mode rather than being configured for it: they call
`GET /demo/personas`, and an empty or refused answer simply means the demo
section isn't rendered. So the apps and API can't disagree about whether a
demo is running, and the picker can only offer accounts the seed actually
created — both read the same list in `src/modules/demo/demo.personas.ts`.

> `DEMO_MODE` makes working logins available to anyone who can reach the
> API — no password required. It is **on by default**, and the server logs
> a warning at startup whenever it is on. Set `DEMO_MODE=false` before any
> deployment holds real learner data.

Everything in the demo is live, not staged: the seeded documents are
pushed through the real categorization pipeline, so their confidence
scores, folder paths and escalations are genuinely produced. Adding data
during a demo works normally — send a parent message, upload and
categorize a document, resolve an escalation — and it lands alongside the
seeded data.

`npm run seed` prints a summary of what it created.

### Testing

```bash
# create a separate database for tests, e.g. digiscript_test, then:
DATABASE_URL=postgresql://.../digiscript_test npx prisma migrate deploy
npm test
```

Tests spin up the Express app in-process (via `supertest`) against the
test database and exercise registration, login, RBAC boundaries
(same-school enforcement, role checks, class/child scoping), the full
document ingestion → categorization → escalation pipeline, the chat →
AI response → escalation → staff resolution pipeline, and audit log
writes.

## Deploying

Everything ships from **one Vercel deployment** — the mobile PWA at `/`,
the back office at `/admin`, and the API at `/api`. One origin means there
is no CORS to configure and no second URL to keep in sync, and the two
frontends are built with `VITE_API_URL=/api` so they call their own host.

| Path | Served by |
| --- | --- |
| `/` | `web/mobile-app` (System A, installable PWA) |
| `/admin` | `web/back-office` (System B) |
| `/api/*` | `api/index.ts` — the Express app as a serverless function |

### First-time setup

1. **Attach a Postgres.** In the Vercel project, Storage → create a
   Postgres (Neon) database. Nothing else to configure: Vercel sets
   `POSTGRES_PRISMA_URL` and friends rather than `DATABASE_URL`, and
   `src/config/database-url.ts` resolves those — pooled for the running app,
   unpooled for migrations, since pgbouncer in transaction mode cannot hold
   the locks a migration takes.
2. **Set `JWT_SECRET`** in Settings → Environment Variables, to any string
   of 16+ characters. Changing it later logs everyone out. This is the one
   value that has no sensible default; without it the API answers every
   request with `503` and names the missing variable.
3. **Redeploy.** Migrations run during the deploy's install step via
   `scripts/deploy-migrate.mjs`, which skips quietly when no
   `DATABASE_URL` is set and fails the build loudly when one is set but
   cannot be migrated.
4. **Load the demo data.** Open the deployment and click **Load demo
   data** under the login form — with demo mode on and an empty database,
   both apps offer it. Or from a terminal:
   ```bash
   curl -X POST https://<your-deployment>/api/demo/seed
   ```
   `POST /api/demo/seed` is open only while the database is empty — a state
   nothing can be lost from. Once there are users it requires a
   `SYSTEM_OWNER` token, so it doubles as a "reset the demo" button between
   runs without exposing a way for anyone to wipe it.

   Until it is loaded, the mobile app shows no demo accounts at all: every
   one of its roles is school-scoped, and there are no schools yet. The back
   office still lists District Office, whose personas belong to the district
   rather than a school. That asymmetry is why an unseeded deployment looks
   like only the mobile app is broken.

`DEMO_MODE` needs no setting: it defaults on.

### Serverless trade-offs

- **Uploaded file bytes live in Postgres.** Only `/tmp` is writable on a
  serverless function and it is wiped between cold starts, so a document
  uploaded there was readable for a few minutes and then gone. The default
  `StorageService` writes the bytes to a `document_files` row instead, and
  `GET /documents/:id/file` reads them back under the same access rules as
  the document's metadata. Postgres is a poor object store at scale, which
  is what `StorageService` exists to make swappable: at district volume,
  swap in an S3-backed implementation.
- **Cold starts** are about a second, not the ~50s of a sleeping
  container host.
- `render.yaml` and the `Dockerfile` are still here and still work, if the
  API ever wants a long-running home. See "Deploying to a container host".

## Deploying to a container host

### How the Vercel config works

The root [`vercel.json`](./vercel.json) declares its builds explicitly
rather than letting Vercel guess — zero-config would try to build the repo
root as one app, which is the Express backend. The back office's `vercel-build` script sets
`BACK_OFFICE_BASE=/admin/`, which Vite bakes into its asset URLs and React
Router reads back as its `basename` — so the two can't drift apart. Local
`npm run dev` and `npm run build` are unaffected and still serve from the
root.

It does this with explicit `builds` entries naming `@vercel/static-build`
against each app's `package.json`, with `distDir: "dist"`. Declaring
the builder outright is deliberate: it takes Vercel's framework
auto-detection out of the picture entirely. Detection reads the *root*
`package.json`, sees `express`, and concludes "Node server" — at which
point it ignores the static output and hunts for an
`app.js`/`index.js`/`server.js` serverless entrypoint, failing with
`No entrypoint found in output directory`. A `builds` entry can't fall
into that path, and it also takes precedence over the dashboard's Build &
Development Settings, so a stray override there can't silently undo it.

`@vercel/static-build` runs install and `npm run build` with its working
directory set to `web/mobile-app`, so **leave "Root Directory" at the repo
root (the default)** when creating the project — pointing it at
`web/mobile-app` would make the `builds` path resolve against the wrong
place.

The `routes` block pairs with `builds` (`rewrites` is only for the
non-`builds` config style), and it has to do one non-obvious thing:
**rewrite every incoming path into `/web/mobile-app/`**. `@vercel/static-build`
mounts its output at the directory of its `src` entrypoint, not at the
deployment root — so `dist/index.html` is served at
`/web/mobile-app/index.html`. Routes written against `/index.html` match
nothing and every request 404s.

So the order is: rewrite `/(.*)` → `/web/mobile-app/$1`, then
`handle: filesystem` serves real files (hashed assets, `sw.js`,
`manifest.webmanifest`), then anything still unmatched falls through to
`/web/mobile-app/index.html`. That last hop is what makes client-side
routes survive a deep link or a page refresh — without it, loading `/chat`
directly returns a 404. `/` and `/sw.js` are handled explicitly ahead of
the generic rewrite, the latter to keep the service worker from being
cached and pinning the app to a stale build.

### Pointing it at a backend

Set one environment variable in the Vercel project's dashboard (Settings →
Environment Variables): **`VITE_API_URL`**, pointing at wherever the
backend is actually hosted. Vercel's serverless functions aren't a good
fit for this backend's persistent Postgres connections and JWT session
model — deploy it somewhere like Fly.io, Render, or a plain VM, and point
`VITE_API_URL` there.

Without it the build still succeeds and the PWA still installs, but every
API call fails: the app falls back to `http://localhost:4000`, which means
*the visitor's own machine*, not yours. The app detects this case (served
from a non-localhost host with no `VITE_API_URL` set) and says so
directly — "This deployment has no backend configured" — rather than
surfacing it as a generic network error.

## Project layout

```
prisma/schema.prisma        Data model (see Architecture above)
src/config/env.ts           Validated environment config
src/middleware/             auth (JWT), rbac, validation, error handling
src/modules/<domain>/       routes + service per domain (auth, schools,
                             users, students, documents, conversations,
                             escalations, audit)
src/services/storage/       StorageService interface + local-disk impl
src/services/ai/            CategorizationService + QueryService interfaces,
                             both with a heuristic dev implementation
tests/                      vitest + supertest integration tests
docs/specs/                 source PRD / application spec / use cases
docs/design/                screenshot-derived UI reference (see the
                             catalog's "two visual systems" caveat before
                             using it for frontend work)
web/mobile-app/              System A: Parent/Teacher/Supervisor/Student —
                             installable PWA (React + Vite), see its own
                             README for how to run it and test installability
web/back-office/             System B: System Owner/Super User/Support —
                             desktop admin portal (React + Vite), see its
                             own README for what's built and what's deferred
```
