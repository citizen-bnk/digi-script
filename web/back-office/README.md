# DigiScript — Back Office (System B)

**System B**, the web administration portal from the Application
Specification's sections 4 and 5, and the six-panel web shell in
[`docs/design/mobile-app-screens-catalog.md`](../../docs/design/mobile-app-screens-catalog.md)
(screen 10). It serves the three roles that don't belong in the mobile app:

- **System Owner** (Kari Group) — district-wide: a multi-school overview,
  cross-school totals, district audit log, and drill-down into any one
  school.
- **Super User** (school administrator) — one school: dashboard, document
  library, escalations, user management, student records, audit log.
- **Support** — help desk: dashboard, escalations, audit log only. No user
  management and no student records.

Teachers, supervisors, parents and students who sign in are told plainly
that their role lives in the mobile app rather than being shown an empty
portal.

Desktop-first (React + Vite, no PWA — this is a back office, not something
you install on a phone). It talks to the same backend as the mobile app.

## The active school

Every school-scoped screen needs one school to work against, and the roles
get there differently. A Super User or Support user is pinned to their own
school. A System Owner has no `schoolId` at all, so they pick one — via the
sidebar switcher or by clicking a row in Multi-School — and that choice
drives every other screen. It survives a reload, and is discarded if that
school is no longer visible to the account.

## What's built

| Screen | Backed by |
| --- | --- |
| Dashboard | `GET /schools/:id/stats`, `GET /audit` |
| Multi-School Overview | `GET /schools` (System Owner only) |
| Per-school demo toggle | `PATCH /schools/:id/demo-mode` (System Owner only) |
| Document Library + upload/confirm | `GET/POST /documents`, `POST /documents/:id/confirm-category` |
| Document detail | `GET /documents/:id` |
| Escalations (list + detail + resolve) | `GET /escalations`, `POST /escalations/:id/resolve` |
| User Management (directory, add, deactivate) | `GET/POST /users`, `POST /users/:id/deactivate` |
| Student Records | `GET /students` |
| Audit Logs | `GET /audit` |

## Known gaps (deliberate, not bugs)

The Application Specification describes a great deal more than the backend
currently models. Those parts are left out rather than mocked up, so no
number on any screen is invented:

- **Budget tracking, approvals, financial consolidation, cost-center heat
  maps, cash-flow projections** — the `Budget` table in
  `prisma/schema.prisma` is still a stub with no endpoints.
- **Government compliance reports** and **PDF/Excel export** anywhere —
  no generation or export endpoint exists.
- **Knowledge Base** (the vector-index admin surface from PRD 4.6) — the
  embedding layer isn't built.
- **Reports & Analytics** — the conversation/accuracy/response-time metrics
  aren't recorded.
- **Settings, branding, integrations, notification preferences** — no
  model behind them.
- **Bulk CSV user/student import** and **password-reset email** — the spec
  lists both; neither has an endpoint. New users are created with a
  temporary password shown in the form.
- **Document preview or download** — the backend stores a storage key but
  has no endpoint that serves the file bytes back, so no screen offers to
  open a document.
- **Sortable / paginated tables** — lists are returned whole and rendered
  whole. Fine at seed scale, not at district scale.

## Run it

From this directory:

```bash
npm install
npm run dev      # http://localhost:5174
```

It needs the backend running with a seeded database — from the repo root:

```bash
npm run seed
npm run dev      # API on :4000
```

### Demo mode

With the API running under `DEMO_MODE=true`, the login screen keeps its
ordinary email/password form and adds a demo section beneath it: District
Office / Principal / Support Desk, each with the seeded people behind it,
one click to sign in. No password is shown or sent — the button carries
only the persona's email and the server issues the token. With demo mode
off, the section is absent and this is a plain login form.

A **System Owner** switches demo mode per school from the Multi-School
screen's "Demo logins" column. A school that is off contributes no demo
accounts to either app. See the root README's "Running a demo".

Point at a different API with `VITE_API_URL` in `.env.local`:

```
VITE_API_URL=http://localhost:4000
```

## Project layout

```
src/api/client.ts          Fetch wrapper + JWT storage (its own token key,
                           so it never picks up the mobile app's session)
src/context/AuthContext    Login state
src/context/SchoolContext  Resolves the active school per role
src/components/AppShell    Sidebar + per-role nav
src/components/Async.tsx   Loading/error/empty handling, pills, formatters
src/hooks/useAsync.ts      Data loading guarded against stale responses
src/screens/               One file per screen
```
