# Design Decisions (ADR log)

Format: **Context → Decision → Alternatives → Consequences.** Add new entries at the bottom; never rewrite history (supersede instead).

## DD-001 Two roles only (Student, Admin)

- **Context:** Club Officer added verification screens and bulk-upload complexity.
- **Decision:** Only `student` and `admin`. Club is an optional tag. Multi-select upload for everyone.
- **Alternatives:** Officer role with approval flow.
- **Consequences:** Fewer screens and rules; officers are not distinguishable in v1.

## DD-002 Postgres (Supabase) over MongoDB

- **Context:** Data is relational (users, events, photos, reports) and admin screens need joins/counts.
- **Decision:** Supabase Postgres + Storage.
- **Alternatives:** MongoDB + separate file store.
- **Consequences:** FK/cascade/check constraints enforce rules; one vendor for DB + files.

## DD-003 All data access through the API; RLS deny-all

- **Context:** Clerk-Supabase JWT/RLS integration is a known source of bugs in an 8-week schedule; many rules (deadline, limits, notifications) need server code anyway.
- **Decision:** The mobile app talks only to the Next.js API. The API connects to Postgres with a server connection string (bypasses RLS) and to Storage with the service key. RLS is enabled with no policies as defense in depth. The anon key is never shipped.
- **Alternatives:** Client → Supabase directly with RLS per user.
- **Consequences:** One enforcement point; API must implement every authz check (`security/permissions-matrix.md`); you can say "RLS enabled, deny-all; access mediated by authenticated API".

## DD-004 Google-only sign-in via Clerk

- **Decision:** `useSSO` with `oauth_google`. No passwords. Consent checkbox gates the button.
- **Consequences:** No reset/OTP screens. Production needs custom Google OAuth credentials in Clerk. Domain restriction via Clerk allowlist + server check.

## DD-005 Role stored in our DB, not Clerk metadata

- **Decision:** `users.role`, seeded from `admin_emails` at first sign-in; manual SQL otherwise.
- **Alternatives:** Clerk `publicMetadata.role` + JWT template.
- **Consequences:** API checks role from DB per request (1 indexed lookup); no JWT customization needed.

## DD-006 Students never see status

- **Decision:** Student DTO excludes `status`; exposes `needs_replacement` and `rejection {reason, label, note}` only when rejected.
- **Consequences:** Approvals are silent (BR-10). Students cannot tell approved from pending (accepted trade-off for a minimal UI).

## DD-007 Private bucket + signed URLs; client uploads direct to Storage

- **Decision:** API mints signed upload URLs (intents) and signed read URLs (TTL 3600 s). Client PUTs files directly.
- **Alternatives:** Proxy uploads through the API (Vercel body limit 4.5 MB, slower).
- **Consequences:** Needs the intent → upload → complete protocol and cleanup of abandoned uploads.

## DD-008 Client-side compression, originals not kept

- **Decision:** JPEG, long edge 1920 px, q 0.8, plus 480 px thumbnail.
- **Consequences:** Fits free tier; limited print quality (documented in `security/privacy.md` and `roadmap.md`).

## DD-009 Undo via delayed commit (client-side, 5 s)

- **Decision:** Hold approve/reject locally for 5 s; commit on timeout, navigation away, or app background.
- **Alternatives:** Commit immediately + server-side revert + delayed push.
- **Consequences:** Simple, no notification races. If the app is killed within 5 s the decision is lost (the photo stays pending, harmless).

## DD-010 Raw SQL with postgres.js (no ORM)

- **Decision:** Parameterized tagged-template SQL, typed rows via zod.
- **Why:** Admin filters need joins, window functions (`batch_size`), and grouped counts.
- **Consequences:** Developers must write SQL carefully; no string concatenation of user input (use `sql` fragments).

## DD-011 Pooled connection, `prepare: false`

- **Decision:** `DATABASE_URL` = Supabase transaction pooler (port 6543), `postgres(url, { prepare: false, max: 1 })` in serverless.

## DD-012 Event cover is a preset key, not an upload

- **Decision:** `cover_key ∈ {sports, festival, graduation, science}` mapped to bundled assets.
- **Consequences:** No upload flow for covers; adding a preset needs an app release.

## DD-013 Deadline semantics

- **Decision:** Effective open = `is_open AND now < deadline`; server-enforced; replacements follow the same rule (BR-06).
- **Consequences:** Admin extends deadline to let students replace late-rejected photos.

## DD-014 Notifications policy

- **Decision:** Push for rejection, deadline reminder (48 h), report resolution. No push for approvals or new submissions. Stored in `notifications` for the in-app list.

## DD-015 One daily cron job

- **Decision:** `/api/cron/daily` handles reminders and cleanup (Vercel Hobby limit: daily).

## DD-016 Pagination is cursor-based

- **Decision:** `(created_at desc, id desc)` encoded as opaque base64 cursor; page size 30.

## DD-017 Development builds, not Expo Go

- **Context:** Push on Android and native modules need a dev build (Expo Go dropped Android remote push in SDK 53).
- **Decision:** Use `eas build --profile development`.

## DD-018 Sheets via one host; Photo Viewer is a route

- **Decision:** `SheetHost` for sheets; `/photo/[id]` as full-screen modal for deep linking from notifications.

## DD-019 Theme tokens from day one

- **Decision:** All colors/sizes through `theme/tokens` so light/dark and design updates are cheap.

## DD-020 Batch stack badge is cosmetic (P2)

- **Decision:** Grid = one tile per photo; `batch_size` shown as a stack icon + number on each photo of a multi-photo batch. Optional.

## Open Questions (resolve with the human)

| ID   | Question                                                                 | Default until answered                                                   |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| OQ-1 | Does the school use Google Workspace? What domain(s)?                    | Allowlist via `ALLOWED_EMAIL_DOMAINS`; empty = allow all Google accounts |
| OQ-2 | Who are the admins (emails)?                                             | Seed `admin_emails` from env/manual SQL                                  |
| OQ-3 | Legal review of consent + Privacy Notice text (minors, parental consent) | Use drafts in `security/privacy.md`                                      |
| OQ-4 | Yearbook publication date and data retention                             | Retain until publication + 90 days, then purge (runbook)                 |
| OQ-5 | Are higher-quality originals needed for print?                           | No (v1)                                                                  |
| OQ-6 | Final design files (Figma/links)                                         | Follow screenshots and `ui-ux/design-system.md`                          |
| OQ-7 | Official app name/package id                                             | `com.yearbookhub.app`                                                    |

## Agent Decisions Log

| Date | Question | Choice | Reason |
| ---- | -------- | ------ | ------ |
| 2026-10-13 | Where does the P2 frontend mockup live, given `phases.md` planned an Expo UI in `apps/mobile`? | Integrate the supplied Vite + React clickable prototype as the `apps/web` workspace (all 6 screens, sheets, states, flows on mock data); keep the P1 Expo scaffold intact for the native build. | The design owner supplied the frontend code as the P2 deliverable. Adding it as a workspace is additive, keeps CI (`npm run lint` / `typecheck`) green across all workspaces, and the prototype mirrors `specification.md` screens, copy and rules on in-memory fixtures. |
| 2026-10-13 | Where should the P2 prototype live now that the native build is underway? | Port the entire clickable prototype into `apps/mobile` (Expo Router + React Native, design tokens 1:1 from the approved HSL variables) and remove the `apps/web` Vite workspace; its screenshots were preserved under `docs/ui-ux/screenshots/`. | The product is a mobile app; `phases.md` P2A calls for the Expo UI. Keeping a second full copy of the UI would double maintenance and risk design drift, so the RN port became the single source and the web scaffold was retired. |
