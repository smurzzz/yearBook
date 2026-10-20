/* Clerk wiring — technical/authentication.md §3–§8.
   Loaded by SessionProvider only when EXPO_PUBLIC_USE_MOCK=false, so the
   mockup build (Expo Go, offline demos, unit tests) never touches Clerk.

   Tokens live in Clerk's `tokenCache` backed by SecureStore: the app never
   reads or stores a session token itself (§8). */

import React, { useMemo } from "react";
import {
  ClerkProvider,
  useAuth,
  useClerk,
  useSSO,
  useUser,
  type TokenCache,
} from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { configureApi } from "../api";
import { useMockApp } from "../prototype/store";
import { SessionContext, type SessionApi } from "./context";

/* Runs at load in BOTH windows: the opener (no session in progress → no-op)
   and the /callback popup (posts the redirect URL back). Log the verdict —
   a silent failure here is indistinguishable from a cancelled sheet. */
const completionResult = WebBrowser.maybeCompleteAuthSession();
if (typeof window !== "undefined") {
  console.warn("[auth] maybeCompleteAuthSession", completionResult, window.location.href);
}

export const tokenCache: TokenCache = {
  getToken: (key) => SecureStore.getItemAsync(key),
  saveToken: (key, token) => SecureStore.setItemAsync(key, token),
  clearToken: (key) => {
    void SecureStore.deleteItemAsync(key);
  },
};

/** Google SSO — authentication.md §3. Cancelling the sheet is not an error
 *  state, it just rejects so the screen can show its inline retry. */
export const useGoogleSignIn = () => {
  const { startSSOFlow } = useSSO();
  return async () => {
    await WebBrowser.warmUpAsync().catch(() => undefined);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ path: "/callback" }),
      });
      if (!createdSessionId) {
        // Without this the popup result (dismiss / blocked / error URL) is
        // swallowed and every failure reads as a plain cancellation.
        console.warn("[auth] SSO produced no session", authSessionResult);
        throw new Error("SSO_CANCELLED");
      }
      await setActive?.({ session: createdSessionId });
    } finally {
      await WebBrowser.coolDownAsync().catch(() => undefined);
    }
  };
};

const ClerkSession = ({ children }: { children: React.ReactNode }) => {
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const signInWithGoogle = useGoogleSignIn();
  const { dispatch } = useMockApp();

  /* The instance signs up Google-only with the Clerk email attribute disabled,
     so the address may live only on the oauth external account (see the API's
     getClerkProfile — same precedence). */
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find((e) => e.verification?.status === "verified")?.emailAddress ??
    user?.externalAccounts.find((a) => a.provider === "google")?.emailAddress ??
    null;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  const value = useMemo<SessionApi>(() => {
    /* One client for the whole app, wired to this session and to the global
       states from error-handling.md §4 (session expired / offline). */
    configureApi({
      getToken: async (opts) => (await getToken?.({ skipCache: opts?.skipCache })) ?? null,
      onUnauthorized: () => dispatch({ type: "sessionExpired" }),
      onOffline: () => dispatch({ type: "setNetwork", network: "offline" }),
      onMaintenance: () => dispatch({ type: "authIssue", issue: "maintenance" }),
    });

    return {
      kind: "clerk",
      isSignedIn: isSignedIn ?? false,
      userId: userId ?? null,
      email,
      fullName,
      avatarUrl: user?.imageUrl ?? null,
      getToken: async (opts) => (await getToken?.({ skipCache: opts?.skipCache })) ?? null,
      signInWithGoogle,
      signOut: async () => {
        await signOut();
      },
    };
  }, [dispatch, email, fullName, getToken, isSignedIn, signInWithGoogle, signOut, user, userId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const ClerkSessionProvider = ({ children }: { children: React.ReactNode }) => (
  <ClerkProvider tokenCache={tokenCache}>
    <ClerkSession>{children}</ClerkSession>
  </ClerkProvider>
);
