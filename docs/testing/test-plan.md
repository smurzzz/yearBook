# Test Plan

## 1. Objectives

Verify P0/P1 requirements, server-side authorization and privacy rules, and the demo path on real devices before defense.

## 2. Scope

**In:** all FR/NFR P0–P1, security checks, upload resilience, push notifications, role separation.
**Out:** iOS device matrix, load beyond ~50 concurrent users, penetration testing by third parties.

## 3. Test environments

| Env                                                                                                                                                                                   | Purpose              | Notes                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------ |
| Local                                                                                                                                                                                 | Dev + CI integration | Local Supabase, mocked Clerk/Storage in unit tests     |
| Staging (optional)                                                                                                                                                                    | Full-stack tests     | Separate Supabase + Clerk dev instance                 |
| Production                                                                                                                                                                            | Final smoke + demo   | Real Clerk (custom Google credentials), production APK |
| Devices: ≥ 2 physical Android phones (one low-end, API 26–28; one recent), optional emulator. Accounts: 1 admin + 3 student Google accounts (one non-school account for domain test). |

## 4. Roles

| Role              | Duty                                    |
| ----------------- | --------------------------------------- |
| Developers        | Unit/integration tests, fix bugs        |
| QA lead           | Execute manual cases, maintain bug list |
| Adviser/UAT users | Walk through demo script (UAT)          |

## 5. Schedule

| Week | Activity                                                                      |
| ---- | ----------------------------------------------------------------------------- |
| 3–6  | Tests written with each task (Definition of Done)                             |
| 7    | Full manual run of `test-cases.md`, security + performance checks, bug fixing |
| 8    | Regression on release APK, UAT, demo rehearsal                                |

## 6. Entry / exit criteria

- **Entry (Week 7):** all P0 tasks merged; staging/prod deployed; test accounts ready.
- **Exit:** 100 % P0 TCs pass; ≥ 90 % P1; no open Sev-1/Sev-2; QA checklist signed; APK installs and runs the demo script twice without failure.

## 7. Performance measurements (manual)

| Check             | Method                                          | Pass               |
| ----------------- | ----------------------------------------------- | ------------------ |
| Cold start        | Stopwatch from icon tap to Sign In/Home, 3 runs | ≤ 3 s              |
| First grid page   | 30 thumbs on 4G                                 | ≤ 2 s              |
| 10-photo upload   | ~6 MB at 5 Mbps (throttled hotspot)             | ≤ 30 s             |
| Review next-photo | Swipe to next                                   | ≤ 300 ms perceived |
| API p95           | Vercel logs over a 50-request script            | ≤ 500 ms           |

## 8. Risks to testing

Push needs a real device + FCM; Google SSO needs real accounts; Supabase free tier pausing. Mitigation: prepare accounts and keep projects active in week 7.

## 9. Deliverables

Test results table (copy of `test-cases.md` with status), bug list export, signed `qa-checklist.md`, short test report for the final document.
