# Feature: Browse, Search & Filter (Admin)

**Requirements:** FR-BRW-01…05 · **Spec:** §6 S5 (All photos), sheets 11, 13, 15, 16 · **API:** `GET /admin/photos`, `/admin/users/:id/photos`

## Behavior

- State (Zustand/URL-like): `{ q, status, event_id, category_id, club_id, uploader_id, from, to, reported }`.
- Search debounce 300 ms; filters apply on **Show N photos**; chips reflect active facets; **Reset** clears all.
- Filter sheet button count: `GET /admin/photos?...&count_only=true` (debounced 250 ms) as facets change.
- Summary line uses `meta.summary` of the filtered set.
- Grid tile: status icon top-left (with accessibility label) and **Reported** badge top-right (never overlap).
- Tapping a tile opens Admin Photo Detail; after any change invalidate `admin photos`, `review queue/count`, `reports`.

## Admin Photo Detail actions

| Current status                                                                                          | Footer (no open report)               | Notes             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| pending                                                                                                 | [Pending disabled] [Reject] [Approve] |                   |
| approved                                                                                                | [Pending] [Reject] [Approve disabled] |                   |
| rejected                                                                                                | [Pending] [Reject disabled] [Approve] | shows reason card |
| With an open removal request: footer = [Dismiss] [Remove photo]; status actions via ⋮ → Change status.  |
| ⋮ menu: Change status, Edit tags (Edit Photo sheet incl. event), Delete photo (dialog).                 |
| Reject from detail uses the same Reject Reason sheet; changes commit immediately (no undo window here). |

## Uploader Photos sheet

`GET /admin/users/:id` + `/photos`; read-only, status icons shown, tap tile → Admin Photo Detail.

## Empty states

Per spec §6 S5 (no match / no removal requests / no matching reports).

## Acceptance

Every filter works alone and combined · counts match grid · search matches caption and uploader name case-insensitively · Reported badge appears only for open requests · current-status button disabled.
