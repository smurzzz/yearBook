import React, { useMemo } from "react";
import { Dimensions, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Bell, Images, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar, PhotoTile } from "../components/ui/Media";
import { Button } from "../components/ui/Button";
import { EmptyState, ErrorRetryBlock } from "../components/ui/Feedback";
import { SectionHeader } from "../components/ui/Surface";
import { CountdownChip, UnreadDot } from "../components/ui/Chips";
import { useTheme } from "../theme/useTheme";
import { radius as radii, typography } from "../theme/tokens";
import { img } from "../prototype/assets";
import { formatDateTime } from "../prototype/format";
import { STUDENT_ID, personById } from "../prototype/data";
import {
  batchCountFor,
  batchCounts,
  eventsForStudent,
  myPhotos,
  unreadCount,
} from "../prototype/selectors";
import { HomeSkeleton } from "../prototype/skeletons";
import { useMockApp } from "../prototype/store";
import type { EventItem } from "../prototype/types";

/** Student event card: cover-led, countdown chip over the photo. */
const EventCard = ({ event, onPress }: { event: EventItem; onPress: () => void }) => {
  const t = useTheme();
  const closed = !event.open;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: t.border + "B3",
          backgroundColor: t.card,
          overflow: "hidden",
          opacity: pressed ? 0.97 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={{ height: 144, backgroundColor: t.muted }}>
        <Image source={img(event.cover)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 80,
            backgroundColor: "rgba(6, 6, 15, 0.35)",
          }}
        />
        <View style={{ position: "absolute", left: 12, top: 12 }}>
          <CountdownChip deadline={event.deadline} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            typography.subhead,
            {
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 12,
              color: t.onImage,
              fontWeight: "700",
              textShadowColor: "rgba(240, 244, 255, 0.35)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            },
          ]}
        >
          {event.name}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text
            style={[
              typography.caption,
              {
                color: t.mutedForeground,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.9,
              },
            ]}
          >
            {closed ? "Submissions closed" : "Submissions open"}
          </Text>
          <Text numberOfLines={1} style={[typography.label, { color: t.mutedForeground, marginTop: 4 }]}>
            {formatDateTime(event.deadline)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

/** Screen 2 — Student home: deadlines plus the student's recent uploads. */
export const HomeScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch, open } = useMockApp();
  const photos = myPhotos(state);
  const events = eventsForStudent(state);
  const unread = unreadCount(state);
  const counts = useMemo(() => batchCounts(photos), [photos]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = state.studentName.split(" ")[0];
  const avatar = personById(STUDENT_ID).avatar;
  const width = Dimensions.get("window").width;

  if (state.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top }}>
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 12 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 4 }}>
        <Pressable accessibilityLabel="Open profile" onPress={() => open("profile")}>
          <Avatar src={avatar} name={state.studentName} size="md" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground, fontWeight: "600" }]}>
            {state.studentClub ? `Grade 11 · ${state.studentClub}` : "Grade 11"}
          </Text>
          <Text numberOfLines={1} style={[typography.subhead, { color: t.foreground, fontWeight: "700" }]}>
            {greeting}, {firstName}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
          onPress={() =>
            dispatch({
              type: "openOverlay",
              overlay: { id: state.notificationsAsked ? "notifications" : "notifPermission" },
            })
          }
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
        >
          <Bell size={21} color={t.foreground} />
          {unread > 0 ? (
            <View style={{ position: "absolute", right: 10, top: 10 }}>
              <UnreadDot />
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {state.loadError ? (
          <ErrorRetryBlock
            style={{ marginTop: 16 }}
            onRetry={() => dispatch({ type: "setLoadError", value: false })}
          />
        ) : null}
        <SectionHeader style={{ marginTop: 16 }} eyebrow="Deadlines" title="Upcoming deadlines" />
        {events.length ? (
          <View style={{ marginTop: 12, gap: 14 }}>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onPress={() => open("eventDetail", { eventId: event.id })} />
            ))}
          </View>
        ) : (
          <EmptyState
            variant="inset"
            style={{ marginTop: 12 }}
            icon={Images}
            title="No events yet"
            message="Check back soon."
          />
        )}

        <SectionHeader
          style={{ marginTop: 28 }}
          eyebrow="Your submissions"
          title="Recent uploads"
          action="Upload"
          onAction={() => router.push("/(student)/upload")}
        />
        {photos.length ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
              {photos.slice(0, 9).map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  size={(width - 40 - 8) / 3}
                  batchCount={batchCountFor(counts, photo)}
                  onPress={() => router.push(`/photo/${photo.id}`)}
                />
              ))}
            </View>
            <Button
              block
              variant="outline"
              style={{ marginTop: 16 }}
              title={`View all ${photos.length} photos`}
              onPress={() => router.push("/(student)/my-photos")}
            />
          </>
        ) : (
          <EmptyState
            variant="inset"
            style={{ marginTop: 12 }}
            icon={Images}
            title="No uploads yet"
            message="Tap Upload to add your first photos."
            action={{ label: "Upload photos", icon: Plus, onClick: () => router.push("/(student)/upload") }}
          />
        )}

        <Text style={[typography.caption, { color: t.mutedForeground, textAlign: "center", marginTop: 16 }]}>
          Only you and the yearbook committee can see your photos.
        </Text>
      </ScrollView>
    </View>
  );
};
