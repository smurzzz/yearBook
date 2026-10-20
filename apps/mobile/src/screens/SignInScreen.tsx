import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LogIn, ShieldAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Fields";
import { GoogleMark, Logo } from "../components/ui/Media";
import { InlineBanner, MaintenanceState } from "../components/ui/Feedback";
import { Sheet } from "../components/ui/Overlay";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { img } from "../prototype/assets";
import { SCHOOL_DOMAIN, SCHOOL_NAME } from "../prototype/data";
import { api, isApiError, isMaintenance, isOffline, USE_MOCK } from "../api";
import { useSession } from "../session";
import { useMockApp } from "../prototype/store";
import { DevSheet } from "./DevSheet";

const HERO_PRIMARY = "/photos/cover-graduation.jpg";
const HERO_TOP = "/photos/photo-caps-tossed.jpg";
const HERO_BOTTOM = "/photos/photo-cultural-dance.jpg";

/** Screen 1 — Sign in. Google only: no email, password, or register toggle. */
export const SignInScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch, open } = useMockApp();
  const session = useSession();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [signingIn, setSigningIn] = useState(false);

  if (state.authIssue === "maintenance") {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top }}>
        <MaintenanceState onRetry={() => dispatch({ type: "authIssue", issue: "none" })} />
      </View>
    );
  }

  const canContinue = state.consentChecked;

  const tapLogo = () => {
    const next = logoTaps + 1;
    if (next >= 5) {
      setLogoTaps(0);
      setDevOpen(true);
    } else {
      setLogoTaps(next);
    }
  };

  const chooseAccount = (patch: Partial<typeof state>) => {
    setPickerOpen(false);
    dispatch({ type: "hydrate", patch });
    dispatch({ type: "googleSignIn" });
  };

  /* Mock build keeps the dev picker (P2A). Real build runs Google SSO through
     Clerk, then GET /me decides between Home and First-Time Setup (T-021/T-023):
     404 USER_NOT_FOUND means no users row yet, which is exactly the setup gate. */
  const continueWithGoogle = async () => {
    if (USE_MOCK) {
      setPickerOpen(true);
      return;
    }
    setSigningIn(true);
    try {
      // If we are already signed in, skip the Google sign-in flow and proceed to fetch user data.
      if (session.isSignedIn) {
        try {
          const user = await api.getMe();
          dispatch({
            type: "hydrate",
            patch: {
              role: user.role,
              firstTimeSetupDone: true,
              studentName: user.full_name,
              studentClub: (user.club?.name ?? null) as typeof state.studentClub,
            },
          });
          dispatch({ type: "googleSignIn" });
        } catch (error) {
          if (isApiError(error)) {
            if (error.code === "USER_NOT_FOUND" || error.status === 404) {
              // Session indicates signed in but no user record - treat as first-time user
              dispatch({ type: "hydrate", patch: { role: "student", firstTimeSetupDone: false } });
              dispatch({ type: "googleSignIn" });
            } else if (error.code === "EMAIL_DOMAIN_NOT_ALLOWED") {
              await session.signOut();
              dispatch({ type: "authIssue", issue: "nonSchool" });
              return;
            } else {
              // For any other error (including unexpected 404s), treat as cancelled to avoid console spam
              // but still log for debugging in development. In production, we might want to handle differently.
              if (__DEV__) {
                console.warn("[auth] Unexpected error in continueWithGoogle (isSignedIn branch)", error);
              }
              dispatch({ type: "authIssue", issue: "cancelled" });
              return;
            }
          } else {
            // Not an ApiError, treat as unexpected
            if (__DEV__) {
              console.warn("[auth] Unexpected error in continueWithGoogle (isSignedIn branch) (non ApiError)", error);
            }
            dispatch({ type: "authIssue", issue: "cancelled" });
            return;
          }
        }
      } else {
        await session.signInWithGoogle();
        try {
          const user = await api.getMe();
          dispatch({
            type: "hydrate",
            patch: {
              role: user.role,
              firstTimeSetupDone: true,
              studentName: user.full_name,
              studentClub: (user.club?.name ?? null) as typeof state.studentClub,
            },
          });
        } catch (error) {
          if (isApiError(error)) {
            if (error.code === "USER_NOT_FOUND" || error.status === 404) {
              dispatch({ type: "hydrate", patch: { role: "student", firstTimeSetupDone: false } });
            } else if (error.code === "EMAIL_DOMAIN_NOT_ALLOWED") {
              await session.signOut();
              dispatch({ type: "authIssue", issue: "nonSchool" });
              return;
            } else {
              // For any other error (including unexpected 404s), treat as cancelled to avoid console spam
              // but still log for debugging in development. In production, we might want to handle differently.
              if (__DEV__) {
                console.warn("[auth] Unexpected error in continueWithGoogle (else branch)", error);
              }
              dispatch({ type: "authIssue", issue: "cancelled" });
              return;
            }
          } else {
            // Not an ApiError, treat as unexpected
            if (__DEV__) {
              console.warn("[auth] Unexpected error in continueWithGoogle (else branch) (non ApiError)", error);
            }
            dispatch({ type: "authIssue", issue: "cancelled" });
            return;
          }
        }
        dispatch({ type: "googleSignIn" });
      }
    } catch (error) {
      // Keep the real cause visible: everything below is rendered as the same
      // "Sign-in cancelled" banner otherwise (error-handling.md §2).
      console.error("[auth] continueWithGoogle failed", error);
      if ((error as Error)?.message === "SSO_CANCELLED") dispatch({ type: "googleCancel" });
      else if (isMaintenance(error)) dispatch({ type: "authIssue", issue: "maintenance" });
      else if (isOffline(error)) {
        dispatch({ type: "setNetwork", network: "offline" });
        dispatch({ type: "googleCancel" });
      } else dispatch({ type: "authIssue", issue: "cancelled" });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 8 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {/* Hero collage */}
        <View style={{ flexDirection: "row", gap: 10, height: 236 }}>
          <View style={{ flex: 1, borderRadius: 22, overflow: "hidden", backgroundColor: t.muted }}>
            <Image source={img(HERO_PRIMARY)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flex: 1, borderRadius: 18, overflow: "hidden", backgroundColor: t.muted }}>
              <Image source={img(HERO_TOP)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </View>
            <View style={{ flex: 1, borderRadius: 18, overflow: "hidden", backgroundColor: t.muted }}>
              <Image source={img(HERO_BOTTOM)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </View>
          </View>
        </View>

        {/* Logo — 5 taps opens the dev menu (P2A) */}
        <Pressable accessibilityLabel="YearbookHub" onPress={tapLogo} style={{ marginTop: 28 }}>
          <Logo size={42} />
        </Pressable>

        <Text style={[typography.title, { color: t.foreground, marginTop: 16 }]}>
          Every moment, one yearbook.
        </Text>
        <Text style={[typography.body, { color: t.mutedForeground, marginTop: 10, lineHeight: 21 }]}>
          Upload your photos from school events, tag them, and the yearbook committee takes it from
          there. Your submissions stay private to you and the committee.
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 28), paddingTop: 12 }}>
        {state.authIssue === "cancelled" ? (
          <InlineBanner
            style={{ marginBottom: 12 }}
            tone="warning"
            icon={LogIn}
            title="Sign-in cancelled"
            message="No account was connected. Tap Continue with Google to try again."
          />
        ) : null}

        {state.authIssue === "nonSchool" ? (
          <InlineBanner
            style={{ marginBottom: 12 }}
            tone="error"
            icon={ShieldAlert}
            title="Please use your school Google account."
            message={`The account you picked is not a ${SCHOOL_NAME} account. Accounts end in @${SCHOOL_DOMAIN}.`}
          />
        ) : null}

        {state.authIssue === "expired" ? (
          <InlineBanner
            style={{ marginBottom: 12 }}
            tone="warning"
            title="Session expired"
            message="Sign in with Google again to continue where you left off."
          />
        ) : null}

        <Checkbox
          checked={state.consentChecked}
          onChange={(value) => dispatch({ type: "setConsent", value })}
          label={
            <Text style={[typography.label, { color: t.mutedForeground, lineHeight: 19 }]}>
              I agree to the{" "}
              <Text
                onPress={() => open("privacy")}
                style={{ color: t.primary, fontWeight: "700", textDecorationLine: "underline" }}
              >
                Privacy Notice
              </Text>{" "}
              and understand photos may be published in the yearbook.
            </Text>
          }
        />

        <Button
          block
          size="lg"
          style={{ marginTop: 16 }}
          disabled={!canContinue || signingIn}
          onPress={() => void continueWithGoogle()}
          icon={<GoogleMark size={18} />}
          title="Continue with Google"
        />

        <Text
          style={[typography.caption, { color: t.mutedForeground, textAlign: "center", marginTop: 12, fontWeight: "500" }]}
        >
          Use your school Google account.
        </Text>
      </View>

      {/* Mock account chooser — the stand-in for the Google one-tap flow */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a Google account" description="Mock picker — no real Google flow in the mockup build.">
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Pressable
            onPress={() => chooseAccount({ role: "student", firstTimeSetupDone: true, signedIn: false })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              padding: 14,
              backgroundColor: t.card,
            }}
          >
            <Image source={img("/photos/avatar-mikaela.jpg")} style={{ width: 40, height: 40, borderRadius: 20 }} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[typography.body, { fontWeight: "700", color: t.foreground }]}>Mikaela Reyes</Text>
              <Text style={[typography.caption, { color: t.mutedForeground }]}>Existing student · Robotics Club</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => chooseAccount({ role: "student", firstTimeSetupDone: false, signedIn: false })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              padding: 14,
              backgroundColor: t.card,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[typography.subhead, { color: t.primary, fontWeight: "700" }]}>+</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[typography.body, { fontWeight: "700", color: t.foreground }]}>New student</Text>
              <Text style={[typography.caption, { color: t.mutedForeground }]}>First time — opens first-time setup</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => chooseAccount({ role: "admin", firstTimeSetupDone: true, signedIn: false })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              padding: 14,
              backgroundColor: t.card,
            }}
          >
            <Image source={img("/photos/avatar-daniel.jpg")} style={{ width: 40, height: 40, borderRadius: 20 }} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[typography.body, { fontWeight: "700", color: t.foreground }]}>Daniel Cruz</Text>
              <Text style={[typography.caption, { color: t.mutedForeground }]}>Yearbook Committee · admin</Text>
            </View>
          </Pressable>
          <View style={{ height: 16 }} />
        </View>
      </Sheet>

      <DevSheet open={devOpen} onClose={() => setDevOpen(false)} />
    </View>
  );
};
