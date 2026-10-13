# Testing Strategy

## 1. Levels

| Level                                       | Scope                                                                                                       | Tools                                                                                   | Runs                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Unit                                        | Pure logic: countdown, formatters, constants, zod schemas, image size math, queue store, pagination cursors | Vitest (shared, api), Jest + `jest-expo` (mobile)                                       | CI on every PR          |
| Integration (API)                           | Services + real Postgres (local Supabase): rules BR-01…BR-13, filters, authz, deletes                       | Vitest + `postgres`, Supabase CLI in CI; Storage and Clerk **mocked** behind interfaces | CI                      |
| Component                                   | Key UI states (Upload gating, Reject sheet validation, Photo Viewer by state, empty states)                 | React Native Testing Library                                                            | CI                      |
| Manual E2E                                  | Full flows on a real Android phone against staging/production                                               | `test-cases.md`, `qa-checklist.md`                                                      | Week 7 + before release |
| Security                                    | Authz fuzz, signed URL expiry, private bucket, injection                                                    | Manual + scripted `curl`/Postman                                                        | Week 7                  |
| Performance                                 | Budgets in `technical/performance.md`                                                                       | Manual timing, `EXPLAIN ANALYZE`                                                        | Week 7                  |
| Optional (P2): Maestro flows for F2 and F4. |

## 2. Principles

- Every business rule (BR-xx) has an integration test. Every endpoint has tests for 401, 403, 404 (foreign resource), 422, and the happy path.
- Test the **server** as the authority: forge requests (closed event, over limit, student calling admin route).
- No test depends on another test's data; each test seeds its own via helpers.
- Mock only external services (Clerk, Storage, Expo Push); never mock the database in integration tests.

## 3. Test data helpers (`apps/api/test/helpers`)

`createUser({ role })`, `createEvent({ deadline, max_photos, is_open })`, `createPhoto({ uploader, status, completed })`, `asUser(user)` (injects `ctx`), `clock.freeze(date)`.
Fixtures: `fixtures/photo-1920.jpg` (≈600 KB), `photo-4000x3000.jpg` (≈4 MB), `thumb.jpg`.

## 4. Conventions

- File names `*.test.ts(x)` next to the code or in `test/`.
- Test names: `TC-<AREA>-<NN> should ...` to link to `test-cases.md`.
- Coverage gate: ≥ 70 % lines for `apps/api/src/server/services/**`; shared constants/schemas ≥ 90 %.
- Flaky tests are fixed or removed within the sprint.

## 5. Commands

```
npm run test                                  # all
npm run test --workspace apps/api             # needs local Supabase running
npm run test --workspace apps/mobile -- --ci
supabase start && supabase db reset           # fresh DB for integration tests
```

## 6. Definition of tested

A feature is done when its TCs pass, edge cases from its `features/*.md` file are covered, and the QA checklist rows for it are ticked.
