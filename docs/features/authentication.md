# Feature: Authentication

**Requirements:** FR-AUTH-01…09 · **Screens/sheets:** Sign In, First-Time Setup, Privacy Notice, Profile (log out/delete), session/permission states · **Tech:** `technical/authentication.md`

## User stories

- As a student I sign in with my school Google account so I don't manage a password.
- As a user I must accept the privacy notice before signing in.
- As an admin I land directly in the Review area.

## Flow

1. Sign In: checkbox unchecked → Google button disabled.
2. Tap Google → Clerk SSO in a browser sheet → returns session.
3. `GET /me`: 200 → route by role; 404 → First-Time Setup sheet (name prefilled, optional club) → `POST /me` → route by role.
4. Log out: dialog → `DELETE /me/push-token` → clear caches → Clerk `signOut` → Sign In.
5. Delete account (student): dialog → `DELETE /me` → sign out.

## Rules

- Role is decided by the server (`admin_emails`), never by the client.
- Consent (`consent_version`, `consented_at`) stored once at first sign-in.
- Non-allowed email domain → API 403 → sign out of Clerk → message "Please use your school Google account."
- Session expiry → Session expired state, not a crash.

## Edge cases

| Case                                  | Result                                     |
| ------------------------------------- | ------------------------------------------ |
| Cancelled Google flow                 | Inline "Sign-in was cancelled. Try again." |
| Offline at sign-in                    | Error banner + Try again                   |
| Existing user signs in on a new phone | `GET /me` 200; no setup sheet              |
| Admin email added later               | Needs SQL role update                      |
| App relaunch while signed in          | Splash → `GET /me` → role route            |

## Acceptance

- AC-1 Button disabled until consent checked. AC-2 First sign-in shows setup sheet exactly once. AC-3 Student cannot open admin routes. AC-4 Logout clears all cached photo data. AC-5 Tests TC-AUTH-01…10.
