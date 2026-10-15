import React from "react";
import { Text, View } from "react-native";
import { Sheet } from "../components/ui/Overlay";
import { Button, IconButton } from "../components/ui/Button";
import { SwitchRow } from "../components/ui/Fields";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { createInitialState } from "../prototype/reducer";
import { useMockApp } from "../prototype/store";

/** Yesterday's ISO timestamp — kept at module scope so the component stays pure. */
const pastDeadlineIso = () => new Date(Date.now() - 86_400_000).toISOString();

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
        {row("Empty data", "All empty states (photos, events, notifications)", () => {
          dispatch({ type: "hydrate", patch: { photos: [], events: [], notifications: [] } });
          onClose();
        })}
        {row("Deadline passed", "Every event is past its deadline (Closed chips, uploads blocked)", () => {
          const past = pastDeadlineIso();
          dispatch({ type: "hydrate", patch: { events: state.events.map((e) => ({ ...e, deadline: past })) } });
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
          label="Server error"
          description="Inline “Something went wrong” + Try again on data screens"
          checked={state.loadError}
          onChange={(v) => dispatch({ type: "setLoadError", value: v })}
        />
        <SwitchRow
          label="Slow network"
          description="Upload progress ticks ~5× slower"
          checked={state.slowNetwork}
          onChange={(v) => dispatch({ type: "setSlowNetwork", value: v })}
        />
        <SwitchRow
          label="Upload failure"
          description="Every photo in the next batch fails at 60% (Retry succeeds)"
          checked={state.forceUploadFailure}
          onChange={(v) => dispatch({ type: "setForceUploadFailure", value: v })}
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
        {row("Access denied (403)", "Full-screen “You don't have access to this area.”", () => {
          dispatch({ type: "authIssue", issue: "denied" });
          dispatch({ type: "goto", screen: state.role === "admin" ? "review" : "events" });
          onClose();
        })}
        {row("Not found (404)", "Photo viewer shows “This item is no longer available.”", () => {
          dispatch({ type: "openOverlay", overlay: { id: "photoViewer", photoId: "missing-photo" } });
          onClose();
        })}
        {row("Photo too large", "Upload sheet: “Photo too large. Choose a smaller photo.”", () => {
          dispatch({ type: "setUploadError", error: "tooLarge" });
          onClose();
        })}
        {row("Storage full", "Upload sheet: “Storage is full. Please contact the yearbook committee.”", () => {
          dispatch({ type: "setUploadError", error: "storage" });
          onClose();
        })}
        <View style={{ height: 24 }} />
      </View>
    </Sheet>
  );
};

/** Small helper so screens can render an IconButton with a themed icon. */
export const GhostIconButton = IconButton;
