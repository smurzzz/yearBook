# Project Plan (8 weeks)

Aligned with the proposal timeline. Weeks are relative to project start. Task IDs refer to `tasks.md`.

## 1. Phases

| Phase                   | Weeks | Goal                                                              | Exit criteria                                                                                               |
| ----------------------- | ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Planning & requirements | 1–2   | Freeze scope; docs complete; design generated                     | These docs approved; open questions answered or defaulted                                                   |
| System design           | 3     | Schema, API contract, design files, accounts/infrastructure ready | Migrations apply locally; Clerk + Supabase + Vercel projects exist; API skeleton deployed; screens exported |
| Development             | 4–6   | Build all P0 features                                             | Every P0 task done; demo path works end-to-end on a real Android phone                                      |
| Testing & QA            | 7     | Fix bugs, verify rules, security pass                             | `testing/qa-checklist.md` all green; no open Sev-1/Sev-2 bugs                                               |
| Deployment & defense    | 8     | Production API, release APK, demo data, rehearsal                 | APK installs from EAS link; demo script rehearsed                                                           |

## 2. Week-by-week

| Week | Focus                                                                                                                                                      | Tasks        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1    | Finalize requirements, answer open questions, decide admin emails and school domain                                                                        | T-001, T-002 |
| 2    | Generate/refine UI design; write remaining docs; create GitHub org/repo, accounts (Clerk, Supabase, Vercel, Expo)                                          | T-003–T-006  |
| 3    | Monorepo scaffold, DB migrations + seed, API skeleton (auth wrapper, errors, health), Clerk Google setup, Expo app shell with theme + navigation + sign-in | T-010–T-029  |
| 4    | Events (admin CRUD + student list), lookups, Home shell, admin shell, Profile sheet                                                                        | T-030–T-049  |
| 5    | Upload pipeline end-to-end (compress → intents → upload → complete), My Photos grid + Viewer, edit/delete/replace                                          | T-050–T-079  |
| 6    | Review queue + undo, All photos + filters, Photo Detail, reports, notifications + cron, polish states                                                      | T-080–T-129  |
| 7    | Testing: unit/integration, manual QA, security checks, performance pass, bug fixing                                                                        | T-130–T-149  |
| 8    | Production deploy, APK, demo data, user guide, defense rehearsal                                                                                           | T-150–T-165  |

## 3. Build order inside weeks 4–6

Sign In → Events (admin) → Upload → My Photos/Viewer → Admin Review → Admin All photos/Filter → Reports → Notifications → Home polish → Profile extras → Dark mode.

## 4. Scope-cut order (if behind schedule)

1. Dark mode (FR-SYS-03)
2. Batch stack badge (FR-GAL-07)
3. Help/FAQ sheet, Delete account (FR-AUTH-08)
4. Uploader Photos sheet
5. Offline auto-retry (keep manual Retry)
6. Profile editing (FR-PROF-02)
   Never cut: server-side authz, deadline enforcement, consent, private storage, rejection reasons, removal requests.

## 5. Roles & responsibilities (fill in)

| Role                  | Person          | Responsibility                    |
| --------------------- | --------------- | --------------------------------- |
| Project lead / mobile |                 | Expo app, UX fidelity             |
| Backend / DB          |                 | API, migrations, security         |
| QA / docs             |                 | Test cases, demo data, user guide |
| Adviser               | Noel Montecillo | Reviews, approvals                |

## 6. Risks

| ID  | Risk                                                 | Likelihood | Impact | Mitigation                                                              |
| --- | ---------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------- |
| R-1 | Clerk Google SSO / redirect config issues on Android | Med        | High   | Set up in week 3 with a dev build; follow `technical/authentication.md` |
| R-2 | Push notifications fail on Android (FCM credentials) | Med        | Med    | Configure FCM v1 in EAS early (week 3); test on a real device           |
| R-3 | Supabase free-tier storage fills                     | Low        | Med    | Compression, per-event limits, soft limit `STORAGE_SOFT_LIMIT_BYTES`    |
| R-4 | Too many screens for 3 dev weeks                     | Med        | High   | Follow scope-cut order; sheets over screens                             |
| R-5 | Poor connectivity during demo                        | Med        | Med    | Pre-seed demo data; have a hotspot; rehearse offline-retry              |
| R-6 | Privacy concerns (minors)                            | Med        | High   | Consent flow, private storage, removal requests, DPO review (OQ-3)      |
| R-7 | Vercel cold starts / DB connection limits            | Low        | Low    | Pooler, `max: 1`, small bundles                                         |

## 7. Milestones

| Milestone            | Week | Demonstrable result                                                       |
| -------------------- | ---- | ------------------------------------------------------------------------- |
| M1 Foundations       | 3    | Sign in with Google → First-Time Setup → empty Home; `/health` OK         |
| M2 Events + Upload   | 5    | Admin creates event; student uploads 3 photos; they appear in My Photos   |
| M3 Review complete   | 6    | Admin approves/rejects with reasons; student sees replacement note + push |
| M4 Release candidate | 7    | All P0/P1 done, QA checklist green                                        |
| M5 Defense           | 8    | Production APK + demo script                                              |

## 8. Demo script (week 8)

1. Admin creates "Intramurals 2026" (deadline in 2 days). 2. Student signs in, uploads 3 photos with tags. 3. Student fails one upload (airplane mode) → Retry. 4. Admin reviews: approves 2, rejects 1 ("Too dark"). 5. Student gets push, opens photo, sees note, replaces. 6. Student requests removal of an approved photo. 7. Admin filters Reported → Remove photo. 8. Show deadline-passed state on a closed event. 9. Show security: student cannot reach admin route (permission denied).
