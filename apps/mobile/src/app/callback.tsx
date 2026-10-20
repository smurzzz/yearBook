/* OAuth return target (authentication.md §3): `makeRedirectUri({ path:
   "/callback" })` lands the browser/popup here after Google. On web,
   `openAuthSessionAsync` (the popup opener in useSSO) only resolves once this
   page posts the result back and closes the popup — which is exactly what
   `maybeCompleteAuthSession()` does. Calling it here is what turns the
   instantly-cancelling popup into a completed sign-in; without it the flow
   always rejects with SSO_CANCELLED. On native the call is a no-op, so this
   screen is safe on every platform. */

import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../theme/useTheme";

export default function Callback() {
  const t = useTheme();

  // Fire on mount so the popup posts its result to the opener and closes.
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.background,
      }}
    >
      <ActivityIndicator color={t.primary} />
    </View>
  );
}
