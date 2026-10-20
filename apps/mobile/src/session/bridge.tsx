/* Session bridge — restores the signed-in state when the app starts with a
   live Clerk session (P6).

   Without it a returning student sees the Sign In screen on every launch:
   the router waits for `state.signedIn`, and only the sign-in screen used to
   set it. The bridge asks GET /me once and puts the account into the store
   — the same answer the Sign In screen would have produced. */

import { useEffect, useRef } from "react";
import { USE_MOCK, isMaintenance, isOffline } from "../api";
import { resolveAccount } from "../api/account";
import { useMockApp } from "../prototype/store";
import { useSession } from "./context";

export const SessionBridge = () => {
  const { state, dispatch } = useMockApp();
  const session = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (USE_MOCK) return; // the demo build signs in through the dev picker
    if (!session.isSignedIn) return;
    if (state.signedIn) return; // the account is already in the store
    if (started.current) return; // one attempt at a time
    started.current = true;

    let cancelled = false;
    (async () => {
      const result = await resolveAccount();
      if (cancelled) return;
      switch (result.kind) {
        case "ok":
          dispatch({
            type: "hydrate",
            patch: {
              role: result.profile.role,
              firstTimeSetupDone: true,
              studentName: result.profile.fullName,
              studentClub: result.profile.club,
            },
          });
          dispatch({ type: "googleSignIn" });
          break;
        case "first-time":
          dispatch({ type: "hydrate", patch: { role: "student", firstTimeSetupDone: false } });
          dispatch({ type: "googleSignIn" });
          break;
        case "not-allowed":
          await session.signOut();
          dispatch({ type: "authIssue", issue: "nonSchool" });
          break;
        case "error":
          /* Nothing is signed in yet: the Sign In screen stays and can try
             again. Only the global states are worth showing now. */
          if (isOffline(result.error)) {
            dispatch({ type: "setNetwork", network: "offline" });
          } else if (isMaintenance(result.error)) {
            dispatch({ type: "authIssue", issue: "maintenance" });
          } else if (__DEV__) {
            console.warn("[auth] could not restore the session", result.error);
          }
          started.current = false; // a later attempt may succeed
          break;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, session, state.signedIn]);

  return null;
};
