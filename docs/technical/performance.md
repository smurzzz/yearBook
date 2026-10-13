# Performance

## 1. Budgets

| Area                            | Target                                                             |
| ------------------------------- | ------------------------------------------------------------------ |
| App cold start to Sign In/Home  | ≤ 3 s on a mid-range Android                                       |
| First grid page (30 thumbnails) | ≤ 2 s on 4G                                                        |
| Scroll                          | ≥ 55 fps on 3-column grids (FlatList)                              |
| Review card swap (next photo)   | ≤ 300 ms (next image prefetched)                                   |
| API p95 (non-upload)            | ≤ 500 ms                                                           |
| 10-photo batch (~6 MB)          | ≤ 30 s at 5 Mbps                                                   |
| Image sizes                     | original ≤ ~900 KB typical (cap 5 MB), thumb ≤ ~60 KB (cap 300 KB) |

## 2. Mobile techniques

- Grids use thumbnails only (`thumb_url`); full image only in viewer/review. `expo-image` with `cacheKey` `{photoId}:{thumb|original}`, `recyclingKey`, `contentFit="cover"`, placeholder color.
- `FlatList numColumns={3}` with `getItemLayout`, `keyExtractor`, `windowSize` 7, `removeClippedSubviews`; memoize tiles; stable callbacks. (Consider FlashList if frame drops.)
- Infinite scroll with TanStack `useInfiniteQuery`; page size 30.
- Review: prefetch next 2 originals (`Image.prefetch`); hold decisions in memory for undo.
- Compression runs ≤ 2 in parallel; uploads ≤ 3 in parallel to avoid memory pressure; free cache files after Done.
- Avoid re-renders: Zustand selectors; split queue state per photo id.
- Keep animations on the UI thread (Reanimated).

## 3. API techniques

- One SQL query per list with joins; summary counts in a second query using the same filter fragment.
- Indexes in `database.md`; trigram GIN for search; keyset pagination (no OFFSET).
- Batch signed-URL creation (`createSignedUrls`) per page (not per photo).
- Reuse the postgres.js client across invocations; `max: 1` on serverless; pooler URL.
- Responses small: tiles carry only needed fields; detail DTO only on open.
- `after()` for push/notifications work.

## 4. Storage footprint (planning)

~20,000 photos × (0.6 MB + 0.05 MB) ≈ 13 GB — **exceeds** the 1 GB free tier. With the soft limit (900 MB) expect roughly 1,400 photos on the free tier. If real usage needs more, upgrade the plan or lower `max_photos` / quality (q 0.7, long edge 1600). State this limit in the proposal's risks (see `security/privacy.md` and `roadmap.md`).
Adjust NFR-10 in `requirements.md` accordingly if the school needs the larger capacity.

## 5. How to measure

Manual timers on a real device (see `testing/test-plan.md` §6), Vercel function durations, `EXPLAIN ANALYZE` on admin list queries with 5,000 seeded rows.
