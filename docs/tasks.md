# Tasks (Backlog)

Format: `- [ ] **ID** Title — Deps — Priority — Size (S ≤ 2 h, M ≤ ½ day, L ≤ 1–2 days) — Done when …`
Pick the first unchecked task whose dependencies are checked. Tick the box in the same PR.

## E0 Planning & setup

- [ ] **T-001** Confirm open questions OQ-1…OQ-7 with the adviser/school — — P0 — S — answers recorded in `design-decisions.md`
- [ ] **T-002** Decide admin emails and school email domain(s) — T-001 — P0 — S — values ready for env/seed
- [ ] **T-003** Create GitHub repo, branch protection on `main`, copy `.github/workflows` from docs — — P0 — S — CI file present
- [ ] **T-004** Create Clerk app, enable Google, add Expo/Native application — — P0 — M — publishable + secret keys stored
- [ ] **T-005** Create Supabase project (region near PH), get pooled `DATABASE_URL`, service key — — P0 — S — secrets stored
- [ ] **T-006** Create Vercel project (root `apps/api`), Expo project + EAS (`eas init`), FCM v1 credentials for push — — P0 — M — projects exist

## E1 Scaffold & foundation

- [ ] **T-010** Scaffold npm-workspaces monorepo (`apps/mobile`, `apps/api`, `packages/shared`), TS strict, ESLint, Prettier — T-003 — P0 — M — `npm run lint && npm run typecheck` pass
- [ ] **T-011** `packages/shared`: constants (spec §2), zod schemas for all DTOs/requests (`technical/api.md`) — T-010 — P0 — M — exported and unit tested
- [ ] **T-012** Supabase migrations from `technical/database.md` + `seed.sql` — T-005 — P0 — M — `supabase db reset` succeeds; seeds categories, clubs
- [ ] **T-013** API lib: `env.ts` (zod-validated env), `db.ts`, `errors.ts`, `withRoute.ts`, `logger.ts`, `pagination.ts`, `time.ts` — T-010 — P0 — M — unit tests for errors and pagination
- [ ] **T-014** API auth: `middleware.ts` (clerkMiddleware), `requireUser()`, role loading, `requireAdmin()` — T-013, T-004 — P0 — M — 401/403 tests
- [ ] **T-015** `GET /health`, deploy API to Vercel — T-013 — P0 — S — returns `{ok:true}` in production
- [ ] **T-016** Storage lib: bucket bootstrap, signed upload/read URL helpers, batch delete — T-012 — P0 — M — integration test with mocked client

## E2 Authentication & accounts

- [ ] **T-020** Mobile shell: expo-router layouts, providers (Clerk, QueryClient, SheetHost, Toast), theme tokens, fonts — T-010 — P0 — L — navigates between placeholder screens
- [ ] **T-021** Sign In screen with consent gate + Google SSO (`useSSO`) — T-020, T-004 — P0 — M — real Google sign-in on an Android dev build
- [ ] **T-022** API `GET /me`, `POST /me` (bootstrap: domain check, admin_emails role, consent) — T-014 — P0 — M — tests: domain blocked, admin matched, duplicate create idempotent
- [ ] **T-023** First-Time Setup sheet + role routing guard (student/admin groups, permission-denied state) — T-021, T-022 — P0 — M — admin lands on Review, student on Home
- [ ] **T-024** API client with token attach, error envelope parsing, 401 → session-expired state — T-020 — P0 — M — unit tests
- [ ] **T-025** Profile sheet (read-only part), Log out dialog (+ push token delete) — T-023 — P0 — M — logging out returns to Sign In
- [ ] **T-026** `PATCH /me`, `PUT/DELETE /me/push-token`, `DELETE /me` + edit profile UI + Delete account flow — T-022, T-025 — P1 — M — account deletion removes photos + files
- [ ] **T-027** Privacy Notice and Help sheets (static content) — T-020 — P1 — S — text per spec/privacy

## E3 Events & lookups

- [ ] **T-030** API `GET /lookups` — T-014 — P0 — S — categories, clubs sorted
- [ ] **T-031** API events: `GET /events`, `GET /events/:id`, `POST`, `PATCH`, `DELETE` (storage-first delete) — T-016, T-014 — P0 — L — tests for BR-13, effective status, counts
- [ ] **T-032** Admin Events screen + Event Form sheet + Delete event dialog — T-031, T-020 — P0 — L — create/edit/delete works; empty state
- [ ] **T-033** Student Home: greeting, event cards with countdown chip, Event Detail sheet — T-031 — P0 — M — countdown thresholds per spec §1

## E4 Upload

- [ ] **T-040** API `POST /photos/upload-intents` (BR-01…BR-04, BR-09, idempotent by `client_id`) — T-016, T-031 — P0 — L — tests for every rejection code
- [ ] **T-041** API `POST /photos/complete`, `POST /photos/:id/upload-url` — T-040 — P0 — M — verifies objects exist; handles partial failure per item
- [ ] **T-042** Mobile image pipeline (`lib/image.ts`): resize/compress original + thumb, size fallback — T-020 — P0 — M — unit test with fixtures; sizes within limits
- [ ] **T-043** Upload screen UI: picker (camera/gallery, permissions), grid, Caption sheet, event/category/club fields, consent, Submit gating — T-033, T-030 — P0 — L — matches spec S3
- [ ] **T-044** Upload queue store + Upload Progress sheet (statuses, concurrency 3, progress, Retry, Retry all, success state, progress pill) — T-041, T-042, T-043 — P0 — L — manual test with airplane mode
- [ ] **T-045** Offline detection (NetInfo), banner, auto-retry on reconnect — T-044 — P1 — M — reconnect resumes failed rows

## E5 My Photos & Viewer

- [ ] **T-050** API `GET /photos/mine` (cursor, `event_id`, stats), `GET /photos/:id`, student DTO (no status) — T-041 — P0 — M — test: student never receives status or others' photos
- [ ] **T-051** My Photos screen: header stats, chips, 3-col grid, infinite scroll, empty state — T-050 — P0 — L — matches spec S4
- [ ] **T-052** Photo Viewer route: pager, pinch-zoom, chips, caption, ⋮ menu — T-051 — P0 — L — swipe between photos
- [ ] **T-053** API `PATCH /photos/:id`, `DELETE /photos/:id` (pending/rejected only) + Edit Photo sheet + Delete dialog — T-050 — P0 — M — approved is locked (409 `PHOTO_LOCKED`)
- [ ] **T-054** API `POST /photos/:id/replace` + Replace flow reuse of upload pipeline; old photo deleted on complete — T-041, T-053 — P0 — M — test BR-02 excludes replaced photo
- [ ] **T-055** "Needs a new photo" card in viewer — T-052 — P0 — S — only for rejected photos
- [ ] **T-056** Home: Recent uploads row + empty states + skeletons — T-050, T-033 — P0 — S

## E6 Review

- [ ] **T-060** API `GET /admin/review/queue`, `GET /admin/review/count` — T-014, T-041 — P0 — M — oldest first; excludes incomplete
- [ ] **T-061** API `POST /admin/photos/:id/approve|reject|reset` with BR-05, notifications on reject — T-060 — P0 — M — tests incl. reason/note rules
- [ ] **T-062** Admin Review screen (Review mode): card, swipe, zoom, event chips, progress, empty state, tab badge — T-060 — P0 — L
- [ ] **T-063** Reject Reason sheet + Undo toast (delayed commit, flush on blur/background) — T-061, T-062 — P0 — L — undo restores position

## E7 Browse

- [ ] **T-070** API `GET /admin/photos` (filters, search, summary counts, `count_only`, `reported`) — T-061 — P0 — L — tests for each filter + combos
- [ ] **T-071** All photos mode: search, filter chips, grid with status icon + Reported badge, states — T-070 — P0 — L
- [ ] **T-072** Filter sheet (all facets, live count) — T-070 — P0 — M
- [ ] **T-073** Admin Photo Detail sheet (status actions with disabled current, ⋮ menu, edit tags, delete) + API `PATCH/DELETE /admin/photos/:id` — T-070 — P0 — L
- [ ] **T-074** Uploader Photos sheet + API `GET /admin/users/:id`, `/photos` — T-070 — P1 — M

## E8 Reports

- [ ] **T-080** API `POST /photos/:id/reports` (BR-07), `GET /admin/reports`, `POST /admin/reports/:id/resolve` (remove storage-first / dismiss) + notification — T-073 — P0 — L
- [ ] **T-081** Request Removal sheet (student) — T-052, T-080 — P0 — M
- [ ] **T-082** Removal request block + Dismiss/Remove footer + Remove photo dialog — T-073, T-080 — P0 — M

## E9 Notifications

- [ ] **T-090** Push lib (Expo Push send, batching 100, handle `DeviceNotRegistered`) + `notifications` service — T-016 — P0 — M
- [ ] **T-091** API `GET /notifications`, read endpoints — T-090 — P1 — S
- [ ] **T-092** Mobile push registration (permissions sheet, token upload, tap handling → deep links) — T-090, T-025 — P0 — L — works on a real device with a dev build
- [ ] **T-093** Notifications sheet + bell unread dot — T-091 — P1 — M
- [ ] **T-094** Cron `/api/cron/daily`: reminders (BR-11) + incomplete-upload cleanup; `vercel.json` cron — T-090 — P0 — M — idempotent; secured by `CRON_SECRET`
- [ ] **T-095** Profile toggles (deadline reminders, review results) honored by senders — T-092 — P1 — S

## E10 Polish & states

- [ ] **T-100** System states (offline banner, error+retry, maintenance, permission denied, session expired, storage full, deadline passed) — T-024 — P0 — M — each reachable in tests
- [ ] **T-101** Skeleton loaders for Home, grids, lists, review card — T-056, T-071 — P1 — S
- [ ] **T-102** Dark mode via tokens — T-020 — P1 — M
- [ ] **T-103** Accessibility pass (labels, contrast, touch targets, font scale) — T-062, T-071 — P1 — M
- [ ] **T-104** Batch stack badge (`batch_size`) — T-051, T-071 — P2 — S

## E11 Testing & QA

- [ ] **T-130** API unit/integration tests reach ≥ 70 % on services — T-094 — P0 — L
- [ ] **T-131** Mobile unit tests (image pipeline, queue store, formatters, countdown) — T-044 — P1 — M
- [ ] **T-132** Execute `testing/test-cases.md` on a real Android device; log bugs — T-130 — P0 — L
- [ ] **T-133** Security checks per `security/security.md` checklist (authz fuzz, signed URL expiry, private bucket) — T-130 — P0 — M
- [ ] **T-134** Performance checks per `technical/performance.md` — T-132 — P1 — S
- [ ] **T-135** Fix all Sev-1/Sev-2 bugs — T-132 — P0 — L

## E12 Deployment & delivery

- [ ] **T-150** Production Supabase + Vercel env vars + migrations applied via workflow — T-135 — P0 — M
- [ ] **T-151** EAS production-like APK (`preview` profile) + install test on 2 devices — T-150 — P0 — M
- [ ] **T-152** Seed demo data (1 admin, 2 students, 3 events, ~20 photos, 1 rejected, 1 reported) — T-150 — P0 — M
- [ ] **T-153** User guide (students + admins), final report diagrams (use-case, ERD, flow) — T-151 — P0 — M
- [ ] **T-154** Defense rehearsal using the demo script (`plan.md` §8) — T-152 — P0 — S
