# Troubleshooting

| Symptom                                     | Likely cause                                                               | Fix                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Every API call returns 401                  | Token not sent / wrong Clerk keys / clock skew                             | Check `Authorization` header; keys match the same Clerk instance (dev vs prod); sync device time     |
| Google sign-in loops or returns to Sign In  | Redirect URI/scheme mismatch; custom Google credentials missing in prod    | Verify `scheme`, Clerk native app config, Google OAuth redirect URI                                  |
| `EMAIL_DOMAIN_NOT_ALLOWED` for valid users  | `ALLOWED_EMAIL_DOMAINS` typo                                               | Fix env (comma separated, no spaces issues), redeploy                                                |
| New admin sees student UI                   | Role not updated                                                           | `update users set role='admin' where email='…'`; app re-fetches `/me` on foreground                  |
| Uploads fail with 403 from storage          | Signed URL expired or wrong `Content-Type`                                 | Call `/photos/:id/upload-url`; send `image/jpeg`                                                     |
| `complete` returns `UPLOAD_NOT_FOUND`       | PUT didn't finish or wrong path                                            | Retry upload; verify object exists in the bucket                                                     |
| Images don't load later                     | Signed read URL expired (1 h)                                              | Refetch the DTO; ensure `expo-image` uses stable `cacheKey`                                          |
| Push not received (Android)                 | No FCM v1 credentials / using Expo Go / no real device / permission denied | `eas credentials`; use a dev build; check token row in `push_tokens`; test in Expo push tool         |
| Push received but tap does nothing          | Missing `data` or listener not registered                                  | Check payload `data.photo_id`; register response listener at root                                    |
| Reminders not sent                          | Cron not configured/secret mismatch, no events in window                   | Check `vercel.json`, Vercel Cron logs, `CRON_SECRET`; call the route manually with the Bearer header |
| `503 SERVICE_UNAVAILABLE` / timeouts        | Supabase paused or pooler URL wrong                                        | Resume project; use port 6543 URL with `prepare:false`                                               |
| "prepared statement already exists"         | Using pooler without `prepare:false`                                       | Set `prepare: false`                                                                                 |
| Phone can't reach local API                 | `localhost` used / firewall                                                | Use LAN IP; allow Node through firewall; same Wi-Fi                                                  |
| Dev build crashes on a new native module    | Module added without rebuilding                                            | Create a new dev build (`eas build --profile development`)                                           |
| Storage full (`507`)                        | Soft limit reached                                                         | Raise limit/upgrade plan, delete unneeded photos, lower quality                                      |
| Duplicate photos after retry                | `client_id` regenerated                                                    | Generate once per photo and reuse                                                                    |
| RLS "permission denied" in SQL editor tests | RLS deny-all by design                                                     | Use the API or a privileged connection                                                               |

## Diagnostics checklist

1. `GET /api/v1/health` → ok?
2. Vercel function logs filtered by `x-request-id`.
3. Supabase logs (Postgres, Storage).
4. Clerk dashboard → Users/Sessions.
5. Expo push tool for token tests.
6. Reproduce with a fresh test account.

## Runbook SQL

```sql
update users set role='admin' where email='name@school.edu';
update events set reminder_sent_at = null where id='<event>';     -- resend reminder
delete from photos where upload_completed_at is null and created_at < now() - interval '24 hours';
select status, count(*) from photos where upload_completed_at is not null group by status;
select coalesce(sum(original_bytes + thumb_bytes),0)/1048576 as mb from photos;
```
