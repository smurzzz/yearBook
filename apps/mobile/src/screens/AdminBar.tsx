import React from "react";
import { Text, View } from "react-native";
import { Images, ShieldAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, LogoMark } from "../components/ui/Media";
import { Button } from "../components/ui/Button";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { ADMIN_ID, personById } from "../prototype/data";
import { useMockApp } from "../prototype/store";

/**
 * Committee app bar. Deliberately unlike the student header: plum surface,
 * a "Yearbook Committee" eyebrow, and the admin avatar instead of a bell.
 */
export const AdminBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { open } = useMockApp();
  const admin = personById(ADMIN_ID);

  return (
    <View style={{ backgroundColor: t.admin, paddingTop: insets.top + 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 2 }}>
        <LogoMark size={26} color={t.adminForeground} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              typography.eyebrow,
              { color: t.adminForeground, textTransform: "uppercase", fontWeight: "700", opacity: 0.7 },
            ]}
          >
            Yearbook Committee
          </Text>
          <Text
            numberOfLines={1}
            style={[typography.subhead, { color: t.adminForeground, fontWeight: "700" }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={[typography.caption, { color: t.adminForeground, opacity: 0.7 }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Button
          size="icon"
          variant="ghost"
          onPress={() => open("profile")}
          accessibilityLabel="Committee profile"
          icon={<Avatar src={admin.avatar} name={admin.name} size="md" tone="admin" />}
        />
      </View>
    </View>
  );
};

/** Shown when a non-admin account reaches the committee workspace. */
export const AccessDeniedState = () => {
  const t = useTheme();
  const { goto } = useMockApp();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.adminSurface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldAlert size={26} color={t.admin} />
      </View>
      <Text
        style={[
          typography.title,
          { fontWeight: "700", color: t.foreground, marginTop: 16, textAlign: "center" },
        ]}
      >
        Committee access only
      </Text>
      <Text
        style={[
          typography.label,
          { color: t.mutedForeground, marginTop: 8, lineHeight: 20, textAlign: "center" },
        ]}
      >
        This workspace is for yearbook committee members. Access is assigned by the committee — it
        can never be self-selected.
      </Text>
      <Button
        title="Go to my photos"
        style={{ marginTop: 20 }}
        onPress={() => goto("myPhotos")}
        icon={<Images size={18} color={t.primaryForeground} />}
      />
    </View>
  );
};
