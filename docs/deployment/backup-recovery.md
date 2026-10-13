# Backup & Recovery

Free-tier Supabase does not include managed backups/PITR, so take **manual backups**.

## 1. What to back up

| Asset           | Method                                                      | Frequency                                                       |
| --------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| Postgres data   | `pg_dump` (custom format)                                   | Weekly, and before the defense, before migrations, before purge |
| Storage objects | Download via Supabase dashboard/CLI or S3-compatible tool   | Before the defense and before purge                             |
| Config          | Env vars list in a password manager; repo has all code/docs | On change                                                       |

## 2. Database backup

```bash
# Use the DIRECT or session-pooler connection string (not the transaction pooler)
pg_dump "$DIRECT_DATABASE_URL" --format=custom --no-owner --no-acl -f yearbookhub-$(date +%F).dump
```

Store dumps **encrypted** (e.g. `gpg --symmetric --cipher-algo AES256 file.dump`) in school-approved storage. Dumps contain student PII: restrict access, never commit, never attach to issues.

## 3. Restore

```bash
createdb yearbookhub_restore                      # or a fresh Supabase project
pg_restore --no-owner --no-acl -d "$TARGET_URL" yearbookhub-YYYY-MM-DD.dump
```

Then: re-create the storage bucket and objects, point `DATABASE_URL` to the target, run `GET /health`, test sign-in. Clerk users are independent of the DB; `users.id` values must match existing Clerk ids.

## 4. Recovery scenarios

| Scenario                                                                              | Action                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Bad migration                                                                         | Restore dump to a new project or write a corrective migration; redeploy API                |
| Accidental event/photo deletion                                                       | Restore dump to a scratch DB, export the rows/files, re-insert (files from storage backup) |
| Supabase project paused                                                               | Resume from the dashboard; wait for readiness; check `/health`                             |
| Lost Clerk instance                                                                   | Users must re-sign in; if Clerk ids changed, remap `users.id` (manual SQL)                 |
| Leaked service key                                                                    | Rotate in Supabase, update Vercel env, redeploy; review access logs (see security)         |
| Targets (informal): RPO ≤ 7 days (≤ 1 day during the final two weeks); RTO ≤ 4 hours. |

## 5. Purge runbook (after publication + 90 days; OQ-4)

1. Take a final encrypted backup and hand over approved photos to the yearbook committee.
2. Delete storage objects for the school year (`originals/…`, `thumbs/…` by event folders).
3. `delete from events where ...;` (cascades photos), then remove unused users if required.
4. Revoke access/tokens; archive the project or delete it.
5. Record the purge date in the privacy log (`security/privacy.md` §8).
