import React from "react";
import { Text, View } from "react-native";
import { Sheet } from "../components/ui/Overlay";
import { Button, IconButton } from "../components/ui/Button";
import { SwitchRow } from "../components/ui/Fields";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { createInitialState } from "../prototype/reducer";
import { useMockApp } from "../prototype/store";

/**
 * Dev menu (P2A): switch role, reset mock data, and force every system state
 * from spec §10. Only rendered in __DEV__ builds.
 */
export const DevSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const t = useTheme();
  const { state, dispatch, setRole } = useMockApp();

  if (!__DEV__) return null;

  const row = (title: string, subtitle: string, onPress: () => void) => (
    <Button
      title={title}
      variant="outline"
      block
      style={{ marginTop: 8, justifyContent: "flex-start", paddingHorizontal: 16 }}
      onPress={onPress}
      titleColor={t.foreground}
    >
      <View>
        <Text style={[typography.caption, { color: t.mutedForeground }]}>{subtitle}</Text>
      </View>
    </Button>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Dev menu" description="Mock controls — never in release builds." size="tall">
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={[typography.eyebrow, { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700" }]}>
          Role
        </Text>
        {row("Sign in as student (existing)", "Mikaela Reyes · Robotics Club", () => {
          dispatch({ type: "hydrate", patch: { role: "student", firstTimeSetupDone: true } });
          setRole("student");
          onClose();
        })}
        {row("Sign in as new student (first-time)", "Opens First-Time Setup", () => {
          dispatch({ type: "hydrate", patch: { role: "student", firstTimeSetupDone: false, signedIn: false } });
          dispatch({ type: "googleSignIn" });
          onClose();
        })}
        {row("Sign in as committee (admin)", "Daniel Cruz · Review + Events", () => {
          dispatch({ type: "hydrate", patch: { role: "admin" } });
          setRole("admin");
          onClose();
        })}

        <Text
          style={[
            typography.eyebrow,
            { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 20 },
          ]}
        >
          Data
        </Text>
        {row("Reset mock data", "Back to the shipped fixtures", () => {
          dispatch({
            type: "hydrate",
            patch: createInitialState({ role: state.role, signedIn: state.signedIn, screen: state.screen }),
          });
          onClose();
        })}

        <Text
          style={[
            typography.eyebrow,
            { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 20 },
          ]}
        >
          Force states
        </Text>
        <SwitchRow
          label="Offline"
          description="Shows the offline banner and blocks uploads"
          checked={state.network === "offline"}
          onChange={(v) => dispatch({ type: "setNetwork", network: v ? "offline" : "online" })}
        />
        <SwitchRow
          label="Loading (skeletons)"
          checked={state.loading}
          onChange={(v) => dispatch({ type: "setLoading", value: v })}
        />
        <SwitchRow
          label="Dark mode"
          checked={state.theme === "dark"}
          onChange={(v) => dispatch({ type: "setTheme", theme: v ? "dark" : "light" })}
        />
        {row("Maintenance (503)", "Sign-in shows the maintenance takeover", () => {
          dispatch({ type: "authIssue", issue: "maintenance" });
          dispatch({ type: "signOut" });
          onClose();
        })}
        {row("Session expired", "Sign-in shows the expired banner", () => {
          dispatch({ type: "sessionExpired" });
          onClose();
        })}
        {row("Sign-in cancelled", "Sign-in shows the cancelled banner", () => {
          dispatch({ type: "signOut" });
          dispatch({ type: "authIssue", issue: "cancelled" });
          onClose();
        })}
        {row("Non-school account", "Sign-in shows the school-domain banner", () => {
          dispatch({ type: "signOut" });
          dispatch({ type: "authIssue", issue: "nonSchool" });
          onClose();
        })}
        <View style={{ height: 24 }} />
      </View>
    </Sheet>
  );
};

/** Small helper so screens can render an IconButton with a themed icon. */
export const GhostIconButton = IconButton;
