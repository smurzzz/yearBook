import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { radius as radii } from "../../theme/tokens";

/* =========================================================================
   Button — the app's action recipe. Pill geometry, ≥44px touch target,
   white text on the primary color (non-negotiable rule #12).
   ========================================================================= */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "muted"
  | "destructive"
  | "admin"
  | "onPhoto";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm" | "iconXs";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override the variant background (e.g. status-tinted outline buttons). */
  tone?: string;
  /** Override the label color. */
  titleColor?: string;
}

const SIZE: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 13 },
  md: { height: 44, paddingHorizontal: 20, fontSize: 15 },
  lg: { height: 48, paddingHorizontal: 24, fontSize: 17 },
  icon: { height: 44, paddingHorizontal: 0, fontSize: 15 },
  iconSm: { height: 36, paddingHorizontal: 0, fontSize: 13 },
  iconXs: { height: 28, paddingHorizontal: 0, fontSize: 12 },
};

export const Button = ({
  title,
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  icon,
  iconRight,
  children,
  style,
  disabled,
  tone,
  titleColor,
  ...rest
}: ButtonProps) => {
  const t = useTheme();
  const m = SIZE[size];
  const round = size === "icon" || size === "iconSm" || size === "iconXs";
  const labelSize = children ? (size === "lg" ? 17 : size === "sm" ? 13 : 15) : m.fontSize;

  const backgroundColor = ((): string => {
    switch (variant) {
      case "primary":
        return tone ?? t.primary;
      case "secondary":
        return t.secondary;
      case "outline":
        return t.card;
      case "ghost":
      case "onPhoto":
        return "transparent";
      case "muted":
        return t.muted;
      case "destructive":
        return t.destructive;
      case "admin":
        return t.admin;
    }
  })();

  const textColor = ((): string => {
    if (titleColor) return titleColor;
    switch (variant) {
      case "primary":
        return t.primaryForeground;
      case "secondary":
        return t.secondaryForeground;
      case "outline":
      case "ghost":
        return t.foreground;
      case "muted":
        return t.mutedForeground;
      case "destructive":
        return t.destructiveForeground;
      case "admin":
        return t.adminForeground;
      case "onPhoto":
        return t.onImage;
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          minHeight: m.height,
          minWidth: round ? m.height : undefined,
          paddingHorizontal: round ? 0 : m.paddingHorizontal,
          borderRadius: radii.pill,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: t.border,
          opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
          alignSelf: block ? "stretch" : "center",
          flexDirection: children ? "row" : "column",
        },
        variant === "onPhoto" && { borderColor: t.onImageBorder },
        style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={textColor} size="small" /> : null}
      {!loading && icon ? icon : null}
      {title ? (
        <Text
          numberOfLines={1}
          style={{
            color: textColor,
            fontSize: labelSize,
            lineHeight: labelSize + 5,
            fontWeight: "600",
            letterSpacing: -0.15,
            marginHorizontal: icon || iconRight || children ? 6 : 0,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
      {iconRight ? iconRight : null}
    </Pressable>
  );
};

/** Square-ish icon-only control (headers, photo viewer, close buttons). */
export const IconButton = ({ variant = "ghost", size = "icon", ...props }: ButtonProps) => (
  <Button variant={variant} size={size} {...props} />
);

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
