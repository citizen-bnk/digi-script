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
self-view, all wired to the real backend below. All of System B (the web
back-office for System Owner/Super User/Support) remains unbuilt.

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
- All of System B (the web back-office for System Owner/Super
  User/Support) — [`web/mobile-app`](./web/mobile-app) covers System A
  (Parent/Teacher/Supervisor/Student) only. Native (non-PWA) apps aren't
  planned; see `docs/design/mobile-app-screens-catalog.md` and
  **Product decisions** above for which visual system each app follows.
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
npm run seed                # creates a demo school + one user per role
npm run dev                 # starts the API on :4000
```

Demo login (from `npm run seed`): `principal@riverside.example` /
`Password123!` (also `supervisor@`, `teacher@`, and `parent@` at the same
domain, and `jane.smith@riverside.example` for the seeded student login).

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

## Deploying the frontend to Vercel

The root [`vercel.json`](./vercel.json) scopes a Vercel deployment to
**`web/mobile-app` only** — Vercel's zero-config build otherwise tries to
build this repo's root as a single app, which is the Express + Postgres
backend, not something Vercel's static/serverless model is set up to run
as-is. `installCommand` is a no-op (`true`); the real install and build
both happen inside `web/mobile-app` via `buildCommand`, and
`outputDirectory` points at its `dist/`. This works regardless of what
"Root Directory" a given Vercel project has configured in its dashboard
settings.

You still need to set one environment variable in the Vercel project's
dashboard (Settings → Environment Variables) for the deployed frontend to
reach a backend: **`VITE_API_URL`**, pointing at wherever the backend is
actually hosted (Vercel's serverless functions aren't a good fit for this
backend's persistent Postgres connections and JWT session model — deploy
it somewhere like Fly.io, Render, or a plain VM instead, and point
`VITE_API_URL` there). Without it, the deployed app falls back to
`http://localhost:4000`, which won't resolve for anyone but you on your
own machine.

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
```
