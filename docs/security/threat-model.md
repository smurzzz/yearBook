# Threat Model

## 1. Assets

Student photos (sensitive, may include minors) · student identity (name, email, club) · admin decisions · event data · service credentials · availability during deadlines.

## 2. Actors

Student (legit) · malicious student · compromised/curious admin · outsider (unauthenticated) · compromised device · insider with repo access.

## 3. Trust boundaries

Mobile app ⇄ API (untrusted client) · API ⇄ Postgres/Storage/Clerk/Expo (trusted, server credentials) · Device ⇄ Storage (signed URL only).

## 4. STRIDE analysis

| #   | Threat                                                | Category        | Mitigation                                                                                              | Test                    |
| --- | ----------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- | ----------------------- |
| T1  | Forged/stolen token used to call the API              | Spoofing        | Clerk-verified tokens, short life, SecureStore                                                          | TC-AUTH-09              |
| T2  | User claims admin role                                | Elevation       | Role only from DB; no client-supplied role; `admin_emails`                                              | TC-AUTH-06, TC-AUTHZ-02 |
| T3  | Student reads another student's photo by guessing ids | Info disclosure | Ownership in SQL; 404 for foreign ids; UUIDs                                                            | TC-AUTHZ-03             |
| T4  | Direct access to storage objects                      | Info disclosure | Private bucket; no storage policies; signed URLs 1 h                                                    | TC-AUTHZ-06/07          |
| T5  | Leaked signed URL shared                              | Info disclosure | Short TTL; not logged                                                                                   | TC-AUTHZ-07             |
| T6  | Upload after deadline via forged request              | Tampering       | Server-side deadline + limit checks                                                                     | TC-SEC-05, TC-UP-04     |
| T7  | Oversized/non-JPEG upload to exhaust storage          | DoS / Tampering | Bucket limits (5 MB, JPEG), per-event caps, quota check, cleanup cron                                   | TC-UP-06/08/18          |
| T8  | SQL injection via search/filters                      | Tampering       | Parameterized queries; escaped `ilike`; zod                                                             | TC-SEC-01               |
| T9  | Student edits/deletes approved photo                  | Tampering       | State rules `PHOTO_LOCKED`                                                                              | TC-GAL-04               |
| T10 | Admin abuse (mass delete)                             | Repudiation     | Audit fields (`reviewed_by`, `resolved_by`), report records retained, backups                           | review during UAT       |
| T11 | Replay of approve/reject                              | Tampering       | Idempotent status updates; reviewer recorded                                                            | TC-REV-11               |
| T12 | Cron endpoint triggered by outsiders                  | DoS / Abuse     | `CRON_SECRET`                                                                                           | TC-NOT-07               |
| T13 | Secrets leaked in bundle/repo                         | Info disclosure | Env policy, secret scan, only publishable keys in app                                                   | TC-SEC-02               |
| T14 | PII in logs                                           | Info disclosure | Logging policy, hash user ids                                                                           | TC-SEC-03               |
| T15 | Photo contains location EXIF                          | Info disclosure | Re-encode with image-manipulator (EXIF dropped)                                                         | TC-UP-17                |
| T16 | Non-school accounts register                          | Spoofing        | Domain allowlist (Clerk + API)                                                                          | TC-AUTH-07              |
| T17 | Person in photo cannot remove it                      | Privacy         | Removal requests by uploader; committee contact; admin delete                                           | TC-REP-*                |
| T18 | Service outage near deadline                          | DoS             | Free-tier limits understood; keep projects active; maintenance state; backups                           | pre-defense checklist   |
| T19 | Compromised admin device                              | Elevation       | Clerk session revocation; admins limited to 1–5; rotate on loss                                         | procedural              |
| T20 | Malicious image payloads                              | Tampering       | Re-encoded client-side; server stores/serves only as opaque JPEG; never executes/parses beyond metadata | n/a                     |

## 5. Abuse cases

- Student uploads inappropriate content → admin review gate; students never see others' photos, so exposure is limited to the committee.
- Student spams reports → one open report per photo/user; admin can dismiss.
- Student floods intents → caps per batch/event; stale incomplete rows purged.

## 6. Residual risks (accepted)

- Compressed photos only (quality limit).
- Free-tier service limits/pauses.
- In-memory upload queue lost on app kill.
- Admins can see all photos by design.
- No rate limiting beyond caps (v1).
