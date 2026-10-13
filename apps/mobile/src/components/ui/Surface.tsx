import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { elevation, radius as radii, typography } from "../../theme/tokens";

/* The app's base surface: every card, sheet section and list sits on this. */
export const Surface = ({
  children,
  inset = false,
  dashed = false,
  style,
}: {
  children?: React.ReactNode;
  inset?: boolean;
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          borderWidth: 1,
          borderStyle: dashed ? "dashed" : "solid",
          borderColor: t.border + "B3",
          backgroundColor: t.card,
          padding: inset ? 16 : 0,
        },
        elevation.tile,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return <View style={[{ height: 1, backgroundColor: t.border + "B3" }, style]} />;
};

export const SectionHeader = ({
  eyebrow,
  title,
  action,
  onAction,
  style,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }, style]}>
      <View style={{ flexShrink: 1 }}>
        {eyebrow ? (
          <Text
            style={[
              typography.eyebrow,
              { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700" },
            ]}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text numberOfLines={1} style={[typography.heading, { color: t.foreground, fontWeight: "700" }]}>
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[typography.label, { color: t.primary, fontWeight: "600" }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

interface ListRowProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  tone?: "default" | "destructive";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ListRow = ({
  icon,
  label,
  description,
  trailing,
  chevron,
  tone = "default",
  onPress,
  style,
}: ListRowProps) => {
  const t = useTheme();
  const destructive = tone === "destructive";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: destructive ? t.rejectedSoft : t.muted,
          }}
        >
          {icon}
        </View>
      ) : null}
      <View style={{ flexShrink: 1, flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[
            typography.body,
            { fontWeight: "600", color: destructive ? t.destructive : t.foreground },
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={16} color={t.mutedForeground} /> : null}
    </Pressable>
  );
};

export const surfaceStyles = StyleSheet.create({ padding: { padding: 16 } });
