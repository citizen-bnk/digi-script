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

## Architecture

```
District (System Owner scope)
  └── School (Super User scope)
        ├── User (SYSTEM_OWNER / SUPER_USER / SUPERVISOR / TEACHER / PARENT / SUPPORT)
        ├── Student ──< ParentStudentLink >── User (PARENT)
        ├── Document ──> DocumentCategory
        │     └── Escalation (created when AI confidence is low)
        ├── Conversation ──< Message
        └── AuditLog (append-only)
```

Two integration points are deliberately abstracted behind interfaces so
they can be swapped for real providers without touching the ingestion
pipeline, RBAC, or audit trail:

| Interface | Dev implementation | Production target |
|---|---|---|
| `StorageService` (`src/services/storage`) | Local disk | AWS S3 (PRD 4.5) |
| `CategorizationService` (`src/services/ai`) | Keyword heuristic | LLM-backed categorization (PRD 4.4) |

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

### RBAC (PRD 4.8)

Enforced in `src/middleware/rbac.ts`:

- Row-level tenant scoping — a request scoped to a `schoolId` must match
  the caller's own school, except for `SYSTEM_OWNER` (cross-school
  oversight).
- Role groups (`ROLE_GROUPS`) gate which roles can manage schools/users,
  review documents, handle escalations, or read the audit log — matching
  the access rules in PRD 4.8 (parents see only their child, teachers see
  their class, admins see everything in their school, etc).

### Audit trail (PRD 4.10)

`src/modules/audit/audit.service.ts` is the single write path into
`audit_logs`. It is append-only by convention — no code path updates or
deletes a row — and every module (auth, documents, users, escalations)
calls into it rather than logging independently.

## What's out of scope here

Per the PRD release plan, this core system covers **MVP Phase 1**:
school registration, user/role management, document ingestion + AI
categorization, RBAC, and audit trail. Not yet implemented (later
phases in the PRD):

- WhatsApp/SMS/email channels and the multi-channel chat interface (4.7)
- Semantic search / vector embeddings (4.6)
- Mobile PWA and native apps
- Multi-school financial consolidation and government report generation
  (the `Budget` model exists as a minimal seed for this, not the full
  reporting engine described in `mvp-use-cases.md`)

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
`Password123!` (also `teacher@` and `parent@` at the same domain).

### Testing

```bash
# create a separate database for tests, e.g. digiscript_test, then:
DATABASE_URL=postgresql://.../digiscript_test npx prisma migrate deploy
npm test
```

Tests spin up the Express app in-process (via `supertest`) against the
test database and exercise registration, login, RBAC boundaries
(same-school enforcement, role checks), the full ingestion →
categorization → escalation pipeline, and audit log writes.

## Project layout

```
prisma/schema.prisma        Data model (see Architecture above)
src/config/env.ts           Validated environment config
src/middleware/             auth (JWT), rbac, validation, error handling
src/modules/<domain>/       routes + service per domain (auth, schools,
                             users, documents, escalations, audit)
src/services/storage/       StorageService interface + local-disk impl
src/services/ai/            CategorizationService interface + heuristic impl
tests/                      vitest + supertest integration tests
```
