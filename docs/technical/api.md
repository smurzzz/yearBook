# API Reference

Base URL: `{API_URL}/api/v1`. JSON over HTTPS. Types: `data-model.md` §5. Errors: `error-handling.md`.

## 1. Conventions

- **Auth:** `Authorization: Bearer <Clerk session token>` on every endpoint except `GET /health` and the cron route.
- **Success:** `200`/`201` with `{ "data": ... }`; lists: `{ "data": [...], "next_cursor": "..."|null, "meta"?: {...} }`.
- **Error:** `{ "error": { "code": "EVENT_CLOSED", "message": "...", "details": {} } }`.
- **Validation:** zod; invalid → `422 VALIDATION_ERROR` with `details.fields`.
- **Pagination:** `?limit=30&cursor=<opaque>`; limit max 60; ordering fixed per endpoint.
- **Request id:** server returns `x-request-id`.
- **Role column:** S = student, A = admin, * = both. A student calling an admin route gets `403 FORBIDDEN`. Accessing another user's photo as a student returns `404 NOT_FOUND`.

## 2. Endpoint index

| Method | Path                         | Role   | Purpose                                          |
| ------ | ---------------------------- | ------ | ------------------------------------------------ |
| GET    | `/health`                    | public | Liveness + DB check                              |
| GET    | `/me`                        | *      | Current user (404 `USER_NOT_FOUND` before setup) |
| POST   | `/me`                        | *      | First-time setup (bootstrap)                     |
| PATCH  | `/me`                        | *      | Edit name, club, notification prefs              |
| DELETE | `/me`                        | S      | Delete account                                   |
| PUT    | `/me/push-token`             | *      | Register Expo token                              |
| DELETE | `/me/push-token`             | *      | Unregister token (logout)                        |
| GET    | `/lookups`                   | *      | Categories + clubs                               |
| GET    | `/events`                    | *      | List events                                      |
| GET    | `/events/:id`                | *      | Event detail                                     |
| POST   | `/events`                    | A      | Create event                                     |
| PATCH  | `/events/:id`                | A      | Update event                                     |
| DELETE | `/events/:id`                | A      | Delete event + photos                            |
| POST   | `/photos/upload-intents`     | S      | Validate and get signed upload URLs              |
| POST   | `/photos/complete`           | S      | Confirm uploaded photos                          |
| POST   | `/photos/:id/upload-url`     | S      | Fresh signed URLs for an incomplete photo        |
| GET    | `/photos/mine`               | S      | Own photos (grid)                                |
| GET    | `/photos/:id`                | S      | Own photo detail                                 |
| PATCH  | `/photos/:id`                | S      | Edit caption/category/club                       |
| DELETE | `/photos/:id`                | S      | Delete own photo (pending/rejected)              |
| POST   | `/photos/:id/replace`        | S      | Intent for replacing a rejected photo            |
| POST   | `/photos/:id/reports`        | S      | Request removal                                  |
| GET    | `/notifications`             | *      | List own notifications                           |
| POST   | `/notifications/read-all`    | *      | Mark all read                                    |
| POST   | `/notifications/:id/read`    | *      | Mark one read                                    |
| GET    | `/admin/review/queue`        | A      | Pending photos, oldest first                     |
| GET    | `/admin/review/count`        | A      | Pending count                                    |
| GET    | `/admin/photos`              | A      | Browse/filter/search                             |
| GET    | `/admin/photos/:id`          | A      | Photo detail                                     |
| PATCH  | `/admin/photos/:id`          | A      | Edit tags (event, category, club, caption)       |
| POST   | `/admin/photos/:id/approve`  | A      | Approve                                          |
| POST   | `/admin/photos/:id/reject`   | A      | Reject with reason                               |
| POST   | `/admin/photos/:id/reset`    | A      | Back to pending                                  |
| DELETE | `/admin/photos/:id`          | A      | Delete photo                                     |
| GET    | `/admin/users/:id`           | A      | Uploader summary                                 |
| GET    | `/admin/users/:id/photos`    | A      | Uploader's photos                                |
| GET    | `/admin/reports`             | A      | List removal requests                            |
| POST   | `/admin/reports/:id/resolve` | A      | Remove or dismiss                                |
| GET    | `/api/cron/daily`            | cron   | Reminders + cleanup (outside `/v1`)              |

## 3. Details

### GET /health

`200 { "data": { "ok": true } }` — runs `select 1`. `503` if DB unreachable. When `MAINTENANCE_MODE=true` all other routes return `503 MAINTENANCE_MODE` (health stays 200).

### GET /me

`200 { data: UserDTO }`. `404 USER_NOT_FOUND` if the Clerk user has no row yet.

### POST /me

Request: `{ "full_name": "Joshua Villanueva", "club_id": "uuid|null", "consent": true, "consent_version": "2026-10-v1" }`
Server: loads Clerk user (verified primary email, image), lowercases email, checks `ALLOWED_EMAIL_DOMAINS` (if set) → else `403 EMAIL_DOMAIN_NOT_ALLOWED`; `consent` must be `true` → else `422 CONSENT_REQUIRED`; role = `admin` if email in `admin_emails` else `student`. Idempotent: if the user exists, returns `200` with the existing row.
Response `201 { data: UserDTO }`.

### PATCH /me

`{ full_name?, club_id?, notify_deadlines?, notify_reviews? }` → `200 { data: UserDTO }`. Admin `club_id` is ignored.

### DELETE /me

Student only. Deletes storage files of all own photos (batches of 100), then the user row (cascade). `204`. Clerk user deletion is performed by the API via Clerk Backend (`users.deleteUser`) after DB success.

### PUT /me/push-token · DELETE /me/push-token

`{ "expo_token": "ExponentPushToken[...]", "platform": "android" }` → `204` (upsert by token; reassign to current user). DELETE with the same body removes it.

### GET /lookups

`200 { data: { categories: Ref[], clubs: Ref[] } }` sorted by `sort_order`.

### GET /events

Query: `q?` (name ilike). Returns all events (`EventDTO[]`), ordered: effective-open first by `deadline asc`, then closed by `deadline desc`. Student responses include `my_photo_count`; admin responses include `photo_count` (completed). `meta: { total, accepting }` for the admin header.

### POST /events (admin)

`{ name, description, cover_key, deadline, max_photos, is_open }` → `201 { data: EventDTO }`. `deadline` must be in the future on create (`422`).

### PATCH /events/:id (admin)

Any subset of the above → `200 { data: EventDTO }`. Past deadlines allowed (closes the event).

### DELETE /events/:id (admin)

Deletes storage files of the event's photos, then the event (cascade). `204`. Response header-less. The UI shows the count from `photo_count` before calling.

### POST /photos/upload-intents (student)

```json
{
  "event_id": "uuid",
  "category_id": "uuid",
  "club_id": "uuid|null",
  "consent": true,
  "files": [
    {
      "client_id": "uuid",
      "caption": "",
      "width": 1920,
      "height": 1280,
      "original_bytes": 612345,
      "thumb_bytes": 41234
    }
  ]
}
```

Validation order → error code: auth → role; event exists (`NOT_FOUND`); `files.length` 1–20 (`BATCH_TOO_LARGE` / `VALIDATION_ERROR`); `consent === true` (`CONSENT_REQUIRED`); event open (`EVENT_CLOSED`); per-event limit BR-02 (`PHOTO_LIMIT_REACHED`, `details: { max, existing, remaining }`); byte caps; storage quota BR-09 (`STORAGE_QUOTA_EXCEEDED`).
Server: creates `batch_id`; inserts photo rows (`upload_completed_at = null`, `consent_confirmed_at = now()`), or returns existing rows for the same `(uploader_id, client_id)`; creates signed upload URLs for original and thumb (2 per photo).
Response `201`:

```json
{
  "data": {
    "batch_id": "uuid",
    "items": [
      {
        "client_id": "uuid",
        "photo_id": "uuid",
        "original": {
          "path": "originals/...",
          "upload_url": "https://...",
          "token": "..."
        },
        "thumb": {
          "path": "thumbs/...",
          "upload_url": "https://...",
          "token": "..."
        }
      }
    ]
  }
}
```

Client uploads with `PUT upload_url`, header `Content-Type: image/jpeg`, body = file bytes. (If using supabase-js `uploadToSignedUrl`, pass `path` + `token`.)

### POST /photos/complete (student)

`{ "photo_ids": ["uuid", ...] }` (≤ 20). For each: owned by caller, objects exist (both paths) → set `upload_completed_at = now()`; if `replaces_photo_id` set, delete the old photo (storage first). Response `200 { data: { results: [ { photo_id, ok: true } | { photo_id, ok: false, code: "UPLOAD_NOT_FOUND" } ] } }`. Partial success is normal.

### POST /photos/:id/upload-url (student)

Only for own incomplete photos. Returns fresh `{ original, thumb }` signed URLs. `409 ALREADY_COMPLETE` if completed.

### GET /photos/mine (student)

Query: `event_id?`, `limit`, `cursor`. Order `created_at desc, id desc`. `200 { data: StudentTile[], next_cursor, meta: { photos: n, events: n, event_chips: Ref[] } }` where tiles = `TileDTO`. Only completed photos of the caller.

### GET /photos/:id (student)

`200 { data: StudentPhotoDTO }`. `404` if not found or not owned. Includes signed URLs.

### PATCH /photos/:id (student)

`{ caption?, category_id?, club_id? }` → `200 { data: StudentPhotoDTO }`. `409 PHOTO_LOCKED` if approved. Event cannot be changed (BR-12).

### DELETE /photos/:id (student)

`204`. `409 PHOTO_LOCKED` if approved.

### POST /photos/:id/replace (student)

Only if the photo is the caller's and `rejected` (`409 NOT_REPLACEABLE` otherwise). Body: `{ "file": { client_id, caption?, width, height, original_bytes, thumb_bytes } }`. Applies BR-01 (event open), BR-02 excluding the replaced photo, BR-09. Creates a new incomplete photo inheriting event/category/club/batch rules (new `batch_id`), `replaces_photo_id = :id`. Response shape = single item of upload-intents (`201 { data: { batch_id, items: [item] } }`). On `complete`, the old photo and its files are deleted.

### POST /photos/:id/reports (student)

`{ "reason": "remove_me", "notes": "optional" }` → `201 { data: ReportDTO }`. Only for own completed photos (`404` otherwise). `409 REPORT_EXISTS` if an open report by this user exists. Stores `photo_snapshot`.

### GET /notifications · POST /notifications/read-all · POST /notifications/:id/read

List: `limit`, `cursor`; `meta: { unread: n }`. Read endpoints return `204`.

### GET /admin/review/queue

Query: `event_id?`, `limit` (default 20), `cursor`. Pending completed photos, `created_at asc, id asc`. Response `AdminPhotoDTO[]` (with signed `original_url` + `thumb_url`) and `meta: { total_pending }`. The client prefetches the next page when ≤ 5 items remain.

### GET /admin/review/count

`200 { data: { pending: n } }`.

### GET /admin/photos

Query params (all optional, combinable with AND): `status` (pending|approved|rejected), `event_id`, `category_id`, `club_id`, `uploader_id`, `q` (caption or uploader name, ≤ 80), `from`, `to` (ISO, on `created_at`; `to` inclusive end of day Manila), `reported=true`, `limit`, `cursor`, `count_only=true`.
Response: `{ data: AdminTileDTO[], next_cursor, meta: { total, summary: { pending, approved, rejected } } }` (totals over the **filtered** set). `count_only=true` returns `{ data: [], meta }` only (for the Filter sheet button).
Order: `created_at desc, id desc`.

### GET /admin/photos/:id

`200 { data: AdminPhotoDTO }` (incl. `open_report`).

### PATCH /admin/photos/:id

`{ event_id?, category_id?, club_id?, caption? }` → `200 { data: AdminPhotoDTO }`.

### POST /admin/photos/:id/approve · /reset

No body → `200 { data: AdminPhotoDTO }`. Sets `status`, `reviewed_by`, `reviewed_at` (reset clears reviewer fields); clears rejection fields. No notification.

### POST /admin/photos/:id/reject

`{ "reason": "too_dark", "note": "optional (required if other)" }` → `200 { data: AdminPhotoDTO }`. Creates a `photo_needs_replacement` notification for the uploader and sends push if `notify_reviews` (after response).

### DELETE /admin/photos/:id

Storage first, then DB. `204`. If an open report exists it is marked `removed` (reporter notified).

### GET /admin/users/:id · GET /admin/users/:id/photos

Summary: `{ data: { id, full_name, email, avatar_url, club, photo_count, event_count } }`. Photos: `AdminTileDTO[]` paginated (same shape as `/admin/photos`, `uploader_id` fixed).

### GET /admin/reports

Query: `status=open|resolved|all` (default open), `limit`, `cursor`. `ReportDTO[]` with `photo` tile + uploader name. Order `created_at desc`.

### POST /admin/reports/:id/resolve

`{ "action": "remove" | "dismiss", "note"?: "..." }`.

- `remove`: deletes the photo (storage first), sets report `removed`; notifies reporter ("approved…").
- `dismiss`: sets report `dismissed`; notifies reporter ("kept").
  `200 { data: ReportDTO }`. `409 REPORT_ALREADY_RESOLVED`.

### GET /api/cron/daily

Header `Authorization: Bearer ${CRON_SECRET}` else `401`. Runs reminders (BR-11) and cleanup (incomplete > 24 h: delete storage objects if present, then rows). Returns `{ reminders_sent, events_notified, cleaned }`.

## 4. Status code summary

`200` ok · `201` created · `204` no content · `401` unauthenticated · `403` forbidden / domain / consent policy · `404` not found (also for foreign resources) · `409` state conflicts · `413` too large · `422` validation · `429` rate limited · `500` internal · `503` maintenance/DB down · `507` storage quota.

## 5. Postman

The collection lives at [`postman_collection.json`](./postman_collection.json) (v2.1, every endpoint above with example bodies). Environment vars: `API_URL` (`{API_ROOT}/api/v1`), `API_ROOT`, `TOKEN` (copy a fresh Clerk session token from the app's debug screen in dev builds only) and `CRON_SECRET`.
