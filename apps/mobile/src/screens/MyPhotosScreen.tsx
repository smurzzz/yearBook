import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Camera, Info, Images, Plus, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar, PhotoTile } from "../components/ui/Media";
import { Chip, ChipRow } from "../components/ui/Chips";
import { EmptyState, Spinner } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { Surface } from "../components/ui/Surface";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { STUDENT_ID, eventById, personById } from "../prototype/data";
import { batchCountFor, batchCounts, myPhotos, studentStats } from "../prototype/selectors";
import { GridOnlySkeleton } from "../prototype/skeletons";
import { useMockApp } from "../prototype/store";

/** Screen 4 — My Photos. Instagram-style gallery with no status anywhere. */
export const MyPhotosScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch, open } = useMockApp();
  const [eventFilter, setEventFilter] = useState<string>("all");

  const mine = myPhotos(state);
  const stats = studentStats(state);
  const counts = useMemo(() => batchCounts(mine), [mine]);
  const myEventIds = useMemo(() => [...new Set(mine.map((p) => p.eventId))], [mine]);
  const visible = eventFilter === "all" ? mine : mine.filter((p) => p.eventId === eventFilter);
  const avatar = personById(STUDENT_ID).avatar;
  const width = Dimensions.get("window").width;

  return (
    <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 16 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
          <Avatar src={avatar} name={state.studentName} size="xl" />
          <View style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <Text numberOfLines={1} style={[typography.heading, { color: t.foreground, fontWeight: "700" }]}>
              {state.studentName}
            </Text>
            <Text numberOfLines={1} style={[typography.label, { color: t.mutedForeground, marginTop: 2 }]}>
              {state.studentClub ?? "No club"}
            </Text>
            <View style={{ flexDirection: "row", gap: 24, marginTop: 12 }}>
              <View>
                <Text style={[typography.subhead, { fontWeight: "700", color: t.foreground }]}>{stats.photos}</Text>
                <Text style={[typography.caption, { color: t.mutedForeground, fontWeight: "600", marginTop: 2 }]}>
                  Photos
                </Text>
              </View>
              <View>
                <Text style={[typography.subhead, { fontWeight: "700", color: t.foreground }]}>{stats.events}</Text>
                <Text style={[typography.caption, { color: t.mutedForeground, fontWeight: "600", marginTop: 2 }]}>
                  Events
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Settings and profile"
            onPress={() => open("profile")}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
          >
            <Settings size={21} color={t.foreground} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
          <Info size={14} color={t.mutedForeground} style={{ marginTop: 1 }} />
          <Text style={[typography.caption, { color: t.mutedForeground, lineHeight: 17, flex: 1 }]}>
            Only you and the yearbook committee can see your photos.
          </Text>
        </View>
      </View>

      {/* Event filter chips */}
      <View style={{ marginTop: 12 }}>
        <ChipRow contentStyle={{ paddingHorizontal: 20 }}>
          <Chip selected={eventFilter === "all"} onPress={() => setEventFilter("all")}>
            All
          </Chip>
          {myEventIds.map((id) => (
            <Chip key={id} selected={eventFilter === id} onPress={() => setEventFilter(id)}>
              {eventById(id).name}
            </Chip>
          ))}
        </ChipRow>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => {
              dispatch({ type: "setRefreshing", value: true });
              setTimeout(() => dispatch({ type: "setRefreshing", value: false }), 1100);
            }}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
      >
        {state.refreshing ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 }}>
            <Spinner size={16} />
            <Text style={[typography.caption, { color: t.mutedForeground, fontWeight: "600" }]}>Refreshing</Text>
          </View>
        ) : null}

        {state.loading ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <GridOnlySkeleton count={9} />
          </View>
        ) : visible.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2, paddingHorizontal: 20, paddingTop: 8 }}>
            {visible.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                size={(width - 40 - 4) / 3}
                batchCount={batchCountFor(counts, photo)}
                onPress={() => router.push(`/photo/${photo.id}`)}
              />
            ))}
          </View>
        ) : mine.length ? (
          <EmptyState
            icon={Images}
            title={`Nothing in ${eventById(eventFilter).name} yet`}
            message="Pick another event or upload photos for this one."
          />
        ) : (
          <EmptyState icon={Images} title="No photos yet" message="Tap + to upload your first one." />
        )}
      </ScrollView>

      {mine.length ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) }}>
          <Surface inset dashed style={{ backgroundColor: t.muted + "66", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: t.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={18} color={t.primary} />
            </View>
            <Text style={[typography.caption, { color: t.mutedForeground, flex: 1 }]}>
              Showing {visible.length} of {mine.length} photos
            </Text>
            <Button
              size="sm"
              title="Add"
              onPress={() => router.push("/(student)/upload")}
              icon={<Plus size={14} color={t.primaryForeground} />}
            />
          </Surface>
        </View>
      ) : null}
    </View>
  );
};
