import React, { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Check, TriangleAlert, Undo2, X } from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { elevation, radius as radii, typography } from "../../theme/tokens";
import { Button, IconButton } from "./Button";
import { useMockApp } from "../../prototype/store";

export type SheetSize = "auto" | "tall" | "full";

const FILL = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };

/**
 * The app's bottom sheet (DD-018: one host for all sheets). Modal-based so it
 * stays inside the device screen; slides up 250ms ease-out, short reverse on
 * close, backdrop tap dismisses.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  description,
  size = "auto",
  footer,
  hideClose = false,
  bare = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: SheetSize;
  footer?: React.ReactNode;
  hideClose?: boolean;
  /** Cover-led sheets: no handle, floating close button over the artwork. */
  bare?: boolean;
  children: React.ReactNode;
}) => {
  const t = useTheme();
  const [translateY] = useState(() => new Animated.Value(320));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!open) return;
    translateY.setValue(320);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [fade, open, translateY]);

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={FILL}>
        <Animated.View style={[FILL, { opacity: fade }]}>
          <Pressable
            style={[FILL, { backgroundColor: t.canvas + "99" }]}
            onPress={onClose}
            accessibilityLabel="Close"
          />
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: size === "auto" ? "88%" : "100%",
                height: size === "full" ? "100%" : size === "tall" ? "86%" : undefined,
                borderTopLeftRadius: size === "full" ? 0 : radii.sheetTop,
                borderTopRightRadius: size === "full" ? 0 : radii.sheetTop,
                backgroundColor: t.background,
                borderTopWidth: 1,
                borderColor: t.border,
                transform: [{ translateY }],
              },
              elevation.sheet,
            ]}
          >
            {bare ? null : (
              <View style={{ alignItems: "center", paddingTop: 10 }}>
                <View style={{ height: 6, width: 40, borderRadius: 3, backgroundColor: t.border }} />
              </View>
            )}
            {title ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 12,
                }}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text style={[typography.heading, { color: t.foreground, fontWeight: "700" }]}>
                    {title}
                  </Text>
                  {description ? (
                    <Text style={[typography.label, { color: t.mutedForeground, marginTop: 4 }]}>
                      {description}
                    </Text>
                  ) : null}
                </View>
                {hideClose ? null : (
                  <IconButton
                    size="iconSm"
                    variant="muted"
                    onPress={onClose}
                    accessibilityLabel="Close"
                    icon={<X size={17} color={t.foreground} />}
                  />
                )}
              </View>
            ) : hideClose ? null : (
              <View style={{ position: "absolute", right: 16, top: 16, zIndex: 20 }}>
                <IconButton
                  size="iconSm"
                  variant={bare ? "onPhoto" : "muted"}
                  onPress={onClose}
                  accessibilityLabel="Close"
                  icon={<X size={17} color={bare ? t.onImage : t.foreground} />}
                />
              </View>
            )}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.background,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 28,
                }}
              >
                {footer}
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/** Centered confirmation dialog (spec §7). */
export const Dialog = ({
  open,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "destructive",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  icon?: React.ReactNode;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "destructive" | "brand";
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const t = useTheme();
  const [scale] = useState(() => new Animated.Value(0.94));
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!open) return;
    fade.setValue(0);
    scale.setValue(0.94);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [fade, open, scale]);

  if (!open) return null;

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={onCancel}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Pressable
          style={[FILL, { backgroundColor: t.canvas + "A6" }]}
          onPress={onCancel}
          accessibilityLabel="Cancel"
        />
        <Animated.View
          style={[
            {
              width: "100%",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.background,
              padding: 20,
              alignItems: "center",
            },
            elevation.sheet,
            { opacity: fade, transform: [{ scale }] },
          ]}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: tone === "destructive" ? t.rejectedSoft : t.primarySoft,
            }}
          >
            {icon ?? (
              <TriangleAlert size={20} color={tone === "destructive" ? t.rejectedForeground : t.primary} />
            )}
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
              { color: t.mutedForeground, marginTop: 6, lineHeight: 20, textAlign: "center" },
            ]}
          >
            {message}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 20, alignSelf: "stretch" }}>
            <Button title={cancelLabel} variant="outline" style={{ flex: 1 }} onPress={onCancel} />
            <Button
              title={confirmLabel}
              variant={tone === "destructive" ? "destructive" : "primary"}
              style={{ flex: 1 }}
              onPress={onConfirm}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const TOAST_LIFETIME = 4200;

/** In-frame toast: Undo after approve/reject, and success confirmations. */
export const ToastHost = ({ bottom = 104 }: { bottom?: number }) => {
  const { state, dispatch } = useMockApp();
  const t = useTheme();
  const toast = state.toast;
  const key = toast?.key ?? 0;
  const [translateY] = useState(() => new Animated.Value(24));

  useEffect(() => {
    if (!toast) return;
    translateY.setValue(24);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
    const timer = setTimeout(() => dispatch({ type: "dismissToast" }), TOAST_LIFETIME);
    return () => clearTimeout(timer);
  }, [dispatch, key, toast, translateY]);

  if (!toast) return null;
  const isUndo = toast.kind === "undo";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom,
        transform: [{ translateY }],
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: t.onImageBorder,
          backgroundColor: t.canvas + "F2",
          paddingHorizontal: 14,
          paddingVertical: 12,
          maxWidth: 360,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isUndo ? t.onImageSurface : t.approved + "40",
          }}
        >
          {isUndo ? <Undo2 size={16} color={t.onImage} /> : <Check size={16} color={t.approved} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[typography.label, { fontWeight: "700", color: t.onImage }]}>
            {toast.title}
          </Text>
          {toast.description ? (
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: t.onImage, opacity: 0.8, marginTop: 2 }]}
            >
              {toast.description}
            </Text>
          ) : null}
        </View>
        {isUndo ? (
          <Button
            title={toast.actionLabel ?? "Undo"}
            size="sm"
            variant="onPhoto"
            onPress={() => dispatch({ type: "undo" })}
          />
        ) : null}
      </View>
    </Animated.View>
  );
};
