import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Check, ChevronDown, Minus, Plus } from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { radius as radii, typography } from "../../theme/tokens";

export const FieldLabel = ({
  children,
  required,
  hint,
  style,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }, style]}>
      <Text style={[typography.label, { color: t.foreground, fontWeight: "700" }]}>
        {children}
        {required ? <Text style={{ color: t.destructive }}> *</Text> : null}
      </Text>
      {hint ? (
        <Text style={[typography.caption, { color: t.mutedForeground }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const shell = (t: ReturnType<typeof useTheme>): ViewStyle => ({
  width: "100%",
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: t.input,
  backgroundColor: t.card,
  paddingHorizontal: 14,
});

export const TextField = ({
  label,
  required,
  hint,
  error,
  style,
  ...rest
}: TextInputProps & {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? (
        <FieldLabel required={required} hint={hint}>
          {label}
        </FieldLabel>
      ) : null}
      <View
        style={[
          shell(t),
          {
            height: 48,
            justifyContent: "center",
            borderColor: error ? t.destructive : focused ? t.ring : t.input,
            borderWidth: focused || error ? 2 : 1,
            opacity: rest.editable === false ? 0.5 : 1,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={t.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[typography.body, { color: t.foreground, padding: 0 }]}
          {...rest}
        />
      </View>
      {error ? (
        <Text style={[typography.caption, { color: t.destructive, marginTop: 4 }]}>{error}</Text>
      ) : null}
    </View>
  );
};

export const Textarea = ({
  label,
  required,
  hint,
  style,
  ...rest
}: TextInputProps & {
  label?: string;
  required?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View style={style}>
      {label ? (
        <FieldLabel required={required} hint={hint}>
          {label}
        </FieldLabel>
      ) : null}
      <View style={[shell(t), { minHeight: 92, paddingVertical: 12 }]}>
        <TextInput
          multiline
          textAlignVertical="top"
          placeholderTextColor={t.mutedForeground}
          style={[typography.body, { color: t.foreground, lineHeight: 21, padding: 0 }]}
          {...rest}
        />
      </View>
    </View>
  );
};

/** Search field with the magnifier built into the shell. */
export const SearchField = ({
  value,
  onChange,
  placeholder,
  icon,
  ariaLabel,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        shell(t),
        {
          height: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderColor: focused ? t.ring : t.input,
          borderWidth: focused ? 2 : 1,
        },
        style,
      ]}
    >
      {icon}
      <TextInput
        accessibilityLabel={ariaLabel}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.mutedForeground}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[typography.body, { flex: 1, color: t.foreground, paddingVertical: 0 }]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange("")} hitSlop={8} accessibilityLabel="Clear search">
          <Text style={[typography.caption, { color: t.mutedForeground }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

/** In-frame select: option list opens as a bottom sheet on the device. */
export const Select = ({
  value,
  options,
  onChange,
  placeholder = "Select",
  tone = "brand",
  style,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  tone?: "brand" | "admin";
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[
          shell(t),
          {
            height: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderColor: t.input,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.body,
            { fontWeight: "500", color: selected ? t.foreground : t.mutedForeground, flexShrink: 1 },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={t.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: t.overlay }]} onPress={() => setOpen(false)}>
          <Pressable style={[styles.pickerCard, { backgroundColor: t.popover, borderColor: t.border }]} onPress={() => undefined}>
            <ScrollView style={{ maxHeight: 260 }}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: radii.sm,
                        backgroundColor: isSelected
                          ? tone === "admin"
                            ? t.adminSurface
                            : t.primarySoft
                          : pressed
                            ? t.muted
                            : "transparent",
                      },
                    ]}
                  >
                    <View style={{ flexShrink: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[typography.body, { fontWeight: "600", color: t.foreground }]}
                      >
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text
                          numberOfLines={1}
                          style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Check size={18} color={tone === "admin" ? t.admin : t.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

/** Checkbox with a label — consent rows. */
export const Checkbox = ({
  checked,
  onChange,
  label,
  style,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[{ flexDirection: "row", alignItems: "flex-start", gap: 12 }, style]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? t.primary : t.border,
          backgroundColor: checked ? t.primary : t.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Check size={14} color={t.primaryForeground} strokeWidth={3} /> : null}
      </View>
      {label ? (
        <Text style={[typography.label, { color: t.mutedForeground, lineHeight: 19, flexShrink: 1 }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

export const CheckRow = ({
  checked,
  onChange,
  children,
  style,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <Checkbox checked={checked} onChange={onChange} label={children} style={style} />
);

/** Toggle row (preferences). */
export const SwitchRow = ({
  label,
  description,
  checked,
  onChange,
  style,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingHorizontal: 16, paddingVertical: 14 },
        style,
      ]}
    >
      <View style={{ flexShrink: 1 }}>
        <Text style={[typography.body, { fontWeight: "600", color: t.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: checked ? t.primary : t.border,
          justifyContent: "center",
          alignItems: checked ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: checked ? t.primaryForeground : t.card,
          }}
        />
      </Pressable>
    </View>
  );
};

/** Selectable row with a radio affordance — rejection/removal reasons. */
export const ChoiceRow = ({
  label,
  description,
  selected,
  onSelect,
  style,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: selected ? t.primary : t.border,
          backgroundColor: selected ? t.primarySoft : t.card,
          paddingHorizontal: 14,
          paddingVertical: 12,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? t.primary : t.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} /> : null}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={[typography.body, { fontWeight: "600", color: t.foreground }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 2 }]}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

/** Numeric stepper — max photos per event (at-limit state dims the +). */
export const Stepper = ({
  value,
  min = 1,
  max = 50,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) => {
  const t = useTheme();
  const canDec = value > min;
  const canInc = value < max;
  const btn = (enabled: boolean, icon: React.ReactNode, onPress: () => void, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!enabled}
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: enabled ? t.muted : t.muted + "80",
        opacity: enabled ? 1 : 0.5,
      }}
    >
      {icon}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      {btn(canDec, <Minus size={16} color={t.foreground} />, () => onChange(value - 1), "Decrease")}
      <Text style={[typography.subhead, { color: t.foreground, minWidth: 32, textAlign: "center" }]}>
        {value}
      </Text>
      {btn(canInc, <Plus size={16} color={t.foreground} />, () => onChange(value + 1), "Increase")}
    </View>
  );
};

/**
 * Date field for the event form. Without a native date picker dependency it
 * opens a small sheet with day offsets around the current deadline — enough
 * for the mock, and the real API enforces the deadline anyway.
 */
export const DateTimeField = ({
  value,
  onChange,
  label,
  required,
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  required?: boolean;
}) => {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const base = new Date(value);
  const pretty = base.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const offsets = [-1, 0, 1, 2, 3, 7, 14, 30];
  return (
    <View>
      {label ? (
        <FieldLabel required={required}>{label}</FieldLabel>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[shell(t), { height: 48, alignItems: "center", justifyContent: "space-between", flexDirection: "row" }]}
      >
        <Text style={[typography.body, { color: t.foreground }]}>{pretty}</Text>
        <ChevronDown size={18} color={t.mutedForeground} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: t.overlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.pickerCard, { backgroundColor: t.popover, borderColor: t.border, padding: 12 }]}
            onPress={() => undefined}
          >
            <Text style={[typography.subhead, { color: t.foreground, marginBottom: 8 }]}>
              Move deadline
            </Text>
            {offsets.map((days) => {
              const d = new Date(base);
              d.setDate(d.getDate() + days);
              const iso = d.toISOString();
              const active = new Date(iso).toDateString() === base.toDateString();
              return (
                <Pressable
                  key={days}
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: radii.sm,
                    backgroundColor: active ? t.primarySoft : "transparent",
                  }}
                >
                  <Text style={[typography.body, { color: t.foreground, fontWeight: active ? "700" : "400" }]}>
                    {days === 0 ? "Same day" : `${days > 0 ? "+" : ""}${days} day${Math.abs(days) === 1 ? "" : "s"}`}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  pickerCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 6,
  },
});
