import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  BellOff,
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Flag,
  HelpCircle,
  LifeBuoy,
  LogOut,
  MessageCircleQuestion,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { Sheet } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Media";
import { FieldLabel, Select, SwitchRow, TextField } from "../components/ui/Fields";
import { EmptyState, InlineBanner } from "../components/ui/Feedback";
import { ListRow, Surface } from "../components/ui/Surface";
import { RoleBadge, UnreadDot } from "../components/ui/Chips";
import { useMockApp } from "../prototype/store";
import { useSession } from "../session";
import { api, isApiError, isOffline, USE_MOCK } from "../api";
import { useNotificationsSync } from "../api/sync";
import { CONSENT_VERSION } from "@yearbookhub/shared";
import {
  ADMIN_ID,
  FIRST_TIME_SETUP_CLUBS_NOTE,
  FAQ,
  PRIVACY_SECTIONS,
  SCHOOL_NAME,
  STUDENT_ID,
  personById,
} from "../prototype/data";
import { relativeTime } from "../prototype/format";
import { unreadCount } from "../prototype/selectors";
import { CLUBS, type NotificationKind } from "../prototype/types";

const EYEBROW = {
  textTransform: "uppercase" as const,
  fontWeight: "700" as const,
};

/** Sheet 1 — First-Time Setup. Shown once, right after the first Google sign-in. */
export const FirstTimeSetupSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close } = useMockApp();
  const session = useSession();
  const [name, setName] = useState(session.fullName ?? state.studentName);
  const [club, setClub] = useState<string | null>(state.studentClub);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const person = personById(STUDENT_ID);
  /* Real build: the signed-in Google identity; the demo picker keeps fixtures. */
  const googleEmail = session.email ?? person.email;
  const googleAvatar = session.avatarUrl ?? person.avatar;

  /* Real build: this is POST /me — the bootstrap that stores consent, resolves
     the club id, and decides the role server-side (api.md §3, authentication.md §6). */
  const submitSetup = async () => {
    const fullName = name.trim() || state.studentName;
    if (USE_MOCK) {
      dispatch({ type: "finishSetup", name: fullName, club: club as never });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const lookups = await api.lookups();
      const user = await api.createMe({
        full_name: fullName,
        club_id: lookups.clubs.find((c) => c.name === club)?.id ?? null,
        consent: true,
        consent_version: CONSENT_VERSION,
      });
      dispatch({
        type: "finishSetup",
        name: user.full_name,
        club: (user.club?.name ?? null) as never,
      });
    } catch (error) {
      const code = isApiError(error) ? error.code : null;
      if (code === "EMAIL_DOMAIN_NOT_ALLOWED") {
        dispatch({ type: "signOut" });
        dispatch({ type: "authIssue", issue: "nonSchool" });
        close();
      } else if (isOffline(error)) {
        dispatch({ type: "setNetwork", network: "offline" });
        setSaveError("No connection. Check your network and try again.");
      } else {
        setSaveError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="You're in!"
      description="One quick step and your photos go to the right chapter."
      hideClose
      footer={
        <Button
          block
          size="lg"
          title="Get started"
          disabled={saving}
          onPress={() => void submitSetup()}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {saveError ? (
          <InlineBanner tone="error" title="Setup" message={saveError} style={{ marginBottom: 12 }} />
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 16,
            backgroundColor: t.muted,
            padding: 14,
          }}
        >
          <Avatar src={googleAvatar} name={name} size="lg" />
          <View style={{ flexShrink: 1 }}>
            <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
              Signed in with Google
            </Text>
            <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground }]}>
              {googleEmail}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <TextField
            label="Full name"
            required
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 6 }]}>
            Taken from your Google account. This is how the committee credits your photos.
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Optional">Club</FieldLabel>
          <Select
            value={club}
            placeholder="None"
            options={[{ value: "none", label: "None" }, ...CLUBS.map((c) => ({ value: c, label: c }))]}
            onChange={(value) => setClub(value === "none" ? null : value)}
          />
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 6 }]}>
            {FIRST_TIME_SETUP_CLUBS_NOTE}
          </Text>
        </View>

        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 20, lineHeight: 17 }]}>
          Committee access is assigned by the yearbook adviser. You cannot turn it on yourself.
        </Text>
      </View>
    </Sheet>
  );
};

/** Sheet 2 — Profile. One sheet, two role variants. */
export const ProfileSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  const admin = state.role === "admin";
  const person = personById(admin ? ADMIN_ID : STUDENT_ID);
  const name = admin ? person.name : state.studentName;

  return (
    <Sheet open={open} onClose={close} title={admin ? "Committee profile" : "Profile"}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Surface style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar src={person.avatar} name={name} size="lg" tone={admin ? "admin" : "brand"} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[typography.subhead, { fontWeight: "700", color: t.foreground }]}>
                {name}
              </Text>
              <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground }]}>
                {person.email}
              </Text>
              <View style={{ marginTop: 8 }}>
                <RoleBadge role={state.role} />
              </View>
            </View>
          </View>
          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              backgroundColor: t.muted,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <BookOpenCheck size={16} color={t.mutedForeground} />
            <Text style={[typography.caption, { color: t.mutedForeground, flexShrink: 1 }]}>
              {admin ? "Yearbook Committee · assigned by the adviser" : state.studentClub ?? "No club"}
            </Text>
          </View>
        </Surface>

        <Text style={[typography.eyebrow, { ...EYEBROW, color: t.mutedForeground, marginTop: 18 }]}>
          Preferences
        </Text>
        <Surface style={{ marginTop: 8, overflow: "hidden" }}>
          <SwitchRow
            label="Dark mode"
            description="Match the app to your phone"
            checked={state.theme === "dark"}
            onChange={(value) => dispatch({ type: "setTheme", theme: value ? "dark" : "light" })}
          />
          <View style={{ height: 1, backgroundColor: t.border, opacity: 0.7, marginHorizontal: 16 }} />
          <SwitchRow
            label="Deadline reminders"
            description={admin ? "When an event is closing soon" : "2 days before an event closes"}
            checked={state.deadlineReminders}
            onChange={() => {
              // P6: the preference persists via PATCH /me (T-095 honors it server-side).
              const next = !state.deadlineReminders;
              void api.patchMe({ notify_deadlines: next }).catch(() => undefined);
              dispatch({ type: "togglePreference", key: "deadlineReminders" });
            }}
          />
          <View style={{ height: 1, backgroundColor: t.border, opacity: 0.7, marginHorizontal: 16 }} />
          <SwitchRow
            label={admin ? "Review queue updates" : "Review results"}
            description={
              admin ? "New submissions and removal requests" : "When a photo is approved or needs replacing"
            }
            checked={state.reviewResults}
            onChange={() => {
              const next = !state.reviewResults;
              void api.patchMe({ notify_reviews: next }).catch(() => undefined);
              dispatch({ type: "togglePreference", key: "reviewResults" });
            }}
          />
        </Surface>

        <Text style={[typography.eyebrow, { ...EYEBROW, color: t.mutedForeground, marginTop: 18 }]}>
          About
        </Text>
        <Surface style={{ marginTop: 8, overflow: "hidden" }}>
          <ListRow
            icon={<ShieldCheck size={18} />}
            label="Privacy Notice"
            description="Data use, visibility, your rights"
            chevron
            onPress={() => openOverlay("privacy")}
          />
          <View style={{ height: 1, backgroundColor: t.border, opacity: 0.7, marginHorizontal: 16 }} />
          <ListRow
            icon={<HelpCircle size={18} />}
            label="Help and FAQ"
            description="Limits, deadlines, removal requests"
            chevron
            onPress={() => openOverlay("help")}
          />
          <View style={{ height: 1, backgroundColor: t.border, opacity: 0.7, marginHorizontal: 16 }} />
          <ListRow
            icon={<BellRing size={18} />}
            label="Notifications"
            description={
              state.notificationsEnabled ? "Deadline and review alerts are on" : "Currently turned off"
            }
            trailing={<ChevronRight size={16} color={t.mutedForeground} />}
            onPress={() => openOverlay("notifPermission")}
          />
        </Surface>

        <Text style={[typography.eyebrow, { ...EYEBROW, color: t.mutedForeground, marginTop: 18 }]}>
          Account
        </Text>
        <Surface style={{ marginTop: 8, overflow: "hidden" }}>
          <ListRow icon={<LogOut size={18} />} label="Log out" onPress={() => ask("logout")} />
          <View style={{ height: 1, backgroundColor: t.border, opacity: 0.7, marginHorizontal: 16 }} />
          <ListRow
            icon={<Trash2 size={18} />}
            label="Delete account"
            description="Removes every photo you uploaded"
            tone="destructive"
            onPress={() => ask("deleteAccount")}
          />
        </Surface>

        <Text style={[typography.caption, { color: t.mutedForeground, textAlign: "center", marginTop: 16 }]}>
          {SCHOOL_NAME} Yearbook · v1.0
        </Text>
      </View>
    </Sheet>
  );
};

/** Sheet 3 — Privacy Notice. Linked from Sign In, Profile, and every caption. */
export const PrivacyNoticeSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { close, open: openOverlay } = useMockApp();

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title="Privacy Notice"
      description={`How ${SCHOOL_NAME} handles the photos you submit.`}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            block
            variant="outline"
            title="Read the FAQ instead"
            icon={<FileText size={17} color={t.foreground} />}
            onPress={() => openOverlay("help")}
          />
          <Button block title="I understand" onPress={close} />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            borderRadius: 16,
            backgroundColor: t.primary + "14",
            padding: 14,
          }}
        >
          <ShieldCheck size={18} color={t.primary} style={{ marginTop: 2 }} />
          <Text style={[typography.label, { color: t.foreground, flex: 1, lineHeight: 20 }]}>
            Only you and the yearbook committee can see your photos. There is no public feed, and no other
            student can browse your submissions.
          </Text>
        </View>

        <View style={{ marginTop: 16, gap: 16 }}>
          {PRIVACY_SECTIONS.map((section) => (
            <View key={section.title}>
              <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                {section.title}
              </Text>
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4, lineHeight: 18 }]}>
                {section.body}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            typography.caption,
            {
              color: t.mutedForeground,
              backgroundColor: t.muted,
              borderRadius: 16,
              padding: 14,
              marginTop: 20,
              lineHeight: 17,
            },
          ]}
        >
          Consent for photo publication is collected separately from this notice, on the Upload screen, and
          can be withdrawn at any time by deleting the photo or requesting its removal.
        </Text>
      </View>
    </Sheet>
  );
};

/** Sheet 4 — Help / FAQ. Collapsible Q&A, one answer open at a time. */
export const HelpSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { close } = useMockApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title="Help and FAQ"
      description="The questions the committee hears most."
      footer={
        <Button
          block
          variant="outline"
          title="Close"
          icon={<LifeBuoy size={17} color={t.foreground} />}
          onPress={close}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {FAQ.map((item, index) => {
          const expanded = openIndex === index;
          return (
            <Surface key={item.q} style={{ marginBottom: 10, overflow: "hidden" }}>
              <Pressable
                onPress={() => setOpenIndex(expanded ? null : index)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
              >
                <MessageCircleQuestion size={18} color={t.primary} />
                <Text style={[typography.label, { fontWeight: "700", color: t.foreground, flex: 1 }]}>
                  {item.q}
                </Text>
                <ChevronDown
                  size={16}
                  color={t.mutedForeground}
                  style={{
                    transform: [{ rotate: expanded ? "180deg" : "0deg" }],
                  }}
                />
              </Pressable>
              {expanded ? (
                <Text
                  style={[
                    typography.caption,
                    { color: t.mutedForeground, paddingHorizontal: 14, paddingBottom: 14, lineHeight: 18 },
                  ]}
                >
                  {item.a}
                </Text>
              ) : null}
            </Surface>
          );
        })}

        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: t.border,
            padding: 14,
          }}
        >
          <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>Still stuck?</Text>
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4, lineHeight: 17 }]}>
            Look for a committee member at the yearbook room, or reply to any notification email from{" "}
            {SCHOOL_NAME}.
          </Text>
        </View>
      </View>
    </Sheet>
  );
};

/** Sheet 5 — Notification permission. Shown on the first bell tap, once. */
export const NotificationPermissionSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close } = useMockApp();

  return (
    <Sheet
      open={open}
      onClose={close}
      hideClose
      title="Get deadline reminders and review results"
      description="We only send two kinds of notifications, and you can turn them off any time."
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            variant="outline"
            style={{ flex: 1 }}
            title="Not now"
            onPress={() => dispatch({ type: "setNotifications", enabled: false })}
          />
          <Button
            style={{ flex: 1 }}
            title="Allow"
            onPress={() => dispatch({ type: "setNotifications", enabled: true })}
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ alignItems: "center", paddingVertical: 4 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.primary + "1F",
            }}
          >
            <BellRing size={24} color={t.primary} />
          </View>
        </View>

        <View style={{ marginTop: 8, gap: 10 }}>
          <View
            style={{ flexDirection: "row", gap: 12, borderRadius: 16, backgroundColor: t.muted, padding: 14 }}
          >
            <CalendarClock size={18} color={t.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                Deadline reminders
              </Text>
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 2, lineHeight: 17 }]}>
                Two days before an event stops accepting photos.
              </Text>
            </View>
          </View>
          <View
            style={{ flexDirection: "row", gap: 12, borderRadius: 16, backgroundColor: t.muted, padding: 14 }}
          >
            <ClipboardCheck size={18} color={t.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                Review results
              </Text>
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 2, lineHeight: 17 }]}>
                When a photo is approved, or when the committee asks for a new one.
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            typography.caption,
            { color: t.mutedForeground, textAlign: "center", marginTop: 12 },
          ]}
        >
          {state.notificationsEnabled
            ? "You are already receiving both. You can change this in your profile."
            : "Nothing else is ever sent from YearbookHub."}
        </Text>
      </View>
    </Sheet>
  );
};

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ size?: number; color?: string }>> = {
  deadline: CalendarClock,
  review: ClipboardCheck,
  removal: Flag,
};

/** Sheet 6 — Notifications list. Unread dot, mark all read, deep link into a photo. */
export const NotificationsSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close, open: openOverlay } = useMockApp();
  // P6: the list hydrates from GET /notifications; no-op in the demo build.
  useNotificationsSync();
  const unread = unreadCount(state);

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title="Notifications"
      description={unread ? `${unread} unread` : "You are up to date"}
      footer={
        <Button
          block
          variant="outline"
          title="Mark all as read"
          icon={<CheckCheck size={17} color={unread === 0 ? t.mutedForeground : t.foreground} />}
          disabled={unread === 0}
          onPress={() => {
            void api.markAllNotificationsRead().catch(() => undefined);
            dispatch({ type: "markAllRead" });
          }}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        {state.notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="You're all caught up"
            message="Deadline reminders and review results will show up here."
          />
        ) : (
          state.notifications.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const iconBg =
              item.kind === "deadline"
                ? t.pendingSoft
                : item.kind === "review"
                  ? t.primary + "1F"
                  : t.reportedSoft;
            const iconColor =
              item.kind === "deadline"
                ? t.pendingForeground
                : item.kind === "review"
                  ? t.primary
                  : t.reportedForeground;
            return (
              <Surface key={item.id} style={{ marginBottom: 10, overflow: "hidden" }}>
                <Pressable
                  onPress={() => {
                    void api.markAllNotificationsRead().catch(() => undefined);
                    dispatch({ type: "markAllRead" });
                    if (item.photoId) {
                      close();
                      openOverlay("photoViewer", { photoId: item.photoId });
                    }
                  }}
                  style={{ flexDirection: "row", gap: 12, padding: 14, alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: iconBg,
                    }}
                  >
                    <Icon size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={[typography.label, { fontWeight: "700", color: t.foreground, flex: 1 }]}
                      >
                        {item.title}
                      </Text>
                      {!item.read ? <UnreadDot /> : null}
                    </View>
                    <Text
                      style={[typography.caption, { color: t.mutedForeground, marginTop: 4, lineHeight: 17 }]}
                    >
                      {item.body}
                    </Text>
                    <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 6 }]}>
                      {relativeTime(item.at)}
                      {item.photoId ? " · Tap to open the photo" : ""}
                    </Text>
                  </View>
                </Pressable>
              </Surface>
            );
          })
        )}
      </View>
    </Sheet>
  );
};
