# DigiScript — Mobile App (System A, PWA)

**System A** (the blue chat-first mobile app — see
[`docs/design/mobile-app-screens-catalog.md`](../../docs/design/mobile-app-screens-catalog.md)),
covering four roles with one shared app shell that routes to a different
home screen per role after login:

- **Parent** — chat home, a conversation thread with the AI assistant, My
  Child, Notifications, Profile.
- **Teacher** — home, My Class (read-only, class-scoped roster), a
  student's detail view, Documents (read-only), Profile.
- **Supervisor** — home, Escalations (list + detail, resolve action),
  Document upload with AI categorization + confirm, My Class, Profile.
- **Student** — a single read-only self-view (see "Known gaps" below) + Profile.

`SYSTEM_OWNER`, `SUPER_USER`, and `SUPPORT` land on an honest "this app
doesn't cover your role yet" screen rather than a broken or empty one —
those roles belong to System B (the web back-office), which doesn't exist
yet.

It's an installable Progressive Web App (PWA) — a real service worker +
manifest, not just a responsive page — built with React + Vite, talking to
the backend in the repo root.

## Known gaps (deliberate, not bugs)

Several screens show less than the design catalog's mockups because the
backend doesn't (yet) have the data behind them, and this app never shows
fabricated numbers:

- **My Child** / student detail views show only fields the `Student` model
  actually stores (name, grade, class, date of birth) — no
  Academics/Attendance/Health tabs, since there's no attendance or
  academic-record data model yet.
- **Notifications** (Parent) is a real activity feed derived from
  conversation status changes — not the channel-toggle settings screen in
  the catalog, since there's no notification-delivery system
  (push/SMS/WhatsApp) built yet.
- **Document detail** shows metadata only (category, confidence, folder
  path, "why we think this") — the backend stores a document's storage
  key, not a way to serve the file back over HTTP, so there's no "open
  file" / preview action anywhere in this app.
- **Student** is scoped to login + read-only self-view only, per a
  deliberate product decision (see root README's "Product decisions") —
  no courses, assignments, grades, or learning resources, even though the
  design deck shows a fuller student app.
- **Teacher's document access** is read-only and class-scoped (documents
  with no student attached, or attached to a student in the teacher's
  class) — matching PRD Application Spec section 7. Uploading and
  confirming categories stays Supervisor+.

## Run it

From this directory (`web/mobile-app`):

```bash
npm install
npm run dev
```

This also requires the backend running with a seeded database — from the
repo root:

```bash
npm run seed   # creates a demo school + one login per role (see root README)
npm run dev    # starts the API on :4000
```

Then open the URL Vite prints (typically `http://localhost:5173`) and log
in as any of the seeded accounts — the app routes you to the right home
screen automatically based on your role.

### Demo mode

Run the API with `DEMO_MODE=true` and the login screen becomes a role
picker: Supervisor/Nurse, Teacher, Parent, Learner, each with the two
seeded people behind it, one click to sign in. Nothing is typed. See the
root README's "Running a demo" for the seeded district and the warning
that goes with `DEMO_MODE`.

## Testing in a desktop browser

Chrome and Edge show an install icon (⊕) in the address bar once a page
meets PWA installability criteria (valid manifest, icons, registered
service worker, served over HTTPS or `localhost`). To inspect this
directly: open DevTools → **Application** tab → **Manifest** (shows parsed
manifest + any errors) and **Service Workers** (shows registration
status).

For the most realistic test, use a production build rather than the dev
server — the dev server also registers a service worker (via
`devOptions.enabled` in `vite.config.ts`) for convenience, but the actual
precaching behavior only happens in a real build:

```bash
npm run build
npm run preview   # serves dist/ at http://localhost:4173
```

## Testing on a phone

A PWA needs to be served over **HTTPS**, with the one exception of
`localhost` itself — which your phone can't reach, since `localhost` on
your phone means the phone, not your computer. So to install this on a
phone you need one of:

### Option A: same Wi-Fi network (fastest for local dev)

1. Find your computer's LAN IP (e.g. `192.168.1.23`) — `ipconfig` on
   Windows, `ifconfig` or `ip addr` on Mac/Linux.
2. Create `web/mobile-app/.env.local`:
   ```
   VITE_API_URL=http://<your-lan-ip>:4000
   ```
3. Run both servers as above (the dev server already binds to all
   interfaces via `server.host: true` in `vite.config.ts`).
4. On your phone (same Wi-Fi), open `http://<your-lan-ip>:5173`.
5. **This works despite not being HTTPS** because Chrome/Safari treat
   private-network HTTP origins somewhat permissively for local testing,
   but full installability (the actual "Add to Home Screen" prompt) is
   more reliable with HTTPS — see Option B if the install prompt doesn't
   appear.

### Option B: a public HTTPS tunnel (most reliable)

Use a tunnel so your phone reaches your computer over the internet with a
real HTTPS certificate, e.g. with [ngrok](https://ngrok.com):

```bash
# in one terminal: your normal dev servers (backend on :4000, frontend on :5173)
# in another terminal:
ngrok http 5173
```

Set `VITE_API_URL` (in `.env.local`) to a second tunnel pointed at the
backend (`ngrok http 4000`), since the frontend needs to reach the API too.
Open the `https://*.ngrok-free.app` URL ngrok gives you on your phone —
this satisfies the HTTPS requirement fully, so the install prompt
("Add to Home Screen" on iOS Safari share menu, or an automatic banner /
⋮ menu → "Install app" on Android Chrome) should appear.

### Option C: deploy it

Push `dist/` (after `npm run build`) to any static host with HTTPS
(Vercel, Netlify, Cloudflare Pages, GitHub Pages) and point
`VITE_API_URL` at a publicly reachable copy of the backend. This is the
right long-term answer; A/B above are for quick local iteration.

## Verifying installability without a phone

Chrome DevTools Protocol's `Page.getInstallabilityErrors` reports exactly
what's blocking installation, if anything. Confirmed clean during
development (the only error reported was `in-incognito`, an artifact of
testing in a fresh browser context — not a real defect):

```js
// via Playwright, or Chrome DevTools > Application > Manifest panel does this too
const cdp = await page.context().newCDPSession(page)
await cdp.send('Page.getInstallabilityErrors')
```

## Project layout

```
src/api/client.ts         Fetch wrapper for the backend + JWT storage
src/context/AuthContext   Login state, exposed via useAuth()
src/App.tsx               Routes + per-role tab sets + post-login role redirect
src/screens/              Login, and Parent screens (ChatHome, Conversation,
                          MyChild, Notifications, Profile)
src/screens/teacher/      Teacher home, class-scoped documents list
src/screens/supervisor/   Supervisor home, escalations list/detail, staff
                          conversation view, document upload
src/screens/student/      The single Student self-view screen
src/screens/shared/       ClassRosterScreen, StudentDetailScreen,
                          DocumentDetailScreen — reused across roles
src/components/           BottomNav (tabs configurable per role)
vite.config.ts            vite-plugin-pwa config: manifest + service worker
public/                   App icons (192/512/maskable/apple-touch)
```
