# DigiScript — Screenshot Reference Catalog

Source: `Digi_Script_Mobile_App_Screen_Shots.pdf` (12 pages), extracted to
[`screenshots/`](./screenshots) as one PNG per page. This catalog indexes
every screen shown, grouped by role/module, so future frontend work can be
built to match pixel-for-pixel rather than re-interpreted from scratch.

## ⚠️ Two distinct visual systems in this deck

The screenshots come from **two different design systems** that don't share
a component library, palette, or navigation pattern. Before frontend work
starts, someone needs to decide whether one supersedes the other, whether
they're meant to be two separate apps (e.g. a lightweight chat-first mobile
app vs. a full school-management suite), or whether this deck is exploratory
and a third, unified system should be designed. I did not resolve this —
flagging it rather than guessing.

| | System A — "Chat-first" | System B — "School Suite" |
|---|---|---|
| Pages | 01–05 | 06–11 |
| Logo | Blue speech-bubble icon | Graduation cap icon |
| Primary color | Blue (`#0066CC`-ish) | Deep indigo/purple |
| Tagline | "Your documents. Smarter answers." | "Smarter Schools. Stronger Futures." |
| Example school | St. James Primary School | Lesedi Primary School (Zimbabwe) |
| Center of gravity | AI chat conversation with the parent/school | Role dashboards (Learners, Staff, Attendance, Reports) |
| Escalation UI | Chat-thread style, AI hands off to a human | Ticket/queue style with tabs (New/In Progress/Resolved) |

System A matches the **PRD's chat-and-document-ingestion core** (`docs/specs/PRD.md` 4.3–4.7) most directly — it's the one this repo's backend currently serves. System B matches the **Complete Application Specification's** dashboard-heavy System Owner/Super User portals and adds a role this repo doesn't model yet (**Scanning Team / Data Capturing**, pages 08–09) and a **Financial Management** suite (page 11) that goes well beyond the `Budget` stub currently in `prisma/schema.prisma`.

## Catalog by module

### 01 — Onboarding (System A)
`01-onboarding.png`
1. **Splash** — logo, tagline, "Turn your documents into your smartest employee," carousel dots, `Get Started` / `Learn more`.
2. **Sign in** — email-or-phone + password, `Forgot password?`, `Sign In`, `Continue with Google`, `Continue with Apple`, `Sign up` link.
3. **Phone verification** — country code + number, `Send Code`, note that the code arrives via SMS or WhatsApp.

Maps to PRD onboarding screens 1–3 and `POST /auth/login` — phone/OTP verification is not yet implemented in this repo (email+password only).

### 02 — Parent chat home & child profile (System A)
`02-parent-chat-home-and-child-profile.png`
1. **Chat home** ("Hello, Mary") — search conversations, "Ask a quick question" shortcut, recent-conversations list with per-item unread badges, read receipts, and per-message-type icons (chat bubble, document, payment, transport, health).
2. **Conversation thread** — parent asks "What's John's attendance this term?"; AI replies with a structured answer *and a numeric confidence badge* ("Confidence: 95%"), a follow-up question, then a **table** breakdown by month, and a "View source documents (2)" link. Bottom composer has attach + voice + send.
3. **My Child** — child header card (photo, name, grade, "View Profile"), tab bar (Overview/Academics/Attendance/Health), a 4-tile quick-overview grid (Attendance/Avg Grade/Assignments/Announcements), and a "Recent Documents" list with download icons.

Maps directly to this repo's `Conversation`/`Message` models (task in progress) and the `Student` read model for parents — the confidence badge and "View source documents" link are the UI contract the `QueryService` response shape needs to satisfy.

### 03 — Notifications & profile (System A)
`03-parent-notifications-and-profile.png`
1. **Notifications** — filter tabs (All/Unread/Mentions/Important), grouped by day (Today/Yesterday/This week), each item typed (message/document/escalation/announcement/security).
2. **Notification settings** — channel tabs (Push/Email/SMS/WhatsApp), grouped toggles: Messages & Conversations (new message, escalation update, conversation resolved), Documents (uploaded/processed/expiring), Announcements (school/urgent).
3. **Profile** — avatar card with name/email/phone/role badge, list rows (Personal Information, Security, Notification Preferences, Linked Accounts, Language & Region, Appearance), `Log Out`.

### 04 — Document pipeline & supervisor mobile (System A)
`04-document-pipeline-and-supervisor-mobile.png` (two rows of 5)

Row 1 — document ingestion, screen by screen:
1. **Upload** — Take Photo / Choose Files / Browse, recent-uploads list with per-file status (Indexed/Processing/Failed + Retry).
2. **Upload progress** — filename, size, step checklist (file uploaded → OCR → analyzing → embeddings → indexing) with a progress bar.
3. **AI Categorization** — suggested category + confidence badge + a plain-language "why we think this" bullet list, a category picker, an optional folder path, `Confirm & Continue`.
4. **Search** — query bar with type filters (All/Documents/Conversations/Students), left filter rail (Document Type/Date Range/Sensitivity), ranked results with a **match %** and highlighted snippet.
5. **Document viewer** — page thumbnails, page count, toolbar (Annotate/Highlight/Bookmark/More).

Row 2 — supervisor/escalation mobile:
1. **Escalations list** — tabs (New/In Progress/Resolved), priority-tagged cards with parent phone number and a short reason.
2. **Escalation detail** — priority badge, parent contact (call/chat icons), original AI response + confidence, "View sources" link.
3. **Respond to Parent** — recipient picker, message composer with char counter, "Attach Documents," an *internal-only* note field, `Send to Parent`.
4. **Users** — search + role/status filter chips, role-grouped counts (Admins/Supervisors/Users/Support), list with role + status badge, `+ Add User`.
5. **Settings** — grouped list: General (School Profile/Organization/Document Retention/Data & Privacy), System (Integrations/API Keys/Webhooks), Support (Audit Logs/Support Center).

This screen maps closely onto the escalation and audit modules already built in this repo — the confidence badge + "why we think this" explanation on the categorization screen is a UI requirement the `CategorizationService` interface should be extended to return (currently only `{category, confidence}`), and the internal-note-vs-parent-reply distinction on "Respond to Parent" isn't yet modeled (currently `Message.senderType` has no "internal note" variant).

### 05 — Teacher module (System A, mobile)
`05-teacher-module-mobile.png`
1. **Home** — greeting, "My Class Overview" 4-tile grid (Students/Avg Attendance/Avg Grade/Announcements), "Pending Escalations" list (priority-tagged), "My Recent Conversations."
2. **My Class** — class switcher, tabs (Students/Attendance/Grades/Behavior), student list rows with per-student attendance %.
3. **Student detail** — header (name/ID/grade/status), tabs (Overview/Documents/Attendance/Grades/Notes), quick-stat tiles, recent documents, recent interactions.
4. **Escalation (AI hand-off view)** — chat thread showing the AI's own escalation note ("Parent asked for X... escalating"), the parent's follow-up, "Escalated to: Ms. Sarah Williams," then the teacher's reply with an attached file bubble.

Note the bottom nav here is **Home / Conversations / My Class / Documents / Profile** — differs from the Application Spec's documented 5-tab set (`Chat / My Class / Documents / Notifications / Profile`); reconcile before building.

### 06 — School-leader web: role picker + dashboards (System B)
`06-school-leader-web-role-select-and-dashboards.png`
1. **Role picker** ("Welcome, School Leader — select your role to continue"): Teacher / Supervisor / Principal, each with a one-line blurb.
2. **Principal dashboard** — school overview strip (Learners/Teachers/Subjects/Term), quick-action tile grid (View Reports/Manage Staff/School Calendar/Send Notice/Attendance/More).
3. **Learners** — tabs (All Learners/Attendance/Performance), search+filter, list rows with grade + a present/absent status pill.
4. **Staff** — tabs (Teaching Staff/Support Staff), list rows with grade/subject + status pill (Active/On Leave), `+ Add Staff Member`.
5. **Attendance** — Learner/Staff toggle, date picker, 2 summary tiles (Total Learners/Attendance Rate), per-class attendance progress bars, `Mark Attendance`.
6. **Reports & Insights** — term selector, key-insight tiles, a performance-trend line chart, "Areas for Improvement" list linking to specific grade/subject issues.
7. **School Profile** — school header image/card, key-value detail block, settings list (School Information/Term Calendar/User Management/Security & Access).
8. **Notices & Tasks** — tabs (Notices/Tasks with a count badge), `Send New Notice`, notice list, task checklist.

This entire dashboard family (District/School-level oversight, staff/learner rosters, attendance marking, reports) is the **web System Owner / Super User portal** from the Application Spec — none of it is built yet; this repo currently exposes only API endpoints, no web frontend.

### 07 — Student/learner app & supervisor web (System B)
`07-student-and-supervisor-web.png`
1. **My Courses** — welcome card with overall-progress ring, course list with per-course progress bars.
2. **Assignments** — status tabs (Upcoming/In Progress/Completed), due-date cards, "Past Assignments" with grades.
3. **My Progress** — status pill ("On Track"), overall-score ring, per-subject bar chart, "Recent Achievements" badges.
4. **Learning Resources** — category filter chips, recommended-resource cards (video/note/interactive/article), a quick-links grid.
5. **Supervisor Dashboard** — 3-tile summary (Learners/Active Teachers/Needs Attention), school overview card, "Key Alerts" list (e.g. low attendance, missing reports).
6. **Teacher & Learner Overview** — Teachers/Learners toggle, searchable teacher list, "Learner Groups" list by class with counts.
7. **Notifications** — category tabs (All/Announcements/Assignments/Reports), grouped by day, `Mark All as Read`.
8. **My Profile** — avatar card, 3 stat tiles (Years Experience/Teachers Supervised/Learners Supported), account-settings list.

This is a **student-facing learning-progress app** (courses, assignments, grades, resources) that isn't described anywhere in the PRD or Application Specification — those documents only ever describe a **Parent** portal, not a student-login portal. Confirm with stakeholders whether students get their own login before building this.

### 08–09 — Scanning Team / Data Capturing (System B, new role)
`08-scanning-team-mobile-capture.png`, `09-scanning-team-mobile-batch-review.png`

This is a **sixth user role with no equivalent in the PRD's role list** (Super Admin/Admin/Supervisor/User/Support) or in this repo's `Role` enum. Two capture flows shown:

- **ID-card / certificate capture** (page 08): home screen with a capture queue (Pending/Captured/Issues counts), quick-capture shortcuts (ID Cards/Certificates/Other Docs), a live camera frame-guide scan screen, then a "Review & Upload" screen showing OCR-extracted fields (Document Type, Name, ID Number, DOB), an image-quality check, and a choice to upload now or save the batch for later.
- **Bulk school-record capture** (page 09): an "Office Admin" home with a capture overview (Documents Captured/Pending Review/Approved/Issues) and today's capture batches by type (Teacher Registration Forms/Learner Registration/School Records/Admin & Financial Docs); a batch-mode capture screen with live auto-crop/enhance/extract feedback; then a "Review & Submit" screen listing every captured document with a per-item Ready/Needs Review status and final pre-submit checks.

Backend implication: this needs a new `SCANNING_TEAM` (or similar) role, a batch/queue concept above the individual `Document` model, and OCR-extracted **structured fields** (not just category + confidence) attached to a capture — none of which exist in the current schema.

### 10–11 — Admin web dashboard, escalations, and financial management (System B)
`10-admin-web-dashboard-and-escalations.png`, `11-admin-web-financial-management.png`

Six-panel web app shell (left sidebar: Dashboard/Conversations/Escalations/Documents/Knowledge Base/Users/Students/Reports & Analytics/Audit Logs/Settings/Integrations):

- **Dashboard** — 4 KPI tiles (Total Documents/Active Conversations/Escalations/Storage Used), a conversations-over-time line chart, an escalations-by-priority donut, a "Top Query Categories" bar list, a recent-activity feed.
- **Escalations** — list+detail split view, same conversation-thread + parent-info + assignment pattern as the mobile version (page 04), plus explicit action buttons (Respond to Parent/Add Internal Note/Reassign/Mark as Resolved).
- **Documents** — tabs (All/My Uploads/Recent/Starred), category/status/date filters, a data table (Name/Category/Uploader/Status/Size/Uploaded/Actions).
- **Knowledge Base** — a distinct concept from raw documents: "Total Sources / Total Chunks / Embeddings," categories with per-category chunk counts and last-updated — i.e. the vector-index layer from PRD 4.6, exposed as its own admin surface.
- **Reports & Analytics** — conversation/AI-accuracy/response-time/satisfaction KPIs, conversations-by-channel donut (WhatsApp/Web Chat/Email/Mobile App), top-query-categories table, an escalation-summary donut.
- **Financial Management** (page 11) — a full module beyond this repo's `Budget` stub: Financial Overview (budget vs. actual, fund allocation donut, recent activity), Budget Allocation (treasury import, per-programme allocation table), Transactions (categorized ledger with reconciliation status), Bank Reconciliation (statement import, auto-match suggestions, unreconciled-items list), a "Feeding Programme" sub-module (meals planned vs. served, spend-by-category), Financial Reports (generate standard/custom/scheduled reports), and Integrations (Accounting System, Bank Feeds, Treasury System, Payroll — each with sync status).

This is the System Owner-level financial consolidation & government-reporting engine described in `docs/specs/mvp-use-cases.md` — substantially larger than the `Budget` model currently in the schema, and not part of the current backend build.

## What this means for the current repo

- Nothing here changes what's already built (auth, RBAC, document ingestion/categorization, escalations, audit trail) — those map to System A screens 02–04 and hold up well against them.
- Before any frontend code is written, resolve: (1) which visual system (A or B) is canonical, or whether both are real separate apps; (2) whether a Student login role exists; (3) whether the Scanning Team role and its batch-capture flow are in scope now or later; (4) whether Financial Management is being built now or deferred (the PRD's own release plan defers full financial consolidation past MVP Phase 1, which lines up with deferring page 11).
- Two concrete backend gaps this catalog surfaces regardless of which system is chosen: the categorization API needs a "why we think this" explanation field alongside confidence, and messages need an internal-note-vs-parent-facing distinction.
