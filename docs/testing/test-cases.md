# Test Cases

Type: **U** unit · **I** API integration · **C** component · **M** manual on device. Priority P0/P1. Add a Status column when executing (Pass/Fail/Blocked).

## Authentication (AUTH)

| ID         | Req        | Pri | Type | Steps                                          | Expected                                         |
| ---------- | ---------- | --- | ---- | ---------------------------------------------- | ------------------------------------------------ |
| TC-AUTH-01 | FR-AUTH-02 | P0  | C    | Open Sign In; do not tick consent              | Google button disabled                           |
| TC-AUTH-02 | FR-AUTH-02 | P0  | C    | Tick consent                                   | Button enabled; link opens Privacy Notice        |
| TC-AUTH-03 | FR-AUTH-01 | P0  | M    | Tap Continue with Google with a school account | Signed in; setup sheet on first time             |
| TC-AUTH-04 | FR-AUTH-03 | P0  | M    | Submit setup with prefilled name               | `POST /me` 201; lands on Home                    |
| TC-AUTH-05 | FR-AUTH-05 | P0  | I    | Bootstrap with email in `admin_emails`         | role = admin                                     |
| TC-AUTH-06 | FR-AUTH-05 | P0  | I    | Bootstrap with other email                     | role = student; client cannot send role          |
| TC-AUTH-07 | FR-AUTH-04 | P1  | I    | Bootstrap with disallowed domain               | 403 `EMAIL_DOMAIN_NOT_ALLOWED`                   |
| TC-AUTH-08 | FR-AUTH-09 | P0  | I    | Bootstrap without `consent:true`               | 422 `CONSENT_REQUIRED`; with it consented_at set |
| TC-AUTH-09 | FR-AUTH-07 | P0  | M    | Revoke session in Clerk, trigger request       | Session expired state → Sign In                  |
| TC-AUTH-10 | FR-AUTH-06 | P0  | M    | Log out                                        | Dialog; token removed; caches cleared; Sign In   |
| TC-AUTH-11 | FR-AUTH-08 | P1  | I    | `DELETE /me` as student with photos            | Files + rows deleted; Clerk user removed         |
| TC-AUTH-12 | FR-AUTH-01 | P0  | M    | Cancel the Google flow                         | Inline cancelled message; retry works            |

## Authorization (AUTHZ)

| ID          | Req       | Pri | Type | Steps                                              | Expected                            |
| ----------- | --------- | --- | ---- | -------------------------------------------------- | ----------------------------------- |
| TC-AUTHZ-01 | NFR-01    | P0  | I    | Call each endpoint without token                   | 401                                 |
| TC-AUTHZ-02 | NFR-01    | P0  | I    | Student calls every `/admin/*` and event mutations | 403                                 |
| TC-AUTHZ-03 | NFR-01    | P0  | I    | Student GET/PATCH/DELETE another student's photo   | 404                                 |
| TC-AUTHZ-04 | FR-GAL-03 | P0  | I    | Student `GET /photos/mine` JSON                    | No `status`, no other users' photos |
| TC-AUTHZ-05 | NFR-01    | P0  | M    | Student deep-links to admin route                  | Permission denied state             |
| TC-AUTHZ-06 | NFR-01    | P0  | I    | Read storage path directly without signed URL      | Denied (private bucket)             |
| TC-AUTHZ-07 | NFR-01    | P0  | M    | Use an expired signed URL                          | 400/403 from storage                |

## Events (EVT)

| ID        | Req        | Pri | Type | Steps                                             | Expected                                                                               |
| --------- | ---------- | --- | ---- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| TC-EVT-01 | FR-EVT-01  | P0  | I    | Admin creates event                               | 201; appears in `GET /events` for students                                             |
| TC-EVT-02 | FR-EVT-01  | P0  | I    | Create with past deadline                         | 422                                                                                    |
| TC-EVT-03 | FR-EVT-02  | P0  | U/I  | Effective status for combos of is_open/deadline   | open only if both                                                                      |
| TC-EVT-04 | FR-EVT-04  | P0  | I    | Delete event with 3 photos                        | Files deleted first, rows gone                                                         |
| TC-EVT-05 | FR-EVT-04  | P0  | I    | Storage delete fails                              | Event and rows remain; error returned                                                  |
| TC-EVT-06 | FR-EVT-05  | P0  | M    | Open closed event detail                          | Upload disabled with reason                                                            |
| TC-EVT-07 | FR-HOME-02 | P0  | U    | Countdown labels: 5 d, 30 h, 20 h, 40 min, passed | "5 days left" (neutral), "1 day left" (warn), "20 hours left", "40 min left", "Closed" |
| TC-EVT-08 | FR-EVT-03  | P0  | C    | Empty events (admin)                              | "No events yet" + New event                                                            |
| TC-EVT-09 | FR-EVT-01  | P1  | U    | Form validation limits                            | name 2–80, desc ≤ 600, max 1–50                                                        |

## Upload (UP)

| ID       | Req      | Pri | Type | Steps                                           | Expected                                               |
| -------- | -------- | --- | ---- | ----------------------------------------------- | ------------------------------------------------------ |
| TC-UP-01 | FR-UP-01 | P0  | M    | Select 21 photos                                | Capped at 20                                           |
| TC-UP-02 | FR-UP-02 | P0  | C    | Submit without event/category/consent           | Disabled                                               |
| TC-UP-03 | FR-UP-04 | P0  | U/M  | Compress a 4000×3000 photo                      | Long edge 1920, ≤ 5 MB, thumb 480 px                   |
| TC-UP-04 | FR-UP-06 | P0  | I    | Intent for closed event                         | 409 `EVENT_CLOSED`                                     |
| TC-UP-05 | FR-UP-06 | P0  | I    | Intent over per-event limit                     | 409 `PHOTO_LIMIT_REACHED` with remaining               |
| TC-UP-06 | FR-UP-06 | P0  | I    | 21 files                                        | `BATCH_TOO_LARGE`                                      |
| TC-UP-07 | FR-UP-03 | P0  | I    | consent false                                   | 422 `CONSENT_REQUIRED`                                 |
| TC-UP-08 | FR-UP-06 | P0  | I    | Storage over soft limit                         | 507 `STORAGE_QUOTA_EXCEEDED`                           |
| TC-UP-09 | FR-UP-05 | P0  | M    | Upload 5 photos                                 | Row statuses progress; all Done; appear in My Photos   |
| TC-UP-10 | FR-UP-05 | P0  | M    | Airplane mode mid-upload, then restore          | Failed rows; auto/manual retry succeeds, no duplicates |
| TC-UP-11 | NFR-04   | P0  | I    | Repeat intent with same `client_id`             | Same photo rows (idempotent)                           |
| TC-UP-12 | FR-UP-05 | P0  | I    | `complete` with missing file                    | `ok:false UPLOAD_NOT_FOUND` for that item only         |
| TC-UP-13 | FR-UP-09 | P0  | I    | Replace rejected photo; complete                | Old deleted; new pending; BR-02 excludes old           |
| TC-UP-14 | FR-UP-09 | P0  | I    | Replace a non-rejected photo                    | 409 `NOT_REPLACEABLE`                                  |
| TC-UP-15 | BR-01    | P0  | I    | Intent exactly at deadline second               | Rejected when `now >= deadline`                        |
| TC-UP-16 | FR-UP-01 | P1  | M    | Deny camera permission                          | Permission card with Open settings                     |
| TC-UP-17 | privacy  | P1  | M    | Upload photo with GPS EXIF; inspect stored file | No GPS metadata                                        |
| TC-UP-18 | cron     | P1  | I    | Incomplete upload older than 24 h               | Cleaned (rows + objects)                               |

## My Photos (GAL)

| ID        | Req       | Pri | Type | Steps                              | Expected                                          |
| --------- | --------- | --- | ---- | ---------------------------------- | ------------------------------------------------- |
| TC-GAL-01 | FR-GAL-03 | P0  | M    | Open My Photos with mixed statuses | No status UI anywhere                             |
| TC-GAL-02 | FR-GAL-02 | P0  | I    | Event chip filter                  | Only that event's photos                          |
| TC-GAL-03 | FR-GAL-05 | P0  | M    | Open a rejected photo              | Only "Needs a new photo: {reason}" card + Replace |
| TC-GAL-04 | FR-GAL-06 | P0  | I    | Edit/delete approved photo         | 409 `PHOTO_LOCKED`                                |
| TC-GAL-05 | FR-GAL-04 | P0  | M    | Swipe, pinch-zoom                  | Pager and zoom work                               |
| TC-GAL-06 | FR-GAL-01 | P0  | I    | Stats                              | Photos/Events counts correct after delete         |
| TC-GAL-07 | FR-GAL-03 | P1  | M    | Scroll 200 photos                  | ≥ 55 fps, pagination works                        |

## Review (REV)

| ID        | Req       | Pri | Type | Steps                        | Expected                                            |
| --------- | --------- | --- | ---- | ---------------------------- | --------------------------------------------------- |
| TC-REV-01 | FR-REV-01 | P0  | I    | Queue order                  | Oldest pending first; excludes incomplete           |
| TC-REV-02 | FR-REV-03 | P0  | I    | Reject without reason        | 422                                                 |
| TC-REV-03 | FR-REV-03 | P0  | I    | Reject `other` without note  | 422                                                 |
| TC-REV-04 | FR-REV-03 | P0  | C    | Reject sheet: choose Other   | Label becomes Required; Confirm disabled until note |
| TC-REV-05 | FR-REV-04 | P0  | C/M  | Approve then Undo within 5 s | Photo returns; no API call made                     |
| TC-REV-06 | FR-REV-04 | P0  | M    | Approve then leave screen    | Committed once                                      |
| TC-REV-07 | BR-10     | P0  | I    | Reject                       | Notification row created; push sent if enabled      |
| TC-REV-08 | BR-10     | P0  | I    | Approve                      | No notification                                     |
| TC-REV-09 | FR-REV-06 | P0  | M    | Empty queue                  | "All caught up!" + Browse all photos                |
| TC-REV-10 | FR-REV-02 | P1  | M    | Zoomed image swipe           | Navigation suppressed while zoomed                  |
| TC-REV-11 | edge      | P1  | I    | Two admins decide same photo | Second is a no-op/409, no crash                     |

## Browse (BRW)

| ID        | Req       | Pri | Type | Steps                                                                        | Expected                       |
| --------- | --------- | --- | ---- | ---------------------------------------------------------------------------- | ------------------------------ |
| TC-BRW-01 | FR-BRW-02 | P0  | I    | Each filter alone (status, event, category, club, uploader, dates, reported) | Correct subset                 |
| TC-BRW-02 | FR-BRW-02 | P0  | I    | Combined filters                                                             | AND semantics                  |
| TC-BRW-03 | FR-BRW-01 | P0  | I    | Search by caption and by uploader name (case-insensitive, with `%` and `_`)  | Matches; no injection          |
| TC-BRW-04 | FR-BRW-01 | P0  | I    | `meta.summary`                                                               | Counts match filtered set      |
| TC-BRW-05 | FR-BRW-03 | P0  | M    | Tile with status + reported                                                  | Icons don't overlap            |
| TC-BRW-06 | FR-BRW-04 | P0  | M    | Detail footer by status                                                      | Current-status button disabled |
| TC-BRW-07 | FR-BRW-04 | P0  | I    | Change status approved → pending                                             | Reviewer fields cleared        |
| TC-BRW-08 | FR-BRW-05 | P1  | C    | No match / no requests / no matching reports                                 | Correct copy                   |

## Removal requests (REP)

| ID        | Req       | Pri | Type | Steps                                  | Expected                                              |
| --------- | --------- | --- | ---- | -------------------------------------- | ----------------------------------------------------- |
| TC-REP-01 | FR-REP-01 | P0  | I    | Student reports own photo              | 201                                                   |
| TC-REP-02 | BR-07     | P0  | I    | Report again                           | 409 `REPORT_EXISTS`                                   |
| TC-REP-03 | FR-REP-01 | P0  | I    | Report someone else's photo            | 404                                                   |
| TC-REP-04 | FR-REP-03 | P0  | I    | Resolve remove                         | Storage + photo deleted; report removed; notification |
| TC-REP-05 | FR-REP-03 | P0  | I    | Resolve dismiss                        | Photo kept; notification                              |
| TC-REP-06 | FR-REP-03 | P0  | I    | Resolve twice                          | 409 `REPORT_ALREADY_RESOLVED`                         |
| TC-REP-07 | edge      | P1  | I    | Student deletes photo with open report | Report keeps snapshot, `photo_id` null                |

## Notifications (NOT)

| ID        | Req        | Pri | Type | Steps                              | Expected                                         |
| --------- | ---------- | --- | ---- | ---------------------------------- | ------------------------------------------------ |
| TC-NOT-01 | FR-NOT-02  | P0  | M    | Reject a photo on a device         | Push arrives; tap opens viewer                   |
| TC-NOT-02 | FR-NOT-02  | P0  | I    | Cron with event within 48 h        | One reminder per student; `reminder_sent_at` set |
| TC-NOT-03 | BR-11      | P0  | I    | Run cron twice                     | No duplicates                                    |
| TC-NOT-04 | FR-PROF-03 | P1  | I    | `notify_reviews=false` then reject | Row created, push skipped                        |
| TC-NOT-05 | FR-NOT-01  | P1  | C    | Notifications sheet                | Today/Earlier groups; mark all read              |
| TC-NOT-06 | integ      | P1  | I    | Expo returns DeviceNotRegistered   | Token deleted                                    |
| TC-NOT-07 | cron       | P0  | I    | Cron without secret                | 401                                              |

## System states (SYS)

| ID        | Req       | Pri | Type | Steps                                  | Expected                            |
| --------- | --------- | --- | ---- | -------------------------------------- | ----------------------------------- |
| TC-SYS-01 | FR-SYS-01 | P0  | M    | Go offline on Home                     | Offline banner; cached data visible |
| TC-SYS-02 | FR-SYS-01 | P0  | I/M  | `MAINTENANCE_MODE=true`                | 503 → Maintenance state             |
| TC-SYS-03 | FR-SYS-01 | P0  | C    | Each state screen renders with actions | Copy per spec §10                   |
| TC-SYS-04 | NFR-06    | P1  | M    | Font scale 130 %                       | No clipping                         |
| TC-SYS-05 | NFR-06    | P1  | M    | TalkBack on tiles/badges               | Labels read                         |
| TC-SYS-06 | FR-SYS-03 | P1  | M    | Dark mode on every screen              | Readable; white on primary ≥ 4.5:1  |

## Security & privacy (SEC)

| ID        | Pri | Type | Steps                                        | Expected                          |
| --------- | --- | ---- | -------------------------------------------- | --------------------------------- |
| TC-SEC-01 | P0  | I    | SQL injection strings in `q` and body fields | No error, no data leak            |
| TC-SEC-02 | P0  | M    | Inspect app bundle/env                       | No secret keys                    |
| TC-SEC-03 | P0  | M    | Inspect logs                                 | No emails, captions, tokens, URLs |
| TC-SEC-04 | P0  | I    | Cron/maintenance endpoints without secret    | Denied                            |
| TC-SEC-05 | P0  | I    | Forge intent for closed event / over limit   | Rejected server-side              |
| TC-SEC-06 | P1  | M    | `npm audit --omit=dev`                       | No high/critical                  |
