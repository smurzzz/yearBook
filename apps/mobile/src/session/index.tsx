/* Session provider — the flag switch for P6 step 2.

   EXPO_PUBLIC_USE_MOCK (default "true") keeps the prototype's mock picker for
   demos, CI and Expo Go. Set it to "false" and the same tree runs on Clerk:
   Google SSO, SecureStore token cache, and the API client wired to this
   session. Nothing else in the app branches on the flag. */

import React from "react";
import { USE_MOCK } from "../api";
import { ClerkSessionProvider } from "./clerk";
import { MockSession, SessionContext } from "./context";

export { useSession, type SessionApi } from "./context";

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  if (USE_MOCK) {
    return <SessionContext.Provider value={MockSession}>{children}</SessionContext.Provider>;
  }
  return <ClerkSessionProvider>{children}</ClerkSessionProvider>;
};
