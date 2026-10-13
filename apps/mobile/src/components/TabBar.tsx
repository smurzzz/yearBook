import React from "react";
import { Pressable, Text, View } from "react-native";
import {
  CalendarDays,
  ClipboardCheck,
  Home,
  Images,
  PlusCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { useMockApp } from "../prototype/store";
import { pendingCount } from "../prototype/selectors";
import type { Role } from "../prototype/types";

export type TabKey = "home" | "upload" | "myPhotos" | "review" | "events";

const STUDENT_TABS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "upload", label: "Upload" },
  { key: "myPhotos", label: "My Photos" },
];

const ADMIN_TABS: { key: TabKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "events", label: "Events" },
];

/**
 * Tab bar: white, top hairline, icon above label; active = primary;
 * the student Upload tab is the highlighted center; admin badge = pending count.
 */
export const TabBar = ({
  current,
  role,
  navigate,
}: {
  current: TabKey;
  role: Role;
  navigate: (key: TabKey) => void;
}) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useMockApp();
  const tabs = role === "admin" ? ADMIN_TABS : STUDENT_TABS;
  const badge = pendingCount(state);

  const icon = (key: TabKey, active: boolean) => {
    const color = active ? t.primary : t.mutedForeground;
    const size = 22;
    switch (key) {
      case "home":
        return <Home size={size} color={color} />;
      case "upload":
        return <PlusCircle size={26} color={active ? t.primary : t.primary} />;
      case "myPhotos":
        return <Images size={size} color={color} />;
      case "review":
        return <ClipboardCheck size={size} color={color} />;
      case "events":
        return <CalendarDays size={size} color={color} />;
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.card,
        borderTopWidth: 1,
        borderColor: t.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
        minHeight: 72,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        const center = tab.key === "upload";
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => navigate(tab.key)}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 44 }}
          >
            <View>
              {icon(tab.key, active)}
              {tab.key === "review" && badge > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: t.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={[typography.caption, { color: t.primaryForeground, fontWeight: "700", fontSize: 10 }]}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                typography.caption,
                {
                  color: active ? t.primary : t.mutedForeground,
                  fontWeight: active ? "700" : "600",
                  fontSize: 11,
                },
              ]}
            >
              {tab.label}
            </Text>
            {center ? (
              <View
                style={{
                  position: "absolute",
                  top: -14,
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: active ? t.primary : t.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PlusCircle
                  size={26}
                  color={active ? t.primaryForeground : t.primary}
                />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};
