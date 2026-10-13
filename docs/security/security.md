# Security

Highest-precedence document (see `overview.md` §11.3). Companion docs: `threat-model.md`, `privacy.md`, `permissions-matrix.md`.

## 1. Principles

1. **Server is the authority** — role, ownership, deadline, limits enforced in the API (DD-003).
2. **Least privilege** — students get minimal DTOs; admins only on admin routes; service-role key only on the server.
3. **Private by default** — private bucket, signed URLs, no public gallery.
4. **Defense in depth** — validation + authz + DB constraints + RLS deny-all.
5. **No sensitive data in logs or the client bundle.**

## 2. Controls by layer

| Layer     | Controls                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity  | Clerk Google SSO; verified email from Clerk server-side; domain allowlist; sessions via Clerk tokens                                                        |
| API       | `withRoute` auth + role gate; zod validation on all inputs; ownership in SQL `WHERE`; consistent 404 for foreign resources; maintenance switch; cron secret |
| Database  | FK/check constraints; RLS enabled deny-all; parameterized SQL only; server-only connection string; Data API disabled                                        |
| Storage   | Private bucket, JPEG-only, 5 MB limit; signed URLs (read 1 h, upload one-time); deletes storage-first                                                       |
| Mobile    | Tokens in SecureStore via Clerk; only public keys in `EXPO_PUBLIC_*`; no secrets; HTTPS only in production (no cleartext)                                   |
| Transport | HTTPS/TLS everywhere (Vercel, Supabase, Clerk, Expo)                                                                                                        |
| Privacy   | Consent stored, removal requests, EXIF/GPS stripped by re-encoding, minimal PII                                                                             |
| Ops       | Secrets in Vercel/EAS/GitHub only; rotate on leak; backups encrypted; audit fields (`reviewed_by`, `resolved_by`)                                           |

## 3. Input validation

- Every request body/query parsed with zod; reject unknown fields (`.strict()`).
- Search text: max 80 chars; escape `%`, `_`, `\` for `ilike`; always bind parameters.
- Uploads: only `image/jpeg`; numeric caps (bytes, width/height); server never trusts client sizes beyond caps and verifies object existence on `complete`.
- IDs validated as UUIDs; Clerk ids validated by prefix/format.

## 4. Secrets management

| Secret                                                                                              | Where          | Never                             |
| --------------------------------------------------------------------------------------------------- | -------------- | --------------------------------- |
| `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `CRON_SECRET`, `EXPO_ACCESS_TOKEN` | Vercel env     | In repo, app bundle, logs, issues |
| `EXPO_TOKEN`, Supabase CI secrets                                                                   | GitHub secrets | In workflow files                 |
| Publishable keys                                                                                    | App env        | — (public by design)              |
| Rotate immediately if leaked; document in the incident log.                                         |

## 5. Headers & transport (API)

- Responses: `Cache-Control: no-store` for authenticated JSON; `X-Content-Type-Options: nosniff`.
- No CORS needed (native app); do not enable wildcard CORS.
- Redirect HTTP→HTTPS (Vercel default).

## 6. Abuse & rate limiting

Hard caps limit abuse (20 per batch, per-event limit, storage soft limit). Add per-user request throttling (e.g. Upstash Ratelimit) if abuse appears — roadmap item. Clerk and Expo apply provider-side throttles.

## 7. Logging & monitoring

Structured logs without PII (`technical/error-handling.md` §5). Review Vercel/Supabase logs during testing and the defense week. Alert manually on repeated 401/403 spikes.

## 8. Dependency & supply chain

Pinned versions + lockfile; `npm audit --omit=dev` before release; review new native modules; third-party GitHub Actions pinned.

## 9. Incident response (small team)

1. Contain: rotate keys, set `MAINTENANCE_MODE=true` if needed.
2. Assess: what data, which users (logs, DB).
3. Notify: adviser/DPO immediately; follow `privacy.md` §7 for breach notification.
4. Fix and add a regression test; write a short post-mortem.

## 10. Security checklist (use in QA — week 7)

- [ ] Every endpoint tested for 401/403/404 (TC-AUTHZ-*)
- [ ] Student JSON never contains status or other users' data
- [ ] Bucket private; direct object URL fails; signed URL expires
- [ ] Server rejects closed-event/over-limit forged requests
- [ ] RLS enabled on all tables; no policies; Data API off
- [ ] No secrets in bundle (`EXPO_PUBLIC_*` reviewed) or repo (secret scan)
- [ ] Logs free of PII
- [ ] Cron and maintenance protected
- [ ] Admin role cannot be self-assigned
- [ ] Account deletion removes files
- [ ] Dependencies audited
