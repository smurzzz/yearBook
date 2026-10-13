# Permissions Matrix

✔ allowed · ✘ denied (403) · own = only resources owned by the caller (others → 404) · — not applicable. Enforced server-side (`technical/authorization.md`).

## 1. By capability

| Capability                                    | Anonymous        | Student                          | Admin                       |
| --------------------------------------------- | ---------------- | -------------------------------- | --------------------------- |
| Health check                                  | ✔                | ✔                                | ✔                           |
| Read own profile / update name, club, prefs   | ✘ (401)          | ✔ own                            | ✔ own                       |
| Delete own account                            | ✘                | ✔                                | ✘ (SQL only)                |
| Register push token                           | ✘                | ✔ own                            | ✔ own                       |
| Read lookups (categories, clubs)              | ✘                | ✔                                | ✔                           |
| List/read events                              | ✘                | ✔                                | ✔                           |
| Create/update/delete events                   | ✘                | ✘                                | ✔                           |
| Create upload intent / complete / replace     | ✘                | ✔ own, event open, within limits | ✘                           |
| List/read own photos (student DTO, no status) | ✘                | ✔ own                            | —                           |
| Edit/delete photo                             | ✘                | ✔ own, status pending/rejected   | ✔ any (admin routes)        |
| Read any photo (admin DTO)                    | ✘                | ✘                                | ✔                           |
| Approve / reject / reset photo                | ✘                | ✘                                | ✔                           |
| Edit tags incl. event on any photo            | ✘                | ✘                                | ✔                           |
| Browse/filter/search all photos               | ✘                | ✘                                | ✔                           |
| View uploader summary/photos                  | ✘                | ✘                                | ✔                           |
| File removal request                          | ✘                | ✔ own photo, one open per photo  | ✘                           |
| List/resolve removal requests                 | ✘                | ✘                                | ✔                           |
| Read/mark own notifications                   | ✘                | ✔ own                            | ✔ own                       |
| Trigger cron                                  | ✘ (needs secret) | ✘                                | ✘                           |
| Change any user's role                        | ✘                | ✘                                | ✘ (SQL/`admin_emails` only) |

## 2. By endpoint (summary)

| Endpoint group                                             | Student | Admin           |
| ---------------------------------------------------------- | ------- | --------------- |
| `/me*`, `/lookups`, `/notifications*`                      | ✔       | ✔               |
| `GET /events*`                                             | ✔       | ✔               |
| `POST/PATCH/DELETE /events*`                               | ✘       | ✔               |
| `/photos/*` (upload, mine, edit, delete, replace, reports) | ✔ own   | ✘ (403)         |
| `/admin/*`                                                 | ✘       | ✔               |
| `/api/cron/*`                                              | ✘       | ✘ (secret only) |
| `DELETE /me`: students only.                               |

## 3. Data visibility by DTO

| Field                  | Student DTO                                         | Admin DTO |
| ---------------------- | --------------------------------------------------- | --------- |
| `status`               | **never**                                           | ✔         |
| `rejection`            | only when rejected (own photo): reason, label, note | ✔         |
| Uploader name/email    | —                                                   | ✔         |
| Other users' photos    | never                                               | ✔         |
| `consent_confirmed_at` | —                                                   | ✔         |
| Reports                | own request outcome via notification only           | ✔ full    |

## 4. State-dependent rules

| Rule                                          | Enforcement                                |
| --------------------------------------------- | ------------------------------------------ |
| Upload only when event open and within limits | Server at intent/replace                   |
| Edit/delete only in pending/rejected          | Server (`PHOTO_LOCKED`)                    |
| Replace only when rejected                    | Server (`NOT_REPLACEABLE`)                 |
| One open report per (photo, reporter)         | DB unique index + server (`REPORT_EXISTS`) |
| Reject needs reason (+ note for Other)        | DB check + server (422)                    |

## 5. Test mapping

TC-AUTHZ-01…07, TC-GAL-04, TC-REP-02/03, TC-UP-04/05/14, TC-REV-02/03.
