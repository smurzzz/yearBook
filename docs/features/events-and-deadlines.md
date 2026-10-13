# Feature: Events & Deadlines

**Requirements:** FR-EVT-01…06, FR-HOME-02 · **Spec:** §1 countdown, §6 S2/S6, sheets 7 & 14 · **API:** `/events`

## Admin

- Events screen lists all events with Open/Closed badge, deadline, photo count, search.
- Event Form (create/edit): fields and limits in spec sheet 14. Date and time pickers produce Manila-time ISO (`YYYY-MM-DDTHH:mm:00+08:00`).
- Create: deadline must be in the future. Edit: any value allowed (past deadline closes the event).
- Toggle **Open for submissions** off = closed immediately regardless of deadline.
- Delete: dialog shows `photo_count`; API deletes files then rows.
- After save: toast, close sheet, invalidate `events`.

## Student

- Home cards sorted open-first by nearest deadline; countdown chip per spec §1; closed events show "Closed".
- Event Detail sheet: shows rules, "You've uploaded X of Y", **Upload to this event** (disabled with reason).
- Upload event picker lists open events only.

## Server enforcement

`effective_open = is_open AND now() < deadline` evaluated in SQL at intent/replace time. The client countdown is cosmetic.

## Reminders

Cron sends one reminder per event within 48 h of the deadline (see notifications feature).

## Edge cases

| Case                                             | Behavior                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Deadline passes while student is uploading       | Intent already accepted continues; completes normally. New intents fail `EVENT_CLOSED`             |
| Admin extends deadline                           | Event reopens; no new reminder if `reminder_sent_at` already set (set to null to resend — runbook) |
| Admin reduces `max_photos` below existing counts | Allowed; existing photos stay; further uploads blocked                                             |
| Event deleted while student views it             | 404 → "This item is no longer available."                                                          |

## Acceptance

Created event appears on student Home ≤ 30 s or after refresh · closed event blocks upload server-side (test with a forged request) · delete removes photos and storage files · countdown thresholds match spec.
