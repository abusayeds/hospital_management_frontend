# Testolife — Frontend Guide (read this first)

> **Complete handover document for the frontend.** Read it together with the backend guide
> [`../backend/README.md`](../backend/README.md) — the owner's working rules, roadmap, API, permissions and
> phase log live there (§0, §3, §7, §13, §15, §18). Everything here is specific to the Next.js app.

---

## 1. Stack

Next.js 16 (App Router, `proxy.ts`, async `params`) · React 19 (React Compiler lint rules) · TypeScript ·
Tailwind CSS v4 · shadcn/ui on **Base UI** primitives · lucide-react · TanStack Query · React Hook Form + Zod ·
sonner (toasts) · Recharts · socket.io-client · react-markdown (knowledge base preview; no raw HTML). Fonts: Inter (English/numbers) + **Hind Siliguri** (Bangla).

## 2. Run it

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3000  (the backend must run on :5000)
npm run build      # production build — must stay clean
npm run lint
npx tsc --noEmit   # typecheck (run `npx next typegen` first after adding routes)
```

| Variable (`.env.local`) | Meaning |
| --- | --- |
| `BACKEND_URL` | Where the Next.js server forwards `/api/v1/*` (server-side only), default `http://localhost:5000` |
| `NEXT_PUBLIC_API_URL` | Socket.IO connects here directly (rewrites do not carry websockets) |

Never put secrets in `NEXT_PUBLIC_*` — they are visible in the browser.

## 3. How the app is put together

```
browser → /api/v1/* on the SAME origin → next.config.ts rewrite → Express API
          (httpOnly cookies are first-party; no token ever reaches JavaScript)
proxy.ts → no session cookie on a protected path → /login?next=…
AppShell → /auth/me → role area check (403 page) → forced password change → idle sign-out (15 min)
```

| Path | Purpose |
| --- | --- |
| `src/app/(staff)/<role>/` | Role areas sharing `AppShell`. `page.tsx` = dashboard; `[...slug]/page.tsx` = placeholder generated from the nav config; real screens are normal folders that override it |
| `src/app/patient/` | Mobile-first patient area (`PatientShell`, bottom tabs) — Phase 5 |
| `src/app/print/*` | Print pages (patient card, token) |
| `src/app/verify/[code]` | **Public** page a QR code opens (genuine / not genuine) |
| `src/app/queue-display` | Waiting-room TV (`?key=` display key) |
| `src/app/chat` | **Public** patient chat (Testo Life Assistant); `?embed=1` = compact layout for the widget iframe |
| `public/widget.js` | One-line website widget: floating button + iframe of `/chat?embed=1` |
| `src/features/<feature>/` | Screens with their logic; pages stay thin |
| `src/components/ui/` | shadcn primitives (Base UI) |
| `src/components/shared/` | Our building blocks: `PageHeader`, `DataTable` (server mode), `StatusBadge`, `StatCard`, `SectionCard`, `EmptyState`, `ConfirmDialog`, skeletons, charts, `RequirePermission` |
| `src/lib/api.ts` | **The only backend client** (`apiFetch`, `apiFetchPage`), silent refresh on 401, friendly bilingual error messages (`getErrorMessage`, `notifyError`), `ApiErrorCode` list |
| `src/lib/auth.tsx` | `AuthProvider`, `useAuth()` → `user`, `can(permission)`, logout |
| `src/lib/navigation.ts` | **One config** for roles and menus; each item names the permission it needs (and `phase` for placeholders) |
| `src/lib/roadmap.ts` | The 7 phases (placeholder pages say when a feature arrives) |
| `src/lib/socket.ts` | `useLiveEvents(events, onEvent)` — refetch on server signals |
| `src/lib/permissions.ts`, `src/lib/clinical-rules.ts` | **Generated copies** of backend files (`npm run shared:export` in backend/). Never edit by hand |

## 4. Rules for writing screens

- **Data:** TanStack Query only. Errors toast automatically (QueryCache/MutationCache); opt out with
  `meta: { silent: true }` when the screen handles the error itself. Live screens call
  `useLiveEvents([...], refresh)` and invalidate queries — socket payloads are ids only.
- **Permissions:** menus filter by `can()`; screens wrap themselves in `<RequirePermission permission="…">`.
  Hiding is UX only — the API enforces everything.
- **Forms:** React Hook Form + Zod; use `useWatch` (not `watch`) with the React Compiler; the server's
  `VALIDATION_ERROR` details map to fields.
- **React Compiler lint:** no `setState` inside `useEffect` bodies. Initialise with lazy `useState(() => …)` and
  remount with a `key` when the source record changes (see `vitals-form.tsx`, `visit-workspace.tsx`).
- **Base UI:** links rendered as buttons use `render={<Link href=… />}` + `nativeButton={false}`;
  `GroupLabel` must be inside a `Group`.
- **Next.js 16:** `params` are async (`PageProps<"/route/[id]">`, `await params`). After adding routes run
  `npx next typegen` before `tsc`.
- **Wording:** patient-facing screens (landing, `/chat`, patient portal, `/verify`) must **not** say "AI".
  Staff/doctor screens show AI output only with the label **"AI-generated — verify before use"**.

## 5. Design system

- Tokens only (CSS variables in `globals.css`), no hard-coded colours. Primary teal `#0F766E`; headings
  `#0F172A`; muted `#64748B`; white cards, 1px border, soft `shadow-card`, `rounded-xl`.
- **Status colours are semantic** (dot + text, never colour alone) via `<StatusBadge status="…" />` and
  `STATUS_CONFIG`: waiting = amber · active/in consultation = blue · success/completed/ready = green ·
  cancelled/no-show/delivered = gray · danger/emergency/critical = red · booked/ordered = teal.
  Vital/lab flag colours: `LEVEL_STYLE` (vitals) and `FLAG_STYLE` (lab).
- Touch targets ≥ 44 px for primary actions (`size="lg"`/`"xl"`); visible focus rings; every list has
  search + empty state + skeleton; destructive actions use `ConfirmDialog`.
- Bilingual labels where staff read them (`label` + `labelBn`); EN/বাং toggle for config labels;
  Bangla text uses `font-bangla`.
- `/design-system` shows every component.

## 6. Screens by role (current)

| Role | Route | Screen (`src/features/…`) |
| --- | --- | --- |
| Admin | `/admin/users`, `/roles`, `/audit-logs`, `/events`, `/inbox`, `/knowledge`, **`/automation`**, `/channels`, `/departments`, `/doctors`, `/services`, `/lab-tests`, `/medicines`, `/settings`, `/system-health` | `users/`, `audit/`, `events/`, `inbox/`, `knowledge/`, `automation/`, `channels/`, `master-data/` |
| Reception | `/reception/register`, `/patients`, `/appointments`, `/queue`, `/lab-reports`, **`/inbox`** (old `/ai-alerts` redirects here) | `patients/`, `appointments/`, `queue/`, `lab/lab-lists.tsx`, `inbox/` |
| Doctor | `/doctor` (today's numbers + queue + today's visits), `/doctor/queue`, **`/doctor/visit/[appointmentId]`**, **`/doctor/patients`**, **`/doctor/patients/[id]`**, **`/doctor/lab-orders`** | `queue/doctor-queue.tsx`, `visits/`, `lab/` |
| Nurse | `/nurse` (vitals worklist) | `vitals/` |
| Lab | `/lab`, **`/lab/orders`** (work board) | `lab/lab-board.tsx`, `lab/lab-order-panel.tsx` |
| Management | `/management/live-overview`, **`/management/automation`** (read-only) | `live-overview/`, `automation/` |
| Public | `/`, `/login`, **`/chat`** (+ widget), `/queue-display`, `/verify/[code]` | `auth/`, `assistant-chat/`, `queue-display/`, `print/verify-document.tsx` |

### Clinical screens (Phase 4) — how they work
- **Nurse worklist** (`vitals/nurse-worklist.tsx`): today's waiting patients in queue order, doctor filter,
  a sheet with big inputs; flags and BMI appear while typing (shared `clinical-rules.ts`), "Save & next".
- **Doctor consultation** (`visits/visit-workspace.tsx`), three columns:
  1. patient card (allergies in red, chronic conditions, today's vitals with flags), **AI visit summary card**
     (`ai-summary-card.tsx`, staff-only label, regenerate, thumbs, "Insert into notes"), history
     (`patient-history.tsx`: previous visits → read-only sheet, lab reports with live updates, vitals trend);
  2. notes (`visit-notes.tsx`): complaints chips, HPI, examination, diagnosis, investigations (lab test search),
     advice Bangla/English, follow-up (7/14/30 days or a date), referral;
  3. prescription (`rx-editor.tsx`): medicine search (Enter adds the first match, free text allowed), dose presets
     (`1+0+1` …), timing, days or "চলবে" (continue), live Bangla instructions, allergy and duplicate-generic
     warnings, apply / save templates.
  - **Autosave** 1.2 s after typing stops (status: Saving… / Saved / Unsaved). If the server answers
    `ALLERGY_CONFLICT`, a dialog asks for a reason ("Prescribe anyway") or removes the medicine.
  - **Close visit** asks for confirmation (needs a diagnosis); closed visits show the signed record
    (`visit-record.tsx`) with **Print prescription** (opens the PDF) and **Add addendum**.
  - The queue's **Open record** button opens this page; Call next is refused while a visit is open.
- **Lab board** (`lab/lab-board.tsx`): columns Ordered → Sample collected → Processing → To verify → Ready;
  urgent first; card → sheet (`lab-order-panel.tsx`) with the action for the current step, result entry with
  live flags, four-eyes hint, send back with reason, print report, hand over.
- **Reception lab reports / doctor lab orders** (`lab/lab-lists.tsx`): searchable lists → same panel in a sheet.
- **Verify page** (`print/verify-document.tsx`): public, shows only genuine/not genuine, number, date, issuer,
  masked patient name.

### Patient assistant screens (Phase 5) — how they work
- **Web chat** (`assistant-chat/chat-window.tsx` + `rich-messages.tsx`): talks to `/api/v1/assistant/web/*`; the API
  sets an anonymous httpOnly cookie. Renders the backend's channel-neutral messages: quick-reply chips, doctor
  cards, slot chips (grouped by morning/evening), patient/appointment choices, confirm/change summary cards,
  booking success (big serial, add-to-calendar), queue progress, lab status, OTP box with resend timer,
  handover/emergency notices. Buttons of older turns are disabled. After the first message the socket reconnects so
  it joins the visitor's room and staff replies appear live. Bangla/English toggle, disclaimer with the emergency
  number, retry on network errors, fits a 360 px phone (`min-w-0`/`overflow-hidden` on bubbles — keep them).
  **Never shows the word "AI".** Types mirror `backend/src/modules/assistant/assistant.types.ts`.
- **Widget:** `<script src="https://<frontend>/widget.js" async></script>` (optional `data-color`).
- **Inbox** (`inbox/inbox-screen.tsx`): three panes, live via `inbox:updated` / `inbox:alert`; take over, reply
  (canned replies, Ctrl+Enter), hand back, resolve, tags, notes. Tool calls show as "Assistant checked …" chips.
  **Header bell** (`inbox/inbox-bell.tsx`): count badge, Web Audio beep (3× for emergencies), emergency toast.
- **Knowledge Base** (`knowledge/knowledge-screen.tsx`): server-side table, bilingual editor with markdown
  preview, publish/unpublish, version history, re-index, and **Test the assistant** (passages + scores + answer).
- **Channels** (`channels/channels-screen.tsx`): web widget snippet, WhatsApp status and webhook URL (copy), test
  message, development verification codes (hidden in production).

### Automation screens (Phase 6) — how they work
- **Automation** (`automation/automation-screen.tsx`, `/admin/automation` and read-only `/management/automation`,
  permission `automation:read`; editing needs `automation:manage`): health strip (scheduler, due next hour, failures,
  WhatsApp live / not configured, with a red banner when paused or not configured) and six tabs:
  - **Rules** (`rules-tab.tsx`): a card per rule — enable switch, trigger, category, next send, last run, 24 h counts;
    "Run now"; side panel with timings (labels in `types.ts → CONFIG_LABELS`), channel order, template, daily limit,
    quiet-hours override and **Test send to me**.
  - **Templates** (`templates-tab.tsx`): list + editor with live bn/en preview (WhatsApp-like bubble) for inside and
    outside the 24 h window, sample data per variable, save-time errors from the server, version history + restore.
  - **Outbox** (`outbox-tab.tsx`): server-side table with date/channel/status/source/rule filters, CSV download;
    detail sheet with the exact text, delivery timeline, the job's decision timeline ("why"), Retry / Cancel /
    Duplicate as test.
  - **Scheduled** (`queue-tab.tsx`): due jobs grouped by hour and rule; open one, cancel it (confirm dialog).
  - **Run log** (`runs-tab.tsx`): planner/event/dispatch runs; open a run to see failed sends around it.
  - **Settings** (`settings-tab.tsx`): pause, SMS fallback, quiet hours, numerals, budget,
    per-phone cap, duplicate window, failure threshold, opt-out explanation; **Preview world** (dry run up to +23 h).
- **Header alerts** (`automation/automation-alerts.tsx`): toasts for `automation:alert` (digest, failure alerts);
  waiting-chat and emergency alerts stay with the inbox bell.
- **Patient profile → Messages** (`patients/patient-messages.tsx` + `patient-preferences.tsx`): every message to the
  patient's phone (and their replies for inbox staff) with status chips; preference switches (reminders, follow-ups,
  lab reports, promotions, language, stop all) for `patient:update`.
- **Appointments list**: "Doctor absent" (red row) and "Confirmed by patient" chips.
- **Testing:** register yourself in Reception with your own WhatsApp number, book, and the messages arrive on your
  phone (with Meta's test number your number must be in its recipient list). There is no simulator.

## 7. Recipes

**Add a screen:** create `src/features/<x>/<x>-screen.tsx` (wrap in `RequirePermission`), add
`src/app/(staff)/<role>/<path>/page.tsx` (thin, exports `metadata`), add/adjust the menu item in
`lib/navigation.ts` (permission, remove `phase`), `npx next typegen && npx tsc --noEmit && npm run lint`.

**Add a status:** add it to `STATUS_CONFIG` in `components/shared/status-badge.tsx` with tone + bilingual label.

**Use a clinical rule in the browser:** import from `@/lib/clinical-rules` (generated). Change the rule in
`backend/src/shared/clinical-rules.ts`, run Prettier there, then `npm run shared:export`.

**New API error code:** add it to `ApiErrorCode` in `lib/api.ts` (and a friendly message in `FRIENDLY` if the
default message is not good enough).

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| `LayoutProps`/`PageProps` type errors | `npx next typegen` |
| Every API call fails | Backend not running on `BACKEND_URL`; check `/api/v1/health` |
| No live updates | `NEXT_PUBLIC_API_URL` must point at the backend (sockets bypass the rewrite) |
| Print prescription/report shows a 503 message | Backend needs `npm run pdf:setup` |
| AI summary card says "not configured" | Backend AI key missing (see backend guide §4) |
| Automation page says WhatsApp "Not configured" | Set the four `WHATSAPP_*` values in backend/.env and restart the backend (backend guide §15.7) |
| Chat says "Sorry, I can't answer right now" | Backend AI key missing or daily budget reached (backend guide §19) |
| Web chat verification code never arrives | SMS is not built — in development see Admin → Channels → development codes |
| Staff reply does not appear in the patient's web chat | `NEXT_PUBLIC_API_URL` must point at the backend (socket); the visitor's first message creates the cookie |
| Redirected to /login repeatedly | Session cookies blocked or backend `CLIENT_URL` does not match this origin |
