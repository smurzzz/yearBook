# Specification (Source of Truth)

Exact behavior, limits, copy, and states. Visual styling: `ui-ux/design-system.md`. Endpoints: `technical/api.md`.

## 1. Global conventions

- **Timezone:** all times stored as UTC (`timestamptz`), displayed in `Asia/Manila` (UTC+8, no DST). Deadline inputs are interpreted as Manila time and sent as ISO with `+08:00`.
- **Date format:** `Oct 13, 2026, 11:59 PM` (events), `Oct 10, 2026, 4:20 AM` (requests), relative for ages: `6 hours ago`, `2 days ago`.
- **Countdown chip** (event deadline): remaining ≥ 24 h → `N days left` (`1 day left`); 1 h ≤ remaining < 24 h → `N hours left`; < 1 h → `N min left`; passed → `Closed`. **Warning color (amber) when remaining < 72 h**; neutral otherwise; `Closed` uses the danger style with an X icon.
- **IDs:** UUID v4, except `users.id` = Clerk user id (string like `user_2abc...`).
- **Pagination:** cursor based, page size 30 (max 60).
- **Language:** English only.

## 2. Constants (`packages/shared/src/constants.ts`)

```ts
export const LIMITS = {
  MAX_PHOTOS_PER_BATCH: 20,
  CAPTION_MAX: 200,
  EVENT_NAME_MIN: 2,
  EVENT_NAME_MAX: 80,
  EVENT_DESC_MAX: 600,
  MAX_PHOTOS_PER_EVENT_DEFAULT: 10,
  MAX_PHOTOS_PER_EVENT_MIN: 1,
  MAX_PHOTOS_PER_EVENT_MAX: 50,
  FULL_NAME_MAX: 80,
  ORIGINAL_MAX_BYTES: 5 * 1024 * 1024,
  THUMB_MAX_BYTES: 300 * 1024,
  ORIGINAL_LONG_EDGE_PX: 1920,
  ORIGINAL_JPEG_QUALITY: 0.8,
  THUMB_LONG_EDGE_PX: 480,
  THUMB_JPEG_QUALITY: 0.6,
  SIGNED_URL_TTL_S: 3600,
  UNDO_WINDOW_MS: 5000,
  PAGE_SIZE_DEFAULT: 30,
  PAGE_SIZE_MAX: 60,
  REMINDER_WINDOW_H: 48,
  COUNTDOWN_WARN_H: 72,
  INCOMPLETE_UPLOAD_TTL_H: 24,
  RECENT_UPLOADS_COUNT: 10,
  HOME_EVENTS_MAX: 10,
} as const;

export const TIMEZONE = "Asia/Manila";
export const CONSENT_VERSION = "2026-10-v1";

export const PHOTO_STATUS = ["pending", "approved", "rejected"] as const;
export const REJECTION_REASONS = [
  "blurry",
  "too_dark",
  "inappropriate",
  "duplicate",
  "wrong_event",
  "low_resolution",
  "other",
] as const;
export const REJECTION_LABELS = {
  blurry: "Blurry",
  too_dark: "Too dark",
  inappropriate: "Inappropriate",
  duplicate: "Duplicate",
  wrong_event: "Wrong event",
  low_resolution: "Low resolution",
  other: "Other",
} as const;
export const REPORT_REASONS = [
  "remove_me",
  "inappropriate",
  "wrong_tag",
  "copyright",
  "other",
] as const;
export const REPORT_LABELS = {
  remove_me: "I'm in this photo and want it removed",
  inappropriate: "Inappropriate content",
  wrong_tag: "Wrong event/tag",
  copyright: "Copyright",
  other: "Other",
} as const;
export const EVENT_COVERS = [
  "sports",
  "festival",
  "graduation",
  "science",
] as const;
export const NOTIFICATION_TYPES = [
  "photo_needs_replacement",
  "deadline_reminder",
  "report_resolved",
] as const;
export const CATEGORIES_SEED = [
  "Sports",
  "Academics",
  "Candid",
  "Graduation",
  "Clubs",
  "Culture",
  "Other",
] as const;
export const CLUBS_SEED = [
  "Drama Club",
  "Robotics Club",
  "Photography Club",
] as const;
```

## 3. Roles & visibility (summary; full table in `security/permissions-matrix.md`)

- **Student:** sees only own photos; sees all events; creates uploads; edits/deletes own photos while status is `pending` or `rejected`; requests removal of own photos.
- **Admin:** sees all photos and uploaders; reviews; manages events; resolves reports.
- Admin role is never selectable. Granted only via `admin_emails` (matched on first sign-in) or a manual SQL update.

## 4. Photo lifecycle

```
(intent created, upload_completed_at = null)  -- invisible everywhere
        │ files uploaded + POST /photos/complete
        ▼
     pending ──approve──▶ approved
        │  ▲                 │
        │  └──reset─────────┘ (admin: Back to Pending)
        └──reject(reason)──▶ rejected ──(student replaces)──▶ old photo deleted, new photo = pending
```

- Admin may move a photo between any statuses (Approve / Reject / Back to Pending).
- `rejection_reason` and `rejection_note` are set on reject and cleared on approve or reset.
- Student edit/delete allowed in `pending` and `rejected`; `approved` is locked (only request removal).
- Incomplete uploads older than 24 h are purged by the daily cron.

## 5. Business rules

| ID    | Rule                                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | Upload allowed only if event `is_open` and `now < deadline` (server check at intent time).                                                                                               |
| BR-02 | Per student per event: existing photos (completed or in-flight < 24 h, excluding those being replaced) + new ≤ `event.max_photos`.                                                       |
| BR-03 | Batch size ≤ 20; each file must be `image/jpeg`, original ≤ 5 MB, thumb ≤ 300 KB.                                                                                                        |
| BR-04 | Consent checkbox is required for every batch; server sets `consent_confirmed_at = now()`.                                                                                                |
| BR-05 | Reject requires `rejection_reason`; reason `other` requires a non-empty note.                                                                                                            |
| BR-06 | Replacement is a new submission: BR-01 applies. If the event closed, an admin must extend the deadline.                                                                                  |
| BR-07 | One open removal request per (photo, reporter).                                                                                                                                          |
| BR-08 | Removing a photo (admin resolve=remove, student delete, event delete, account delete) deletes storage files first, then the DB rows. If file deletion fails, abort and keep the DB rows. |
| BR-09 | Total stored bytes (sum of `size_bytes`) ≥ `STORAGE_SOFT_LIMIT_BYTES` blocks new upload intents with `STORAGE_QUOTA_EXCEEDED`.                                                           |
| BR-10 | Approvals are silent (no notification). Rejections notify the uploader. Report resolution notifies the reporter.                                                                         |
| BR-11 | Deadline reminder sent once per event, when the deadline is within 48 h (daily cron), to students with `notify_deadlines = true`.                                                        |
| BR-12 | Students cannot change an event on an existing photo; admins can (fix "wrong event").                                                                                                    |
| BR-13 | Deleting an event cascades to its photos (files deleted first, BR-08).                                                                                                                   |

## 6. Screens (6)

### S1. Sign In (`/(auth)/sign-in`)

- Logo, tagline **"Every moment, one yearbook."**
- Required checkbox: **"I agree to the Privacy Notice and understand photos may be published in the yearbook."** ("Privacy Notice" = link → Privacy Notice sheet.)
- Button **"Continue with Google"** (56 px high, Google logo). Disabled until the checkbox is checked.
- Note: **"Use your school Google account."**
- Flow: tap → Clerk Google SSO → `GET /me`. 404 `USER_NOT_FOUND` → First-Time Setup sheet. 200 → route by role (`student` → Home, `admin` → Review).
- Errors: SSO cancelled → inline "Sign-in was cancelled. Try again." with retry; `EMAIL_DOMAIN_NOT_ALLOWED` → "Please use your school Google account." and sign out of Clerk; network → error banner with retry.

### S2. Home (student) (`/(student)/home`)

- Header: "Hi, {firstName}" · bell (unread dot if any unread) · avatar (→ Profile sheet).
- **Upcoming deadlines** (horizontal cards): cover image (preset asset), name, countdown chip. Order: open events by deadline asc, then closed by deadline desc; max 10. Tap → Event Detail sheet.
- **Recent uploads:** last 10 own photos as plain square thumbnails. Tap → Photo Viewer. Empty: "No uploads yet. Tap Upload to add your first photos."
- Empty events: "No events yet. Check back soon."
- Pull to refresh. Skeleton while loading.

### S3. Upload (student) (`/(student)/upload`, optional param `eventId`)

Single scrolling screen, top to bottom:

1. **Photo picker.** Empty state: two large buttons **Camera** and **Gallery**. After selection: grid of thumbnails (each with an ✕ remove), counter "N of 20", and an "Add more" tile. Gallery allows multi-select (cap at 20 remaining). Camera adds one photo per capture. Tap a thumbnail → Caption sheet (≤ 200 chars).
2. **Event** (required): select field opening a picker listing **open events only**. Preselected when `eventId` param present.
3. **Category** (required): single-select chips (Sports, Academics, Candid, Graduation, Clubs, Culture, Other).
4. **Club** (optional): dropdown; prefilled with the user's club.
5. **Consent checkbox** (required): **"I have permission to share these photos and the people in them agree to be published."**
6. **Submit button:** "Submit N photos" (gradient/primary). Disabled until: ≥ 1 photo, event, category, consent.

- Inline blockers (Submit disabled, message under the Event field): event closed → "This event is closed."; limit → "You've reached the {max}-photo limit for this event." (remaining = max − existing; if selected photos > remaining → "You can add {remaining} more photo(s) to this event.").
- Permissions: camera/gallery permission prompt states (see §10).
- Submit → starts upload pipeline and opens the Upload Progress sheet.

### S4. My Photos (student) (`/(student)/my-photos`)

- Header: large avatar (Google), full name, club tag (omit if none), stats **Photos · Events** (counts of own photos / distinct events), settings icon → Profile sheet.
- Note: **"Only you and the yearbook committee can see your photos."**
- Event chip row: **All** + events the user has photos in. Selecting filters the grid (`event_id` param).
- Grid: 3 columns, square tiles (thumbnail, center-cropped), 2 px gaps, edge to edge, newest first, infinite scroll, pull to refresh. **No status icons or badges.** (P2) stack icon with number on photos whose `batch_size > 1`.
- Empty: **"No photos yet. Tap + to upload your first one."** (the Upload tab).
- Tap tile → Photo Viewer (route `/photo/[id]`, full-screen modal), with the grid's current ordering as the swipe list.

### S5. Admin Review (`/(admin)/review`)

- Header band: "YEARBOOK COMMITTEE" overline + title ("Review queue" / "All photos"), avatar (→ Admin Profile sheet).
- Segmented control: **Review (pending count badge)** | **All photos**.
- **Review mode**
  - Row: "{N} pending" label (own row) + event filter chips (All + events that have pending photos).
  - Card: photo (aspect-fit on dark background), overlays "1 of N" (top-left), "Swipe for next" hint (top-right, hidden after the first swipe), "Pinch to zoom" hint (bottom-left, hidden after first zoom).
  - Uploader row: avatar, **name**, "{Club or 'No club'} · {relative time}", link **All their photos** → Uploader Photos sheet.
  - Chips: event, category, club ("No club" if none), upload date.
  - Caption text. Chip "Consent confirmed" (shield-check icon).
  - Buttons: **Reject** (outline, danger) and **Approve** (primary).
  - Swipe left/right: previous/next. Approve: toast "Photo approved · Undo", advance. Reject: Reject Reason sheet → on confirm toast "Photo rejected · Undo", advance.
  - **Undo window 5 s.** Client holds the decision, then commits (`approve`/`reject` endpoint). Commit immediately if: the user navigates away, switches tab/mode, or the app goes to background. Undo restores the photo to its queue position and cancels the commit.
  - Empty: icon, **"All caught up!"**, "Nothing is waiting for review. New submissions show up here as soon as students upload.", button **Browse all photos**.
  - Loading: skeleton card.
- **All photos mode**
  - Search field **"Search captions or uploaders"** (debounce 300 ms) + filter button (badge = number of active facets).
  - Active filter chips (✕ to remove) + **Reset**.
  - Result line: "{shown} of {total} photos" and right-aligned "{n} pending · {n} approved · {n} rejected" (counts computed over the filtered set).
  - 3-column grid, square tiles with rounded corners; status icon top-left (check = approved, clock = pending, X = rejected, with accessible label); **Reported** badge top-right when an open removal request exists. Never overlap.
  - Tap tile → Admin Photo Detail sheet.
  - Empty (no filters): "No photos yet." Empty (filters on): **"No photos match"**, "Try a different search term or reset the filters.", **Reset filters** button. Empty with only Reported on: **"No removal requests"**, "Photos students ask to remove will appear here for the committee to resolve." Reported plus other filters and no results: **"No matching reports."**
  - Loading: 12 skeleton tiles.

### S6. Admin Events (`/(admin)/events`)

- Header: "Events", subtitle "{n} events · {n} accepting photos".
- Search "Search events". Primary button **+ New event**.
- Event card: cover thumbnail, name, "Deadline Oct 8, 2026, 11:59 PM", badge **Open** (check icon, success) or **Closed** (X icon, danger), chip "{n} photos" (completed photos in event), chevron. Order: open first (deadline asc), then closed (deadline desc). Tap → Event Form sheet (edit).
- Empty: calendar-plus icon, **"No events yet"**, "Create an event and it appears on every student's Home screen straight away.", button **New event**.

## 7. Sheets, overlays, dialogs

All sheets are bottom sheets unless noted; each has a close (✕) button and handle; sheets with forms have a sticky footer button and scroll fully above it (bottom padding ≥ footer height).

| #   | Sheet                            | Opened from                                      | Content / behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | First-Time Setup                 | After first sign-in (non-dismissible)            | Full name (prefilled from Google, required, ≤ 80), Club dropdown (optional), **Get started** → `POST /me`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | Profile                          | Avatar / settings icon                           | Avatar, name, Google email (read-only), role badge ("Student" / "Admin"), club (admin: "Yearbook Committee"). Student: edit name/club. Toggles: Dark mode (all roles); Deadline reminders and Review results (students only; admins receive no pushes, so hide them). Rows: Privacy Notice, Help, **Log out** (confirm), **Delete account** (confirm; student only).                                                                                                                                                                                                                                                                                  |
| 3   | Privacy Notice                   | Sign-in link, Profile                            | Short text from `security/privacy.md` §9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4   | Help / FAQ                       | Profile                                          | Collapsible Q&A (see §9).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 5   | Notification Permission          | First bell tap if OS permission undetermined     | "Get deadline reminders and review results" · **Allow** / **Not now**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6   | Notifications                    | Bell                                             | Grouped **Today** / **Earlier**; unread dot; **Mark all read**; empty "No notifications yet." Tap marks read and navigates (see `features/notifications.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 7   | Event Detail (student)           | Event card                                       | Cover, name, description, countdown chip, rules (max photos per student, "You've uploaded X of Y", guidelines), **Upload to this event** (→ Upload tab with `eventId`). Disabled with reason: "This event closed on {date}." / "You've reached the {max}-photo limit for this event."                                                                                                                                                                                                                                                                                                                                                                 |
| 8   | Upload Progress                  | Submit                                           | See §8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 9   | Photo Viewer (full-screen route) | Grid tile / notification / Home thumb            | Swipe between photos (horizontal pager), pinch-to-zoom, chips (event, category, club), caption, date. ⋮ menu: **Edit caption/tags**, **Delete**, **Request removal** (Edit/Delete hidden when approved). If `needs_replacement`: single card **"Needs a new photo: {reason}"** (+ note if any) with **Replace photo** button.                                                                                                                                                                                                                                                                                                                         |
| 10  | Request Removal                  | Viewer ⋮                                         | Radio list (REPORT_LABELS), optional notes (≤ 300), **Submit**; success toast "Removal request sent." If an open request exists: show "You already requested removal of this photo." and disable submit.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 11  | Admin Photo Detail               | Tile in All photos, "Review" card tap (optional) | Hero image with ✕ and ⋮; badges: status (icon+label), "Consent confirmed", "Reported" (if open report); uploader card (avatar, name, "{club} · {email}", **All their photos**); chips (event, category, club, upload date); caption; if rejected: card "REJECTION REASON SENT TO THE UPLOADER" + reason (+ note); if open report: **Removal request** block (Reporter, Reason, Requested, quoted notes). Footer: `[Pending] [Reject] [Approve]` — the button matching the current status is **disabled**. If an open report exists, footer = `[Dismiss] [Remove photo]` and status changes live in ⋮. ⋮ menu: Change status, Edit tags, Delete photo. |
| 12  | Reject Reason                    | Reject button                                    | Chips (REJECTION_LABELS), note textarea (label "Note to the uploader · Optional"; becomes "Required" when **Other** selected), helper text "Rejected photos stay in the archive with this reason attached, and the student sees a quiet note with a Replace photo button inside the photo viewer.", **Confirm reject** (disabled until a reason is chosen, and a note when Other).                                                                                                                                                                                                                                                                    |
| 13  | Filter                           | Filter button                                    | Facets: Status (All/Pending/Approved/Rejected), Event (All events + events), Category (Any + 7), Club (Any + clubs), Uploader (search field → select a student), Date range (from / to), **Reported only** toggle. Footer: **Reset** and **Show {n} photos** (live count via `GET /admin/photos?...&count_only=true`).                                                                                                                                                                                                                                                                                                                                |
| 14  | Event Form                       | + New event / event card                         | Fields: Event name* (2–80), Description* (≤ 600), Cover image* (choose one of 4 presets), Deadline* (date + time pickers, Manila time), Max photos per student (stepper 1–50, default 10), Open for submissions (toggle, default on). Footer: **Create event** / **Save changes**; edit mode also **Delete event** (red text button) → dialog. Create subtitle: "It appears on every student's Home screen the moment you save." Edit subtitle: "Saved changes reach students immediately · {n} photos linked".                                                                                                                                       |
| 15  | Edit Photo                       | Viewer ⋮ (student), Detail ⋮ → Edit tags (admin) | Caption (≤ 200), Category, Club; admin also Event. **Save**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 16  | Uploader Photos (read-only)      | "All their photos"                               | Title = uploader name, subtitle "{n} photos · read-only view"; info card (avatar, email, "{club} · submitted to {n} events"); 3-col grid with status icons; tap → Admin Photo Detail; note "Committee members can browse everything a student submitted, including photos from other events."                                                                                                                                                                                                                                                                                                                                                         |
| 17  | Caption                          | Tap thumbnail in Upload                          | Textarea ≤ 200 with counter, **Done**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

**Dialogs (centered modal):**

| Dialog               | Icon                                | Copy                                                                                                                   | Buttons                                  |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Log out              | log-out icon (neutral/primary tint) | "Log out?" / "You will need to sign in with your school Google account again."                                         | Cancel (outline) · **Log out** (primary) |
| Delete account       | alert-triangle (danger)             | "Delete your account?" / "Your profile and all photos you uploaded will be permanently deleted. This can't be undone." | Cancel · **Delete account** (danger)     |
| Delete photo         | alert-triangle                      | "Delete this photo?" / "This can't be undone."                                                                         | Cancel · **Delete** (danger)             |
| Remove photo (admin) | alert-triangle                      | "Remove this photo?" / "The uploader is notified and the photo is permanently deleted."                                | Cancel · **Remove photo** (danger)       |
| Delete event         | alert-triangle                      | "Delete {name}?" / "The {n} photos linked to this event will be permanently deleted. This can't be undone."            | Cancel · **Delete event** (danger)       |

**Toasts:** "Photo approved · Undo", "Photo rejected · Undo" (5 s); "Removal request sent."; "Event saved."; "Event created."; "Changes saved."; "Photo deleted.". Toasts appear above the tab bar, auto-dismiss after 4 s (undo toasts after 5 s).

## 8. Upload pipeline (client + server)

1. User taps **Submit** → client validates (≥1 photo, event open, category, consent, remaining quota).
2. Open Upload Progress sheet. Every photo row starts **Waiting**.
3. **Compress** (status _Compressing_), 2 at a time: resize long edge to 1920 px, JPEG q 0.8 → `original`; resize to 480 px, q 0.6 → `thumb`. Write to cache dir. If original > 5 MB after compression, lower quality to 0.6 and retry once; if still too large → row Failed "Photo too large".
4. Call `POST /photos/upload-intents` once with all compressed files' metadata (`client_id` = UUID per photo for idempotency). Server validates BR-01…BR-04, BR-09 and returns signed upload URLs for each file's original and thumb.
5. **Upload** (status _Uploading_), 3 photos concurrently: PUT original then thumb to the signed URLs with progress callbacks.
6. When both files of a photo are uploaded call `POST /photos/complete { photo_ids }` (batched; flush every 1 s or at the end). Server verifies both objects exist, sets `upload_completed_at`. Row → **Done**.
7. Any failure marks only that row **Failed** with **Retry** (re-PUT; if the signed URL expired call `POST /photos/:id/upload-url` first). **Retry all failed** retries every failed row.
8. Overall header: "Uploading {done} of {total}" with an overall progress bar. When all Done → success state: check animation, "{n} photos submitted", "They'll be reviewed by the yearbook committee.", buttons **Upload more** (reset Upload screen) and **View my photos** (→ My Photos tab, invalidates caches).
9. Offline (NetInfo `isConnected === false`): banner in the sheet **"No connection. We'll retry when you're back online."**; failed/waiting rows auto-retry on reconnect. The queue is in memory (not persisted); if the app is killed, unfinished photos must be re-selected (known limitation).
10. The user may close the sheet; uploads continue in the app process; a small progress pill is shown above the tab bar until finished.

## 9. Help / FAQ content (fixed text)

1. **How many photos can I upload?** — Up to 20 per batch, and each event has a per-student limit shown on the event.
2. **Why does a photo need replacing?** — The yearbook committee flagged an issue (for example blurry or too dark). Open the photo to see the reason and tap Replace photo.
3. **What happens after the deadline?** — Uploads close at the event deadline. Contact the committee if you need more time.
4. **Who can see my photos?** — Only you and the yearbook committee.
5. **How do I remove a photo?** — Open it, tap ⋮, then Request removal. The committee will review your request.

## 10. System states

| State                     | Trigger                                         | UI                                                                                                                  |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Loading                   | First fetch                                     | Skeletons (Home cards + thumbs, grids 12 tiles, lists 6 rows, review card)                                          |
| Empty                     | See each screen                                 | Icon + title + one-line help + optional action                                                                      |
| Offline                   | NetInfo disconnected                            | Persistent banner "You're offline. Some features aren't available."; cached data still shown                        |
| Error + retry             | Request failed (network/5xx)                    | Inline error block "Something went wrong. Please try again." + **Try again**                                        |
| Upload failed             | Per-photo failure                               | Row Failed + Retry                                                                                                  |
| Photo too large           | Compressed original > 5 MB                      | Row Failed: "Photo too large. Choose a smaller photo." (normally auto-compressed first)                             |
| Photo limit reached       | `PHOTO_LIMIT_REACHED`                           | Inline message under Event field                                                                                    |
| Storage limit reached     | `STORAGE_QUOTA_EXCEEDED`                        | Sheet/state "Storage is full. Please contact the yearbook committee."                                               |
| Deadline passed           | `EVENT_CLOSED`                                  | Disabled upload with explanation; Closed chip                                                                       |
| Session expired           | 401 `UNAUTHENTICATED` after refresh attempt     | Full-screen state "Session expired. Sign in with Google again." → Sign In                                           |
| Google sign-in cancelled  | SSO result cancelled                            | Inline retry on Sign In                                                                                             |
| Non-school email          | `EMAIL_DOMAIN_NOT_ALLOWED`                      | "Please use your school Google account."                                                                            |
| Maintenance               | 503 `MAINTENANCE_MODE`                          | Full-screen "We're doing some maintenance. Please try again soon." + Retry                                          |
| Permission denied         | 403 `FORBIDDEN` or role mismatch on admin route | Full-screen "You don't have access to this area." + button back                                                     |
| Camera/gallery permission | OS permission denied                            | Explanation card "YearbookHub needs access to your camera/photos to upload." + **Allow access** / **Open settings** |
| Not found                 | 404                                             | "This item is no longer available."                                                                                 |

## 11. Notification copy

| Type                      | Title                    | Body                                                                                                                                           | Tap target                      |
| ------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `photo_needs_replacement` | "Photo needs replacing"  | "Your photo from {event} needs a new photo: {reason}."                                                                                         | `/photo/{photoId}`              |
| `deadline_reminder`       | "{event} closes soon"    | "{event} closes in 2 days. Upload your photos before {deadline}."                                                                              | Home → Event Detail `{eventId}` |
| `report_resolved`         | "Removal request update" | Removed: "Your removal request was approved and the photo was deleted." Dismissed: "Your removal request was reviewed and the photo was kept." | Notifications sheet             |

## 12. Accessibility

- Every icon-only button has `accessibilityLabel`. Status icons have labels ("Approved", "Pending", "Rejected", "Reported").
- Minimum touch target 44×44 px. Text scales with OS settings (test at 130 %).
- Contrast ≥ 4.5:1 for text; white text on primary buttons.
