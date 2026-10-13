# Environment & Local Setup

## 1. Environments

| Env                        | Mobile build               | API               | Supabase                  | Clerk instance |
| -------------------------- | -------------------------- | ----------------- | ------------------------- | -------------- |
| local                      | dev build                  | `localhost:3000`  | `supabase start` (Docker) | Development    |
| preview/staging (optional) | `preview` APK              | Vercel preview    | separate project          | Development    |
| production                 | `preview`/`production` APK | Vercel production | production project        | Production     |

## 2. Prerequisites

Node.js 22 LTS · npm 10+ · Git · Docker (for local Supabase) · Supabase CLI · EAS CLI (`npm i -g eas-cli`) · Android Studio (emulator/SDK) or a physical Android phone with USB debugging · Accounts: GitHub, Clerk, Supabase, Vercel, Expo, Google Cloud (for production Google OAuth).

## 3. Environment variables

### 3.1 API (`apps/api/.env.local`; Vercel project env vars)

| Name                                                                                          | Required   | Example / notes                                     |
| --------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------- |
| `CLERK_SECRET_KEY`                                                                            | yes        | `sk_test_...`                                       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                           | yes        | `pk_test_...` (needed by `clerkMiddleware`)         |
| `DATABASE_URL`                                                                                | yes        | Supabase pooler URL, port 6543                      |
| `SUPABASE_URL`                                                                                | yes        | `https://xxxx.supabase.co`                          |
| `SUPABASE_SERVICE_ROLE_KEY`                                                                   | yes        | server only, never in the app                       |
| `STORAGE_BUCKET`                                                                              | yes        | `yearbook-photos`                                   |
| `ALLOWED_EMAIL_DOMAINS`                                                                       | no         | `school.edu,student.school.edu` (empty = allow all) |
| `CRON_SECRET`                                                                                 | yes (prod) | long random string                                  |
| `STORAGE_SOFT_LIMIT_BYTES`                                                                    | no         | default `943718400` (900 MB)                        |
| `SIGNED_URL_TTL_SECONDS`                                                                      | no         | default `3600`                                      |
| `EXPO_ACCESS_TOKEN`                                                                           | no         | for Expo push enhanced security                     |
| `MAINTENANCE_MODE`                                                                            | no         | `true` to return 503                                |
| `APP_TIMEZONE`                                                                                | no         | default `Asia/Manila`                               |
| All parsed and validated at boot in `lib/env.ts` (zod); the app fails fast on missing values. |

### 3.2 Mobile (`apps/mobile/.env`; EAS secrets)

| Name                                                                                    | Required | Notes                                                                          |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`                                                                   | yes      | `http://<LAN-IP>:3000` locally (not `localhost` on a phone), HTTPS URL in prod |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                     | yes      | publishable only                                                               |
| Anything prefixed `EXPO_PUBLIC_` is **public** inside the app; never put secrets there. |

### 3.3 GitHub Actions secrets

`EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` (see `deployment/ci-cd.md`).

## 4. First-time local setup

```bash
git clone <repo> && cd yearbookhub
npm ci
cp apps/api/.env.example apps/api/.env.local      # fill values
cp apps/mobile/.env.example apps/mobile/.env
supabase start                                    # prints local DB URL and keys
supabase db reset                                 # applies migrations + seed
npm run dev --workspace apps/api                  # API :3000
cd apps/mobile && eas build --profile development --platform android   # once; install APK
npx expo start --dev-client                       # run against the dev build
```

Local `DATABASE_URL` = `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. For local storage use the keys printed by `supabase status`.

## 5. Scripts (root `package.json`)

`lint`, `typecheck`, `test`, `format`, `db:reset` (`supabase db reset`), `db:new` (`supabase migration new`). Workspace scripts: `dev`, `build`, `test` in each app.

## 6. Android networking tips

- Physical phone and laptop must share Wi-Fi; use the laptop LAN IP in `EXPO_PUBLIC_API_URL`.
- HTTP (non-TLS) dev URLs require `android:usesCleartextTraffic` — enable via `expo-build-properties` in the **development profile only**.

## 7. Seeding admins

Local: `insert into admin_emails(email) values ('you@school.edu');` then sign in with that Google account.
