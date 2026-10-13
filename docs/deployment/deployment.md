# Deployment

## 1. Targets

| Component          | Platform                                  | Artifact                                               |
| ------------------ | ----------------------------------------- | ------------------------------------------------------ |
| API                | Vercel (Git integration, root `apps/api`) | Serverless functions + cron                            |
| Database + Storage | Supabase (production project)             | Migrations in `supabase/migrations`                    |
| Auth               | Clerk (Production instance)               | Custom Google OAuth credentials                        |
| Mobile             | EAS Build                                 | Android **APK** (`preview` profile) shared via link/QR |
| Push               | Expo Push + FCM v1                        | Credentials stored in EAS                              |

## 2. One-time production setup (in order)

1. **Supabase:** create the project (region near PH, e.g. Singapore). Save the pooled `DATABASE_URL` (port 6543), `SUPABASE_URL`, service-role key. Apply migrations (`supabase link` + `supabase db push`, or the GitHub workflow). Run seed (categories, clubs) and insert admin emails. Confirm bucket `yearbook-photos` is private. Disable the Data API if unused.
2. **Clerk:** create a Production instance; enable only Google with **custom credentials** (Google Cloud Console OAuth client; add Clerk's redirect URI; configure the consent screen with the app name and privacy policy link). Set allowed email domains. Register the Android app/package. Copy keys.
3. **Vercel:** import the repo; Root Directory `apps/api`; set env vars from `technical/environment.md` §3.1 (Production); add `vercel.json` with the cron; deploy; check `GET {API_URL}/api/v1/health`.
4. **FCM / push:** create a Firebase project, add the Android app (`com.yearbookhub.app`), generate a service-account key (FCM v1), upload via `eas credentials`. Confirm a test push from the Expo push tool.
5. **EAS:** `eas login`, `eas init`, set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for the `preview` profile (EAS env/secrets).
6. **Smoke test** with a real Google account and one admin.

## 3. Config files (reference)

`apps/mobile/app.json` (key parts):

```json
{
  "expo": {
    "name": "YearbookHub",
    "slug": "yearbookhub",
    "scheme": "yearbookhub",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "android": {
      "package": "com.yearbookhub.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#5E3291"
      }
    },
    "ios": { "bundleIdentifier": "com.yearbookhub.app" },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-image-picker",
        {
          "photosPermission": "YearbookHub needs access to your photos so you can upload them to the yearbook.",
          "cameraPermission": "YearbookHub needs your camera so you can take photos for the yearbook."
        }
      ],
      ["expo-notifications", { "color": "#5E3291" }]
    ],
    "extra": { "eas": { "projectId": "<from eas init>" } }
  }
}
```

`apps/mobile/eas.json`:

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": { "autoIncrement": true }
  }
}
```

`apps/api/vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 1 * * *" }] }
```

## 4. Release procedure

1. Merge to `main` (CI green). Vercel deploys the API automatically.
2. Migrations: the `supabase-migrations` workflow applies new SQL on pushes touching `supabase/migrations/**` (production environment approval recommended). **Deploy order for schema changes:** migration first (backward compatible), then API, then app.
3. Tag `vX.Y.Z` → `eas-build` workflow builds the `preview` APK (`--no-wait`); get the link from expo.dev.
4. Install on two devices; run `testing/qa-checklist.md` sections A–E.
5. Share the APK link/QR with testers. Increment `version` in `app.json` per release.

## 5. Rollback

- API: Vercel → Deployments → promote the previous deployment.
- Migrations: write a new forward migration to revert (never edit applied migrations); keep changes additive when possible.
- App: re-share the previous APK build link; the API must stay backward compatible with the previous app version for one release.

## 6. Environments & promotion

Keep production secrets only in Vercel/EAS/GitHub. Never reuse production keys locally. Use the Clerk Development instance for local/staging.

## 7. Pre-defense checklist

Production Supabase active (free projects pause when idle) · cron secret set · demo data seeded · APK installed on 2 devices · push tested · backup taken · hotspot ready.
