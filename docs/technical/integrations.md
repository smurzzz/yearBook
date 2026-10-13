# Integrations

| Service           | Used for                                        | Where configured                                | Failure behavior                                                 |
| ----------------- | ----------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Clerk             | Google SSO, session tokens, user profile lookup | Clerk dashboard, env keys                       | Sign-in unavailable → error banner; API 401 on invalid tokens    |
| Supabase Postgres | All data                                        | Supabase project, `DATABASE_URL`                | `503`; app shows error + retry                                   |
| Supabase Storage  | Private photo files                             | Bucket `yearbook-photos`                        | Upload fails per photo (Retry); deletes abort on failure (BR-08) |
| Expo Push + FCM   | Push notifications                              | EAS credentials, `EXPO_ACCESS_TOKEN` (optional) | Best-effort; failures logged; in-app list still has the item     |
| Vercel            | API hosting + cron                              | Vercel project                                  | Maintenance state                                                |
| EAS Build         | APK builds                                      | `eas.json`, `EXPO_TOKEN`                        | n/a                                                              |
| GitHub Actions    | CI/CD                                           | `.github/workflows`                             | n/a                                                              |

## 1. Clerk

See `authentication.md`. Server calls: `auth()` (every request), `clerkClient.users.getUser(id)` (bootstrap), `clerkClient.users.deleteUser(id)` (account deletion).

## 2. Supabase

**Postgres:** use the _transaction pooler_ URL (port 6543) in `DATABASE_URL`; `prepare: false`. For migrations use the CLI (`supabase db push`) with the direct/session connection.
**Storage (server only, service role):** `@supabase/supabase-js` created with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, `auth: { persistSession: false }`.

```ts
const bucket = supabase.storage.from("yearbook-photos");
bucket.createSignedUploadUrl(path); // -> { signedUrl, token, path }  (upload)
bucket.createSignedUrls(paths, 3600); // read URLs, batch
bucket.remove(paths); // delete (chunks of 100)
bucket.list(folder, { search: filename }); // existence check in /complete
```

- Existence check in `complete`: list the folder with `search = {photo_id}.jpg` (or use `download` HEAD equivalent). One batch call per photo; do in parallel (max 5).
- Signed upload URLs are valid for ~2 hours; after that call `/photos/:id/upload-url`.
- Free tier: 1 GB storage; project pauses after a week of inactivity on the free plan → keep it active before the defense (see `deployment/troubleshooting.md`).
- Disable the **Data API** (PostgREST) in project settings if not needed.

## 3. Expo Push

- Mobile registers: `Notifications.getExpoPushTokenAsync({ projectId })` → `PUT /me/push-token`.
- Server sends: `POST https://exp.host/--/api/v2/push/send`, JSON array of up to **100** messages `{ to, title, body, data, sound: 'default', channelId: 'default' }`, header `Authorization: Bearer ${EXPO_ACCESS_TOKEN}` if enhanced security is enabled.
- Parse tickets; on `DeviceNotRegistered` delete that token. Receipts polling is optional (P2).
- Android requires **FCM v1 credentials uploaded to EAS** (`eas credentials`) and a dev/production build. Push does not work in Expo Go on Android (SDK 53+). Physical device required.
- Android notification channel `default` created at startup (`Notifications.setNotificationChannelAsync`).
- Honor preferences: skip push (but still create the notification row) when the matching toggle is off (`notify_deadlines` for reminders, `notify_reviews` for rejection/report outcomes).
- Tap handling: `Notifications.addNotificationResponseReceivedListener` → route per `data` (`photo_id` → `/photo/{id}`, `event_id` → Home with Event Detail).

## 4. Vercel

- Project root: `apps/api`. Region closest to Supabase (e.g. Singapore `sin1`).
- Cron (`apps/api/vercel.json`): `{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 1 * * *" }] }` (01:00 UTC = 09:00 Manila). Vercel sends `Authorization: Bearer $CRON_SECRET`.
- Function limits: keep handlers < 10 s; request bodies are small (no file bytes).

## 5. EAS / Expo

`eas.json` profiles: `development` (dev client, internal, apk), `preview` (internal, apk — the delivered APK), `production` (optional). See `deployment/deployment.md`.

## 6. Native modules used (need a dev build)

`expo-image-picker` (camera + gallery), `expo-image-manipulator`, `expo-notifications`, `expo-secure-store`, `expo-file-system`, `@react-native-community/netinfo`, `react-native-gesture-handler`, `react-native-reanimated`, `@gorhom/bottom-sheet`, `react-native-svg`, `@react-native-community/datetimepicker`.
