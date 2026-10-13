# Feature: Notifications

**Requirements:** FR-NOT-01…03, BR-10, BR-11 · **Tech:** `technical/integrations.md` §3, `technical/api.md`

## Types

| Type                                        | Trigger                                                | Recipient    | Respects toggle    |
| ------------------------------------------- | ------------------------------------------------------ | ------------ | ------------------ |
| `photo_needs_replacement`                   | Admin rejects a photo                                  | Uploader     | `notify_reviews`   |
| `deadline_reminder`                         | Daily cron: event deadline within 48 h, once per event | All students | `notify_deadlines` |
| `report_resolved`                           | Admin removes/dismisses a request                      | Reporter     | `notify_reviews`   |
| Approvals and new submissions never notify. |

## Delivery

1. Service inserts a `notifications` row (always, even if push is disabled) with `data` ids.
2. After the response (`after()`), if the toggle is on and tokens exist: send Expo push (batches ≤ 100), remove `DeviceNotRegistered` tokens.
3. Copy per spec §11.

## Mobile

- On first bell tap, if OS permission is undetermined → Notification Permission sheet (**Allow** / **Not now**). **Allow** → request OS permission → get Expo token → `PUT /me/push-token`.
- If OS permission denied: the bell opens the list; Profile toggles show helper "Enable notifications in system settings".
- Android: create channel `default` (importance high) at startup.
- Foreground: show an in-app toast banner and invalidate `notifications` + `my photos` queries.
- Tap on push or list item: mark read, navigate (`photo_id` → `/photo/{id}`; `event_id` → Home with Event Detail; `report_id` → open Notifications sheet).
- Bell unread dot = `meta.unread > 0`.

## Notifications sheet

Grouped Today / Earlier (Manila time), unread dot, **Mark all read** (`POST /notifications/read-all`), empty "No notifications yet.", pull to refresh, paginated.

## Cron

`/api/cron/daily` 01:00 UTC. Query: events where `now() < deadline <= now() + interval '48 hours'` and `is_open` and `reminder_sent_at is null`. For each: insert one notification per student with `notify_deadlines`, send push, set `reminder_sent_at`. Idempotent (re-run safe).

## Acceptance

Rejecting a photo creates a row and push (device test) · toggle off suppresses push but keeps the row · reminder sent once per event · invalid tokens are pruned · tapping push opens the right target.
