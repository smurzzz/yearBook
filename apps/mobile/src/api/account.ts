/* Account resolution — GET /me decides what happens after the Google sign-in
   (authentication.md §3, T-021/T-023).

   One place, two callers: the Sign In screen (right after the SSO sheet) and
   the session bridge (a returning student whose Clerk session is still
   alive when the app starts). The answers are the three the app cares
   about:

     - ok        → the account exists (role, name, club) → straight in;
     - first-time → no users row yet (404 USER_NOT_FOUND) → the setup sheet;
     - not-allowed → the address is not a school address → sign out again. */

import { api, isApiError } from "./index";
import type { Club, Role } from "../prototype/types";

export interface AccountProfile {
  role: Role;
  fullName: string;
  club: Club | null;
}

export type AccountResult =
  | { kind: "ok"; profile: AccountProfile }
  | { kind: "first-time" }
  | { kind: "not-allowed" }
  | { kind: "error"; error: unknown };

/** Ask the API who this is. Never throws — the caller decides what to show. */
export const resolveAccount = async (): Promise<AccountResult> => {
  try {
    const user = await api.getMe();
    return {
      kind: "ok",
      profile: {
        role: user.role,
        fullName: user.full_name,
        club: (user.club?.name ?? null) as Club | null,
      },
    };
  } catch (error) {
    if (isApiError(error) && (error.code === "USER_NOT_FOUND" || error.status === 404)) {
      return { kind: "first-time" };
    }
    if (isApiError(error) && error.code === "EMAIL_DOMAIN_NOT_ALLOWED") {
      return { kind: "not-allowed" };
    }
    return { kind: "error", error };
  }
};
