# Authentication (Clerk, Google only)

## 1. Overview

- Provider: **Clerk**. Method: **Google SSO only** (`oauth_google`). No passwords, no OTP, no reset flows.
- Mobile obtains a Clerk **session token** and sends it as `Authorization: Bearer`. The API verifies it with Clerk.
- App roles (`student`/`admin`) live in our `users` table (DD-005), not in Clerk.

## 2. Clerk dashboard setup (one time)

1. Create an application; enable **Google** as the only social connection; disable email/password and other strategies.
2. Enable the **Native applications** option and register the Android app (package `com.yearbookhub.app`) and iOS bundle id.
3. Production: configure **custom Google OAuth credentials** (Google Cloud Console → OAuth client; add Clerk's redirect URI) — the shared dev credentials are not allowed in production.
4. Restrict sign-ups to the school domain(s) via **Allowlist/Restrictions** when OQ-1 is answered (the API also enforces `ALLOWED_EMAIL_DOMAINS`).
5. Copy keys: publishable key (mobile, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`) and secret key (API, `CLERK_SECRET_KEY`).

## 3. Mobile implementation

Packages: `@clerk/clerk-expo`, `expo-secure-store`, `expo-auth-session`, `expo-web-browser`, `expo-linking`.

```tsx
// app/_layout.tsx
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
export default function Root() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>{/* QueryClientProvider, SheetHost, Slot */}</ClerkLoaded>
    </ClerkProvider>
  );
}

// features/auth/useGoogleSignIn.ts
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO } from "@clerk/clerk-expo";
WebBrowser.maybeCompleteAuthSession();
export function useGoogleSignIn() {
  const { startSSOFlow } = useSSO();
  return async () => {
    const { createdSessionId, setActive } = await startSSOFlow({
      strategy: "oauth_google",
      redirectUrl: AuthSession.makeRedirectUri(),
    });
    if (createdSessionId) await setActive!({ session: createdSessionId });
    else throw new Error("SSO_CANCELLED");
  };
}
```

- `app.json` needs `"scheme": "yearbookhub"`.
- Warm up the browser (`useWarmUpBrowser` pattern) on the Sign In screen for faster sheets on Android.
- Verify the exact API names against the installed `@clerk/clerk-expo` version's docs when scaffolding (APIs evolve); keep the behavior identical.

## 4. Session & token usage

- `const { getToken, isSignedIn, signOut } = useAuth();` — call `await getToken()` **per request** (Clerk caches and refreshes; tokens are short-lived).
- On `401 UNAUTHENTICATED`: call `getToken({ skipCache: true })` and retry once; if still 401 → `signOut()` and show the Session expired state.
- On logout: `DELETE /me/push-token`, clear TanStack Query cache and Zustand stores, `signOut()`.

## 5. Backend verification

`apps/api/src/middleware.ts`:

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();
export const config = { matcher: ["/api/:path*"] };
```

`lib/auth.ts`:

```ts
import { auth, clerkClient } from "@clerk/nextjs/server";
export async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth(); // reads Bearer token
  if (!userId) throw new AppError("UNAUTHENTICATED", 401, "Sign in required");
  return userId;
}
```

Then `requireUser()` loads `users` by id (404 `USER_NOT_FOUND` if missing, except in `POST /me`/`GET /me`), producing `ctx = { userId, role, email }`. `requireAdmin(ctx)` throws `403 FORBIDDEN`.
Verify the Bearer-token handling for non-browser clients against the installed `@clerk/nextjs` version; if `auth()` does not accept the token, use `@clerk/backend` `authenticateRequest` with `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY` instead (same contract).

## 6. First-time bootstrap rules (`POST /me`)

1. Fetch the Clerk user server-side; use its **verified primary email** (never trust the request).
2. Domain check against `ALLOWED_EMAIL_DOMAINS` (comma list; empty = allow all) → `403 EMAIL_DOMAIN_NOT_ALLOWED`.
3. `consent === true` and `consent_version` stored with `consented_at = now()`.
4. Role = `admin` if lowercase email ∈ `admin_emails`; else `student`.
5. Insert; on conflict return the existing row (idempotent).
6. Admin accounts ignore `club_id`.

## 7. Error/edge cases

| Case                                               | Behavior                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| User cancels Google                                | Inline message + retry; no API call                                              |
| Email domain not allowed                           | API 403 → app signs out of Clerk, shows "Please use your school Google account." |
| Token expired                                      | Retry once with fresh token, then Session expired                                |
| Admin email added after the user already signed up | Run SQL `update users set role='admin' where email=...`                          |
| User deleted in Clerk dashboard                    | Next request returns 401; stale DB row cleaned manually or by `DELETE /me`       |
| Role changed in DB while signed in                 | App re-fetches `GET /me` on foreground; route guard updates                      |

## 8. Security notes

- Never store tokens manually; use Clerk's `tokenCache` (SecureStore).
- Never log tokens. Never send the Clerk secret key to the client.
- Consent is re-affirmed by the checkbox on each sign-in screen visit but stored once (first sign-in).
