# Feature: Admin Review Workflow

**Requirements:** FR-REV-01…06 · **Spec:** §6 S5 (Review mode), sheet 12 · **API:** `/admin/review/*`, approve/reject/reset

## Data

- Queue: `GET /admin/review/queue?event_id&cursor` (oldest first). Keep a local array; prefetch next page when ≤ 5 remain. Tab badge from `/admin/review/count` (refetch on focus and after commits).

## Decision handling (undo)

State: `pendingDecision: { photoId, kind: 'approve'|'reject', payload, timerId } | null` in Zustand.

1. Admin taps Approve (or confirms Reject): remove photo from the visible queue immediately, advance to the next, show toast with **Undo** (5 s), set `pendingDecision`.
2. If another decision is made while one is pending, **commit the earlier one immediately**, then start the new one.
3. Commit triggers: timer elapsed, screen blur/unmount, mode/tab switch, `AppState` → background.
4. **Undo**: cancel timer, reinsert the photo at its previous index, show it.
5. Commit failure: re-insert photo, toast "Couldn't save. Try again."
6. Haptic feedback on commit start (`expo-haptics`).

## Reject

Reject button → Reject Reason sheet (reason chip required; note required when Other) → **Confirm reject** → step 1.

## Navigation

Swipe left = next, right = previous (no decision). Progress label = `{index + 1} of {total}` where `index` is the position in the loaded queue and `total` = `meta.total_pending` returned with the latest page (re-fetched after each commit). Decided photos leave the queue, so the label shrinks as work is done.

## UI guards

- Approve/Reject disabled while a commit is in flight for that photo.
- "Consent confirmed" always shown (it is always true for completed photos).
- Zoom does not trigger swipe navigation while scaled > 1.

## Edge cases

Another admin reviews the same photo → commit returns 409/200 idempotent; if status already changed, drop it from the queue silently. Photo deleted meanwhile (404) → drop. Student replaced/deleted → drop.

## Acceptance

Undo restores position · leaving the screen commits · reject reasons validated · rejection triggers a notification row and push · queue empties to "All caught up!".
