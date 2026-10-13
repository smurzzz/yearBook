# Feature: Removal Requests (Reports)

**Requirements:** FR-REP-01…03, BR-07, BR-08 · **Spec:** sheets 10, 11 · **API:** `POST /photos/:id/reports`, `/admin/reports`, resolve

## Student flow

Viewer ⋮ → **Request removal** → sheet: reason radios (REPORT_LABELS), optional notes (≤ 300) → **Submit** → toast "Removal request sent." If an open request exists the sheet shows the info message and disables Submit.
Students do not see the status of their request except through the `report_resolved` notification.

## Admin flow

1. Photos with open requests show the **Reported** badge in All photos; filter **Reported only**.
2. Admin Photo Detail shows **Removal request** block (Reporter, Reason, Requested date, quoted notes) and footer [Dismiss] [Remove photo].
3. **Remove photo** → confirm dialog → `POST /admin/reports/:id/resolve {action:'remove'}` → storage delete → DB delete (report kept with snapshot) → notify reporter.
4. **Dismiss** → `{action:'dismiss'}` → report closed → notify reporter ("kept").

## Rules

- One open report per (photo, reporter).
- Only the uploader can file (students only see own photos).
- Removing a photo also resolves all other open reports on it as `removed`.
- Reports are retained after resolution (audit) with `photo_snapshot`.

## Edge cases

Photo deleted by the student while a report is open → report stays open with `photo_id = null`; admin list shows "Photo no longer available" with only **Dismiss**. Admin deletes a photo from Detail → open reports auto-marked `removed`.

## Acceptance

Duplicate request blocked · Remove deletes storage + row · reporter gets a notification · reported filter shows only open requests.
