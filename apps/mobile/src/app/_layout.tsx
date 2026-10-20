import React, { useEffect } from "react";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useTheme } from "@/theme/useTheme";
import { PrototypeProvider, useMockApp } from "@/prototype/store";
import { SessionProvider } from "@/session";
import { DialogHost, OverlayHost } from "@/sheets/OverlayHost";
import { ToastHost } from "@/components/ui/Overlay";
import { SessionBridge } from "@/session/bridge";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const PATH: Record<string, string> = {
  signin: "/(auth)/sign-in",
  home: "/(student)/home",
  upload: "/(student)/upload",
  myPhotos: "/(student)/my-photos",
  review: "/(admin)/review",
  events: "/(admin)/events",
};

/** Keeps the router and the prototype state in step: guards (sign-in gate,
 * role gate), then two-way syncs the student/admin tab routes with
 * `state.screen`. Everything no-ops when already consistent, so pushes from
 * screens (`router.push("/photo/id")`) are free to lead.
 */
const useRouteSync = () => {
  const { state, dispatch } = useMockApp();
  const router = useRouter();
  const segments = useSegments();
  const screen = state.screen;

  useEffect(() => {
    const group = segments[0];
    const tab = segments[1];

    if (!state.signedIn) {
      if (group !== "(auth)") (router as any).replace(PATH.signin);
      return;
    }
    if (group === "photo") return;

    if (state.role === "admin") {
      if (group !== "(admin)") (router as any).replace(screen === "events" ? PATH.events : PATH.review);
      return;
    }

    if (group === "(student)") {
      const target = tab === "upload" ? "upload" : tab === "my-photos" ? "myPhotos" : "home";
      if (screen !== target) dispatch({ type: "goto", screen: target });
      return;
    }

    /* Signed-in students must also leave the auth group: first-time setup
       completes while the router still sits on /sign-in, so routing only
       when already inside the student tabs left new students stuck there. */
    (router as any).replace(PATH[screen] ?? PATH.home);
  }, [dispatch, router, screen, segments, state.role, state.signedIn]);
};

const RootNavigator = () => {
  const t = useTheme();
  const { state } = useMockApp();
  useRouteSync();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: t.background,
      card: t.card,
      text: t.foreground,
      border: t.border,
      primary: t.primary,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.background },
        }}
      />
      <OverlayHost />
      <DialogHost />
      <ToastHost />
      <StatusBar style={state.theme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
};

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrototypeProvider>
          {/* Session above the navigator: it wires the API client to Clerk
            (or to the mock session) before any screen can dispatch. */}
          <SessionProvider>
            <SessionBridge />
            <RootNavigator />
          </SessionProvider>
        </PrototypeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}