# Requirements

Priority: **P0** = must ship (MVP) · **P1** = should ship · **P2** = could ship if time allows.
Behavior and copy are in `specification.md`. Test coverage per ID: `testing/test-cases.md`.

## 1. Functional requirements

### Authentication & account (AUTH)

| ID         | Requirement                                                                                                                                                  | Pri |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-AUTH-01 | User signs in with Google through Clerk (no other method).                                                                                                   | P0  |
| FR-AUTH-02 | "Continue with Google" is disabled until the consent checkbox is checked; the "Privacy Notice" link opens the notice sheet.                                  | P0  |
| FR-AUTH-03 | After first sign-in, a First-Time Setup sheet collects full name (prefilled from Google) and optional club; not dismissible until submitted.                 | P0  |
| FR-AUTH-04 | Sign-in restricted to allowed school email domains (config); others see "Please use your school Google account."                                             | P1  |
| FR-AUTH-05 | Role comes from the database: `admin` only if the email is in `admin_emails` (or role set manually); everyone else is `student`. Users cannot choose a role. | P0  |
| FR-AUTH-06 | Log out with confirmation dialog; this device's push token is unregistered.                                                                                  | P0  |
| FR-AUTH-07 | Expired/invalid session shows "Session expired. Sign in with Google again."                                                                                  | P0  |
| FR-AUTH-08 | Delete account with confirmation; deletes the user's photos, files, and profile.                                                                             | P1  |
| FR-AUTH-09 | Consent timestamp and consent version stored at first sign-in.                                                                                               | P0  |

### Profile & settings (PROF)

| ID         | Requirement                                                                                                 | Pri |
| ---------- | ----------------------------------------------------------------------------------------------------------- | --- |
| FR-PROF-01 | Profile sheet shows avatar, name, Google email (read-only), role badge, club (admin: "Yearbook Committee"). | P0  |
| FR-PROF-02 | Student can edit full name and club.                                                                        | P1  |
| FR-PROF-03 | Toggles: dark mode (device-local), "Deadline reminders", "Review results" (server-stored).                  | P1  |
| FR-PROF-04 | Privacy Notice sheet and Help/FAQ sheet reachable from Profile.                                             | P1  |

### Home (HOME)

| ID         | Requirement                                                                                       | Pri |
| ---------- | ------------------------------------------------------------------------------------------------- | --- |
| FR-HOME-01 | Greeting, avatar (opens Profile), notification bell with unread dot (opens Notifications).        | P0  |
| FR-HOME-02 | "Upcoming deadlines": event cards with cover, name, countdown chip; tap opens Event Detail sheet. | P0  |
| FR-HOME-03 | "Recent uploads": plain thumbnails (no status) of the user's latest photos; tap opens viewer.     | P0  |
| FR-HOME-04 | Empty states: no uploads; no events.                                                              | P0  |

### Events (EVT)

| ID        | Requirement                                                                                                                                               | Pri |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-EVT-01 | Admin can create, edit, delete events (name, description, cover preset, deadline date+time, max photos per student, open toggle).                         | P0  |
| FR-EVT-02 | Event is effectively **Open** only if `is_open = true` AND `now < deadline`; otherwise **Closed**.                                                        | P0  |
| FR-EVT-03 | Admin events list shows deadline, Open/Closed badge (icon + label), submission count, search.                                                             | P0  |
| FR-EVT-04 | Delete event requires confirmation showing the linked-photo count; deletes the photos and their files.                                                    | P0  |
| FR-EVT-05 | Student Event Detail sheet shows description, countdown, rules, user's count, and an Upload button (disabled with a reason when closed or limit reached). | P0  |
| FR-EVT-06 | Created/edited events reach students within 30 s (query stale time) or immediately on pull-to-refresh.                                                    | P0  |

### Upload (UP)

| ID       | Requirement                                                                                                                                | Pri |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-UP-01 | Pick photos from camera or gallery; multi-select up to 20 per batch; remove individual photos before submit.                               | P0  |
| FR-UP-02 | Required tags: event (open events only), category. Optional: club (prefilled with the user's club), per-photo caption (max 200 chars).     | P0  |
| FR-UP-03 | Required consent checkbox before Submit; server stores `consent_confirmed_at` per photo.                                                   | P0  |
| FR-UP-04 | Client compresses each photo to JPEG (long edge 1920 px, quality 0.8) and generates a 480 px thumbnail.                                    | P0  |
| FR-UP-05 | Upload Progress sheet: per-photo status (Waiting / Compressing / Uploading / Done / Failed + Retry), overall progress, "Retry all failed". | P0  |
| FR-UP-06 | Server rejects: event closed, per-student event limit exceeded, batch > 20, consent missing, storage quota exceeded.                       | P0  |
| FR-UP-07 | Offline: "No connection. We'll retry when you're back online."; failed items auto-retry on reconnect while the sheet is open.              | P1  |
| FR-UP-08 | Success state with "Upload more" and "View my photos".                                                                                     | P0  |
| FR-UP-09 | Replace a rejected photo (new upload linked to the old one; old one deleted when the new one completes).                                   | P0  |

### My Photos (GAL)

| ID        | Requirement                                                                                                                    | Pri |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-GAL-01 | Profile-style header: avatar, name, club tag, stats "Photos · Events", settings icon (opens Profile sheet).                    | P0  |
| FR-GAL-02 | Scrollable event chip row (All + events the user has photos in).                                                               | P0  |
| FR-GAL-03 | 3-column square grid, newest first, pull to refresh, infinite scroll; **no status, tabs, counts, or badges**.                  | P0  |
| FR-GAL-04 | Photo Viewer: swipe between photos, pinch to zoom, chips, caption, date; overflow: Edit caption/tags, Delete, Request removal. | P0  |
| FR-GAL-05 | Rejected photo: show only a quiet "Needs a new photo: {reason}" card with "Replace photo".                                     | P0  |
| FR-GAL-06 | Approved photos are locked (no edit/delete); only "Request removal" remains.                                                   | P0  |
| FR-GAL-07 | Stacked-layers badge on photos from multi-photo batches.                                                                       | P2  |

### Review (REV)

| ID        | Requirement                                                                                                                      | Pri |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-REV-01 | Queue shows pending photos oldest first, one at a time, "N of M" progress, optional event filter.                                | P0  |
| FR-REV-02 | Approve / Reject buttons; swipe left/right between photos; pinch to zoom.                                                        | P0  |
| FR-REV-03 | Reject requires a preset reason; "Other" requires a note; note optional otherwise.                                               | P0  |
| FR-REV-04 | Undo toast for 5 s after approve/reject (decision committed after the window, on leaving the screen, or on app background).      | P0  |
| FR-REV-05 | Shows uploader name/club, event, category, caption, upload age, "Consent confirmed". "All their photos" opens the uploader grid. | P0  |
| FR-REV-06 | Empty state "All caught up!" with "Browse all photos". Tab badge shows pending count.                                            | P0  |

### Browse (BRW)

| ID        | Requirement                                                                                                                                                | Pri |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-BRW-01 | "All photos" grid with search (caption or uploader name), filter button, active-filter chips, result count, summary "N pending · N approved · N rejected". | P0  |
| FR-BRW-02 | Filters: status, event, category, club, uploader, date range, reported-only.                                                                               | P0  |
| FR-BRW-03 | Tile shows status icon (check/clock/X) and "Reported" badge for open removal requests; never overlapping.                                                  | P0  |
| FR-BRW-04 | Admin Photo Detail sheet: change status (Approve / Reject / Back to Pending), edit tags, delete photo, removal-request block.                              | P0  |
| FR-BRW-05 | Empty and loading (skeleton) states.                                                                                                                       | P0  |

### Removal requests (REP)

| ID        | Requirement                                                                                                      | Pri |
| --------- | ---------------------------------------------------------------------------------------------------------------- | --- |
| FR-REP-01 | Student can request removal of an own photo (reason list + optional notes). One open request per photo per user. | P0  |
| FR-REP-02 | Admin sees reported photos (filter + badge) and a "Removal request" block: reporter, reason, date, notes.        | P0  |
| FR-REP-03 | Admin resolves: **Remove photo** (confirm; photo + files deleted) or **Dismiss**. Reporter is notified.          | P0  |

### Notifications (NOT)

| ID        | Requirement                                                                                         | Pri |
| --------- | --------------------------------------------------------------------------------------------------- | --- |
| FR-NOT-01 | Notification list (Today / Earlier), unread dot, mark all read, empty state; tap opens the target.  | P1  |
| FR-NOT-02 | Push: deadline reminder (48 h before), photo needs replacing (on reject), removal request resolved. | P0  |
| FR-NOT-03 | Permission prompt sheet on first bell tap; respects the user's toggles.                             | P1  |

### System states (SYS)

| ID        | Requirement                                                                                                                                                                                                                                                                         | Pri |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-SYS-01 | Handle: offline banner, error + retry, upload failed, photo too large (auto-compress), photo limit reached, storage limit reached, deadline passed, session expired, Google sign-in cancelled, non-school email, maintenance, permission denied, camera/gallery permission prompts. | P0  |
| FR-SYS-02 | Loading skeletons for Home, grids, lists.                                                                                                                                                                                                                                           | P1  |
| FR-SYS-03 | Light and dark themes via design tokens.                                                                                                                                                                                                                                            | P1  |

## 2. Non-functional requirements

| ID     | Category        | Requirement                                                                                                                                                                               |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Security        | Server-side authz on every endpoint; private storage; signed URLs ≤ 1 h; RLS enabled (deny-all); secrets only in env.                                                                     |
| NFR-02 | Privacy         | Consent stored; removal requests; no PII in logs; aligned with the Data Privacy Act of 2012 (RA 10173). See `security/privacy.md`.                                                        |
| NFR-03 | Performance     | First grid page (30 thumbs) renders ≤ 2 s on 4G; a 10-photo batch (~6 MB) uploads ≤ 30 s at 5 Mbps; API p95 ≤ 500 ms (excluding file transfer).                                           |
| NFR-04 | Reliability     | Uploads recover by retry; one failed photo never blocks others; API calls retried with backoff (`technical/error-handling.md`).                                                           |
| NFR-05 | Usability       | Student submits in ≤ 3 taps after choosing photos (tags prefilled where possible). Touch targets ≥ 44 px.                                                                                 |
| NFR-06 | Accessibility   | WCAG AA contrast; status never by color alone; labels on icon buttons; OS font scaling supported.                                                                                         |
| NFR-07 | Compatibility   | Android 8.0+ (API 26) is the tested floor; iOS best effort.                                                                                                                               |
| NFR-08 | Maintainability | TypeScript strict; shared zod schemas; ≥ 70 % unit-test coverage of API service/business-rule code.                                                                                       |
| NFR-09 | Localization    | English only. All displayed times use `Asia/Manila`.                                                                                                                                      |
| NFR-10 | Capacity        | Designed for ≤ 2,000 students. Free tier stores ≈ 1,400 photos (soft limit 900 MB); a larger yearbook needs a paid storage plan or lower `max_photos`. See `technical/performance.md` §4. |

## 3. Constraints

- 8-week timeline, small team, free tiers (Supabase, Vercel Hobby, Clerk, Expo/EAS).
- Vercel Hobby cron runs at most once per day → a single daily cron job.
- Photos are stored compressed (1920 px); originals are not kept (known print-quality limitation).

## 4. Assumptions (verify; see Open Questions in `design-decisions.md`)

- The school issues Google accounts on a known domain, or an allowlist is acceptable.
- 1–5 admins with emails known in advance.
- School policy / Data Protection Officer covers parental consent for minors; the in-app consent is an additional layer.
- Only the uploader can request removal. People who appear in a photo but did not upload it contact the committee outside the app.

## 5. Out of scope

Club Officer role · email/password login · automated layout · photo editing · public or shared gallery · persistent offline queue · ZIP export · in-app role management · category/club management screens (seeded) · multi-school tenancy · web admin dashboard · likes/comments.
