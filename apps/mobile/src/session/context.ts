/* Session abstraction — phases.md P6 step 2.

   Screens ask one question ("who is signed in, and can I call the API?") and
   never learn whether the answer comes from Clerk or from the mock picker that
   drove the P2 demo. The mock build keeps the prototype's dev picker; the real
   build swaps in Google SSO through Clerk. */

import { createContext, useContext } from "react";

export interface SessionApi {
  readonly kind: "mock" | "clerk";
  readonly isSignedIn: boolean;
  readonly userId: string | null;
  /** Fresh per request (authentication.md §4). */
  getToken(options?: { skipCache?: boolean }): Promise<string | null>;
  /** Google SSO. Rejects with SSO_CANCELLED when the sheet is dismissed. */
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

/** Demo path: the prototype store owns the session, so no token exists. */
export const MockSession: SessionApi = {
  kind: "mock",
  isSignedIn: false,
  userId: null,
  getToken: async () => null,
  signInWithGoogle: async () => {
    throw new Error("MOCK_SESSION: the mock build signs in through the prototype picker.");
  },
  signOut: async () => undefined,
};

export const SessionContext = createContext<SessionApi>(MockSession);

export const useSession = (): SessionApi => useContext(SessionContext);
