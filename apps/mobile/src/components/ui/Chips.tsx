import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import {
  CalendarClock,
  Check,
  Clock3,
  Flag,
  GraduationCap,
  Layers,
  Lock,
  ShieldCheck,
  Unlock,
  X,
} from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { radius as radii, typography } from "../../theme/tokens";
import { countdown } from "../../prototype/format";
import type { PhotoStatus } from "../../prototype/types";

/* =========================================================================
   Indicators. House rule: status is NEVER color alone — every indicator
   carries an icon AND a text label, so it survives grayscale and print.
   ========================================================================= */

type Tone = "pending" | "approved" | "rejected" | "reported";

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  tone?: "brand" | "admin";
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Selectable filter / tag chip (student event row, admin filters, tagging). */
export const Chip = ({ children, selected, tone = "brand", icon, onPress, style }: ChipProps) => {
  const t = useTheme();
  const active = Boolean(selected);
  const bg = active ? (tone === "admin" ? t.admin : t.primary) : t.card;
  const fg = active ? (tone === "admin" ? t.adminForeground : t.primaryForeground) : t.mutedForeground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 36,
          paddingHorizontal: 14,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: active ? "transparent" : t.border,
          backgroundColor: bg,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <Text style={[typography.label, { color: fg, fontWeight: "600" }]}>{children}</Text>
    </Pressable>
  );
};

/** Horizontal chip row with a right-edge fade (accessibility rule §8). */
export const ChipRow = ({
  children,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ gap: 8, paddingVertical: 4, paddingRight: 24 }, contentStyle]}
      >
        {children}
      </ScrollView>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end" }}>
          {[0.5, 0.35, 0.2, 0.08].map((o) => (
            <View key={o} style={{ width: 7, backgroundColor: t.background, opacity: o }} />
          ))}
        </View>
      </View>
    </View>
  );
};

/** Read-only chip for photo metadata in the viewer and detail sheets. */
export const MetaChip = ({
  children,
  icon,
  style,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: radii.pill,
          backgroundColor: t.muted,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[typography.caption, { color: t.mutedForeground, fontWeight: "600" }]}>
        {children}
      </Text>
    </View>
  );
};

const toneSoft = (tone: Tone, t: ReturnType<typeof useTheme>): string =>
  tone === "pending"
    ? t.pendingSoft
    : tone === "approved"
      ? t.approvedSoft
      : tone === "rejected"
        ? t.rejectedSoft
        : t.reportedSoft;

const toneFg = (tone: Tone, t: ReturnType<typeof useTheme>): string =>
  tone === "pending"
    ? t.pendingForeground
    : tone === "approved"
      ? t.approvedForeground
      : tone === "rejected"
        ? t.rejectedForeground
        : t.reportedForeground;

const TONE_LABEL: Record<Tone, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reported: "Reported",
};

const ToneIcon = ({ tone, size, color }: { tone: Tone; size: number; color: string }) => {
  switch (tone) {
    case "pending":
      return <Clock3 size={size} color={color} />;
    case "approved":
      return <Check size={size} color={color} />;
    case "rejected":
      return <X size={size} color={color} />;
    case "reported":
      return <Flag size={size} color={color} />;
  }
};

interface StatusChipProps {
  tone: Tone;
  label?: string;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

/** Admin-facing status pill. Never rendered on a student surface. */
export const StatusChip = ({ tone, label, size = "sm", style }: StatusChipProps) => {
  const t = useTheme();
  const fg = toneFg(tone, t);
  return (
    <View
      accessibilityLabel={`${label ?? TONE_LABEL[tone]}`}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: radii.pill,
          backgroundColor: toneSoft(tone, t),
          paddingHorizontal: size === "sm" ? 8 : 10,
          paddingVertical: size === "sm" ? 3 : 4,
        },
        style,
      ]}
    >
      <ToneIcon tone={tone} size={size === "sm" ? 14 : 16} color={fg} />
      <Text
        style={[
          size === "sm" ? typography.caption : typography.label,
          { color: fg, fontWeight: "600" },
        ]}
      >
        {label ?? TONE_LABEL[tone]}
      </Text>
    </View>
  );
};

/** Compact tile overlay: icon in a filled disc + accessible label. */
export const StatusIcon = ({ status, style }: { status: PhotoStatus; style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  const bg =
    status === "pending" ? t.pending : status === "approved" ? t.approved : t.rejected;
  return (
    <View
      accessibilityLabel={TONE_LABEL[status]}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: radii.pill,
          backgroundColor: bg,
          paddingHorizontal: 6,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <ToneIcon tone={status} size={14} color={t.onImage} />
    </View>
  );
};

export const ReportedBadge = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <StatusChip tone="reported" style={style} />
);

/** Deadline countdown. Highlighted under 3 days, muted once closed. */
export const CountdownChip = ({
  deadline,
  style,
  withIcon = true,
}: {
  deadline: string;
  style?: StyleProp<ViewStyle>;
  withIcon?: boolean;
}) => {
  const t = useTheme();
  const info = countdown(deadline);
  const bg = info.closed
    ? t.muted
    : info.urgent
      ? t.pendingSoft
      : t.primary + "1A";
  const fg = info.closed
    ? t.mutedForeground
    : info.urgent
      ? t.pendingForeground
      : t.primary;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: radii.pill,
          backgroundColor: bg,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      {withIcon ? (
        info.closed ? (
          <CalendarClock size={14} color={fg} />
        ) : (
          <Clock3 size={14} color={fg} />
        )
      ) : null}
      <Text style={[typography.caption, { color: fg, fontWeight: "600" }]}>{info.label}</Text>
      {info.urgent ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.pending }} />
      ) : null}
    </View>
  );
};

export const RoleBadge = ({ role, style }: { role: "student" | "admin"; style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  const admin = role === "admin";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: radii.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: admin ? t.admin : t.primarySoft,
        },
        style,
      ]}
    >
      {admin ? (
        <ShieldCheck size={14} color={t.adminForeground} />
      ) : (
        <GraduationCap size={14} color={t.primary} />
      )}
      <Text
        style={[
          typography.caption,
          { color: admin ? t.adminForeground : t.primary, fontWeight: "600" },
        ]}
      >
        {admin ? "Yearbook Committee" : "Student"}
      </Text>
    </View>
  );
};

export const StackBadge = ({ count, style }: { count?: number; style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Multi-photo batch"
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          borderRadius: radii.pill,
          backgroundColor: t.onImageSurface,
          paddingHorizontal: 6,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Layers size={14} color={t.onImage} />
      {count && count > 1 ? (
        <Text style={[typography.caption, { color: t.onImage, fontWeight: "600" }]}>{count}</Text>
      ) : null}
    </View>
  );
};

export const UnreadDot = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Unread"
      style={[
        { width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary, borderWidth: 2, borderColor: t.card },
        style,
      ]}
    />
  );
};

/** Open / Closed badge used on the admin event cards. */
export const OpenClosedBadge = ({ isOpen, style }: { isOpen: boolean; style?: StyleProp<ViewStyle> }) => (
  <StatusChip tone={isOpen ? "approved" : "rejected"} label={isOpen ? "Open" : "Closed"} style={style} />
);

/** Compact submission-count pill (admin events). */
export const CountBadge = ({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          borderRadius: radii.pill,
          backgroundColor: t.muted,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text style={[typography.caption, { color: t.mutedForeground, fontWeight: "600" }]}>
        {count} photos
      </Text>
    </View>
  );
};

/** Review | All photos segmented control (admin surfaces). */
export const SegmentedControl = ({
  segments,
  value,
  onChange,
  surface,
}: {
  segments: { key: string; label: string; badge?: number }[];
  value: string;
  onChange: (key: string) => void;
  surface?: string;
}) => {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: t.background,
        borderRadius: radii.pill,
        padding: 4,
      }}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(seg.key)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 8,
              borderRadius: radii.pill,
              backgroundColor: active ? surface ?? t.admin : "transparent",
            }}
          >
            <Text
              style={[
                typography.label,
                {
                  fontWeight: "700",
                  color: active ? t.adminForeground : t.mutedForeground,
                },
              ]}
            >
              {seg.label}
            </Text>
            {seg.key === "review" && seg.badge !== undefined && seg.badge > 0 ? (
              <View
                style={{
                  borderRadius: radii.pill,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: active
                    ? t.adminForeground + "33"
                    : t.mutedForeground + "26",
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { fontWeight: "700", color: active ? t.adminForeground : t.mutedForeground },
                  ]}
                >
                  {seg.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

/** Lock/unlock label chip on the student event card footer. */
export const SubmissionStateLabel = ({ closed }: { closed: boolean }) => {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {closed ? <Lock size={14} color={t.mutedForeground} /> : <Unlock size={14} color={t.mutedForeground} />}
      <Text
        style={[
          typography.caption,
          { color: t.mutedForeground, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
        ]}
      >
        {closed ? "Submissions closed" : "Submissions open"}
      </Text>
    </View>
  );
};
