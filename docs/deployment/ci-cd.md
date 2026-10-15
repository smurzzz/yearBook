# CI/CD

The reference workflow files are in `.github/workflows/` inside this docs folder. **Copy them to the repository root `.github/workflows/`** when the repo exists.

## 1. Pipelines

| Workflow                                                                                                            | Trigger                                                  | What it does                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                                                                                                            | PR, push to `main`                                       | Install, lint, typecheck, unit tests (shared, api, mobile); starts local Supabase, applies migrations + seed, runs API integration tests |
| Database migrations are **not** auto-applied: an owner pastes `supabase/migrations/*.sql` (filename order) into the Supabase Dashboard SQL Editor, then `supabase/seed.sql` if seed data changed. CI validates everything first against a throwaway local Supabase. | | |
| `eas-build.yml`                                                                                                     | Tag `v*`, manual                                         | Builds the Android APK on EAS (profile input; default `preview`)                                                                         |
| API deployment is handled by **Vercel Git integration** (preview per PR, production on `main`). No workflow needed. |

## 2. Secrets (GitHub → Settings → Secrets and variables)

| Name                                                                   | Scope                    | Used by    |
| ---------------------------------------------------------------------- | ------------------------ | ---------- |
| `EXPO_TOKEN`                                                           | repo                     | eas-build  |
| CI itself needs no production secrets (uses local Supabase and mocks); cloud migrations run manually via the Dashboard SQL Editor, so no Supabase tokens/passwords live in GitHub. |

## 3. Branching & PRs

- Trunk-based: short-lived branches `feat/T-0xx-slug`, `fix/#id-slug`; squash merge to `main`.
- Branch protection on `main`: require CI green and 1 review.
- PR checklist: task ID, tests added, docs updated, authz considered, screenshots for UI changes.

## 4. Quality gates

`npm run lint`, `npm run typecheck`, tests, coverage thresholds (api services ≥ 70 %). Fail the build on any.

## 5. Caching & speed

Node 22 with npm cache via `actions/setup-node`; `concurrency` cancels superseded runs. Local Supabase start ≈ 1–2 min; run it only in the integration job.

## 6. Release notes

Generate from Conventional Commits on tag; list fixed Sev-1/2 bugs (`testing/bug-tracking.md`).

## 7. Security in CI

Pin third-party actions to major versions (or SHAs for sensitive ones); least-privilege `permissions:`; never print secrets; run `npm audit --omit=dev` as a non-blocking report step weekly.
