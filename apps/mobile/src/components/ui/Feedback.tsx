import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Check,
  CloudOff,
  FileArchive,
  Info,
  RefreshCw,
  TriangleAlert,
  Upload,
  Wifi,
} from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { radius as radii, typography } from "../../theme/tokens";
import { img } from "../../prototype/assets";
import { Button } from "./Button";
import type { UploadItem } from "../../prototype/types";

const FILL = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };

/* ------------------------------- Skeletons ------------------------------- */

export const Skeleton = ({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      style={[{ backgroundColor: t.muted, borderRadius: 8, opacity }, style]}
    />
  );
};

export const SkeletonTile = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <Skeleton style={[{ aspectRatio: 1, width: "100%", borderRadius: radii.tile }, style]} />
);

export const SkeletonLine = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <Skeleton style={[{ height: 12, width: "100%", borderRadius: 999 }, style]} />
);

export const SkeletonCard = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: t.border + "B3",
          backgroundColor: t.card,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Skeleton style={{ height: 144, borderRadius: 0 }} />
      <View style={{ gap: 8, padding: 16 }}>
        <SkeletonLine style={{ width: "66%" }} />
        <SkeletonLine style={{ height: 10, width: "33%" }} />
      </View>
    </View>
  );
};

export const SkeletonGrid = ({ count = 9 }: { count?: number }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonTile key={i} style={{ width: "33.1%" }} />
    ))}
  </View>
);

/* -------------------------------- Banners -------------------------------- */

interface InlineBannerProps {
  tone?: "info" | "warning" | "error" | "success";
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  style?: StyleProp<ViewStyle>;
}

export const InlineBanner = ({
  tone = "info",
  icon,
  title,
  message,
  action,
  style,
}: InlineBannerProps) => {
  const t = useTheme();
  const palette = {
    info: { bg: t.primarySoft, fg: t.primary, border: t.primary + "40" },
    warning: { bg: t.pendingSoft, fg: t.pendingForeground, border: t.pending + "4D" },
    error: { bg: t.rejectedSoft, fg: t.rejectedForeground, border: t.rejected + "4D" },
    success: { bg: t.approvedSoft, fg: t.approvedForeground, border: t.approved + "4D" },
  }[tone];
  const Icon = icon ?? (tone === "info" || tone === "success" ? Info : TriangleAlert);
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={[
        {
          flexDirection: "row",
          gap: 12,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          padding: 14,
        },
        style,
      ]}
    >
      <Icon size={18} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>{title}</Text>
        {message ? (
          <Text style={[typography.caption, { color: t.foreground, opacity: 0.9, marginTop: 4, lineHeight: 17 }]}>
            {message}
          </Text>
        ) : null}
        {action ? (
          <Button
            title={action.label}
            variant="outline"
            size="sm"
            style={{ alignSelf: "flex-start", marginTop: 10 }}
            onPress={action.onClick}
          />
        ) : null}
      </View>
    </View>
  );
};

/** Persistent offline strip pinned above the tab bar. */
export const OfflineBanner = () => {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: t.pendingSoft,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <CloudOff size={16} color={t.pendingForeground} />
      <Text style={[typography.caption, { color: t.pendingForeground, fontWeight: "600" }]}>
        No connection. Your photos are saved and will retry.
      </Text>
    </View>
  );
};

export const ReconnectedBanner = () => {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: t.approvedSoft,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Wifi size={16} color={t.approvedForeground} />
      <Text style={[typography.caption, { color: t.approvedForeground, fontWeight: "600" }]}>
        Back online. Retrying your uploads.
      </Text>
    </View>
  );
};

/* ------------------------------ Empty states ------------------------------ */

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  message: string;
  action?: { label: string; onClick: () => void; icon?: React.ComponentType<{ size?: number; color?: string }> };
  variant?: "screen" | "inset";
  style?: StyleProp<ViewStyle>;
}

export const EmptyState = ({
  icon: Icon,
  title,
  message,
  action,
  variant = "screen",
  style,
}: EmptyStateProps) => {
  const t = useTheme();
  const screen = variant === "screen";
  return (
    <View
      style={[
        {
          alignItems: "center",
          paddingHorizontal: screen ? 24 : 20,
          paddingVertical: screen ? 56 : 32,
          borderRadius: screen ? undefined : radii.md,
          borderStyle: screen ? undefined : "dashed",
          borderWidth: screen ? 0 : 1,
          borderColor: t.border,
        },
        style,
      ]}
    >
      <View
        style={{
          width: screen ? 56 : 44,
          height: screen ? 56 : 44,
          borderRadius: 28,
          backgroundColor: t.muted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={screen ? 26 : 20} color={t.mutedForeground} />
      </View>
      <Text
        style={[
          typography.subhead,
          { fontWeight: "700", color: t.foreground, marginTop: 14, textAlign: "center" },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.label,
          { color: t.mutedForeground, marginTop: 4, textAlign: "center", maxWidth: 260 },
        ]}
      >
        {message}
      </Text>
      {action ? (
        <Button
          title={action.label}
          onPress={action.onClick}
          style={{ marginTop: 16 }}
          icon={action.icon ? <action.icon size={18} color={t.primaryForeground} /> : undefined}
        />
      ) : null}
    </View>
  );
};

/** Camera / gallery permission prompt used in the upload states. */
export const PermissionPrompt = ({
  icon: Icon,
  title,
  message,
  allowLabel,
  denyLabel = "Not now",
  onAllow,
  onDeny,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  message: string;
  allowLabel: string;
  denyLabel?: string;
  onAllow: () => void;
  onDeny: () => void;
}) => {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 24, paddingVertical: 32 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={26} color={t.primary} />
      </View>
      <Text style={[typography.subhead, { fontWeight: "700", color: t.foreground, marginTop: 14, textAlign: "center" }]}>
        {title}
      </Text>
      <Text style={[typography.label, { color: t.mutedForeground, marginTop: 6, textAlign: "center", maxWidth: 280 }]}>
        {message}
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 20, alignSelf: "stretch" }}>
        <Button title={denyLabel} variant="outline" style={{ flex: 1 }} onPress={onDeny} />
        <Button title={allowLabel} style={{ flex: 1 }} onPress={onAllow} />
      </View>
    </View>
  );
};

/** Full-screen takeover for maintenance. */
export const MaintenanceState = ({ onRetry }: { onRetry: () => void }) => {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.pendingSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TriangleAlert size={26} color={t.pendingForeground} />
      </View>
      <Text style={[typography.title, { color: t.foreground, marginTop: 16, textAlign: "center" }]}>
        Down for maintenance
      </Text>
      <Text style={[typography.label, { color: t.mutedForeground, marginTop: 8, textAlign: "center" }]}>
        The yearbook upload service is being updated. Your drafts are safe on this device.
      </Text>
      <Button
        title="Try again"
        style={{ marginTop: 20 }}
        onPress={onRetry}
        icon={<RefreshCw size={18} color={t.primaryForeground} />}
      />
    </View>
  );
};

export const Spinner = ({ size = 20, color }: { size?: number; color?: string }) => {
  const t = useTheme();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: t.border,
        borderTopColor: color ?? t.primary,
        transform: [{ rotate }],
      }}
    />
  );
};

/** Dark scrim over photography so overlaid text stays legible. */
export const PhotoScrim = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <View
    pointerEvents="none"
    style={[
      FILL,
      { backgroundColor: "transparent" },
      style,
      {
        // Vertical fade approximation: dark at bottom, clear at top.
        shadowColor: "#06060F",
        shadowOpacity: 0.9,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
    ]}
  />
);

/* --------------------------------- Upload -------------------------------- */

export const Meter = ({
  value,
  tone = "brand",
  style,
}: {
  value: number;
  tone?: "brand" | "admin" | "failed" | "done";
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const color =
    tone === "admin"
      ? t.admin
      : tone === "failed"
        ? t.rejected
        : tone === "done"
          ? t.approved
          : t.primary;
  return (
    <View style={[{ height: 6, width: "100%", borderRadius: 999, backgroundColor: t.muted, overflow: "hidden" }, style]}>
      <View
        style={{
          height: "100%",
          borderRadius: 999,
          backgroundColor: color,
          width: `${Math.max(0, Math.min(100, value))}%`,
        }}
      />
    </View>
  );
};

const UPLOAD_LABELS: Record<UploadItem["status"], string> = {
  waiting: "Waiting",
  compressing: "Compressing",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
};

/** One row of the Upload Progress sheet: thumb, per-photo bar, status label. */
export const UploadRow = ({
  item,
  index,
  onRetry,
}: {
  item: UploadItem;
  index: number;
  onRetry?: () => void;
}) => {
  const t = useTheme();
  const busy = item.status === "compressing" || item.status === "uploading";
  const statusColor =
    item.status === "failed"
      ? t.rejectedForeground
      : item.status === "done"
        ? t.approvedForeground
        : item.status === "waiting"
          ? t.mutedForeground
          : t.primary;

  const StatusIcon =
    item.status === "done"
      ? Check
      : item.status === "failed"
        ? TriangleAlert
        : item.status === "compressing"
          ? FileArchive
          : Upload;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.sm,
          overflow: "hidden",
          backgroundColor: t.muted,
          opacity: item.status === "failed" ? 0.55 : 1,
        }}
      >
        <Image source={img(item.src)} style={{ width: 44, height: 44 }} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <Text numberOfLines={1} style={[typography.label, { fontWeight: "600", color: t.foreground, flex: 1 }]}>
            IMG_{4200 + index}.HEIC
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <StatusIcon size={14} color={statusColor} opacity={busy ? 0.6 : 1} />
            <Text style={[typography.caption, { color: statusColor, fontWeight: "600" }]}>
              {UPLOAD_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
          <Meter
            value={item.status === "done" || item.status === "failed" ? 100 : item.progress}
            tone={item.status === "failed" ? "failed" : item.status === "done" ? "done" : "brand"}
            style={{ flex: 1 }}
          />
          {item.status === "failed" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {item.failNote ? (
                <Text style={[typography.caption, { color: t.rejectedForeground, fontWeight: "600" }]}>
                  {item.failNote}
                </Text>
              ) : null}
              {onRetry ? (
                <Button
                  title="Retry"
                  variant="outline"
                  size="sm"
                  onPress={onRetry}
                  icon={<RefreshCw size={14} color={t.foreground} />}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

/** Small caption-style inline note (privacy hints under grids). */
export const InlineNote = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: 8,
          borderRadius: radii.md,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: t.border,
          backgroundColor: t.muted + "66",
          padding: 12,
        },
        style,
      ]}
    >
      <Info size={16} color={t.mutedForeground} />
      <Text style={[typography.caption, { color: t.mutedForeground, lineHeight: 17, flex: 1 }]}>
        {children as string}
      </Text>
    </View>
  );
};

export const PressableCard = ({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: t.border + "B3",
          backgroundColor: t.card,
          padding: 14,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};
