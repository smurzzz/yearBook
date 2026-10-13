# Feature: My Photos (Student Gallery & Viewer)

**Requirements:** FR-GAL-01…07, FR-HOME-03 · **Spec:** §6 S4, §7 sheet 9/15

## Data

- `GET /photos/mine?event_id&cursor` returns tiles + `meta { photos, events, event_chips }`.
- Viewer data: `GET /photos/:id` (signed URLs, `needs_replacement`, `rejection`).
- Viewer list = ids from the grid query cache in current order; swipe pages by index; fetch detail lazily for the visible and adjacent items.

## Privacy rules (hard)

- Students never receive `status`; the UI never shows Pending/Approved/Rejected anywhere.
- Only own photos; foreign ids → 404 → "This item is no longer available."

## Viewer behavior

- Horizontal pager, pinch-zoom (min 1×, max 4×, double-tap toggles 2×), vertical swipe-down to close.
- Info area: chips (event, category, club), caption, uploaded date.
- ⋮ menu items by state: pending/rejected → Edit caption/tags, Delete, Request removal; approved → Request removal only.
- Rejected: quiet card "Needs a new photo: {reason}" (+ note) and **Replace photo**.
- Edit Photo sheet → `PATCH /photos/:id`; Delete → dialog → `DELETE /photos/:id` → removes from cache, closes or moves to next.

## Header stats

Photos = `meta.photos`; Events = `meta.events`. Chips = `meta.event_chips`.

## Empty / loading / error

Skeleton grid (12 tiles) · empty text per spec · error block with Try again.

## Acceptance

Grid has no status UI · rejected photo shows only the quiet card · approved photo can't be edited/deleted · swipe order matches grid order · deleting updates stats.
