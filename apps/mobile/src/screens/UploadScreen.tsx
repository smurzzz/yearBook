import React, { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Camera, Plus, Trash2, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { CheckRow, FieldLabel, Select, Textarea } from "../components/ui/Fields";
import { Chip } from "../components/ui/Chips";
import { InlineBanner, InlineNote } from "../components/ui/Feedback";
import { SectionHeader, Surface } from "../components/ui/Surface";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { img } from "../prototype/assets";
import { eventById } from "../prototype/data";
import { countdown, formatShortDate } from "../prototype/format";
import { MAX_BATCH, uploadGuard, userEventCount } from "../prototype/selectors";
import { useMockApp } from "../prototype/store";
import { useEventsSync, useLookupsSync, useMyPhotosSync } from "../api/sync";
import { useUploadRunner } from "../api/useUpload";
import { CATEGORIES, CLUBS } from "../prototype/types";

/** Screen 3 — Upload. One scrolling screen, single submit action. */
export const UploadScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch, open } = useMockApp();
  // P6: the guard reads real events (deadline, per-event limit) and the
  // student's hydrated photos. The submit button runs the real pipeline in
  // the real build (api/upload.ts) and the demo simulation in the mockup.
  useEventsSync();
  useMyPhotosSync();
  const lookups = useLookupsSync();
  const { submit, running } = useUploadRunner();
  const { upload } = state;
  const [captionFor, setCaptionFor] = useState<string | null>(null);
  const guard = uploadGuard(state);

  /* The chips show the names; the API works with ids (api/lookups.ts). In
     the demo build the bundled lists are the API's seed lists. */
  const categories = lookups.categories.length ? lookups.categories : CATEGORIES;
  const clubs = lookups.clubs.length ? lookups.clubs : CLUBS;
  const event = upload.eventId ? eventById(upload.eventId) : null;
  const used = event ? userEventCount(state, event.id) : 0;
  const captionItem = upload.items.find((i) => i.id === captionFor) ?? null;

  const openEventOptions = state.events
    .filter((e) => e.open && !countdown(e.deadline).closed)
    .map((e) => ({
      value: e.id,
      label: e.name,
      description: `Closes ${formatShortDate(e.deadline)} · up to ${e.maxPhotosPerUser} per student`,
    }));

  const showGuard = !guard.ok && guard.reason !== "no-photos";

  return (
    <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <Text style={[typography.title, { color: t.foreground }]}>Upload photos</Text>
        <Text style={[typography.label, { color: t.mutedForeground, marginTop: 4 }]}>
          They go straight to the yearbook committee for review.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* Photo picker */}
        <Surface style={{ marginTop: 16, borderStyle: "dashed" }}>
          {upload.items.length === 0 ? (
            <Pressable
              onPress={() => open("sourceChooser")}
              style={{ alignItems: "center", paddingHorizontal: 16, paddingVertical: 28 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera size={24} color={t.primary} />
              </View>
              <Text style={[typography.subhead, { fontWeight: "700", color: t.foreground, marginTop: 12 }]}>
                Add photos
              </Text>
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4 }]}>
                Camera or gallery · up to {MAX_BATCH} at a time
              </Text>
            </Pressable>
          ) : (
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                  {upload.items.length} <Text style={{ color: t.mutedForeground }}>of {MAX_BATCH} selected</Text>
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  title="Add more"
                  onPress={() => open("sourceChooser")}
                  icon={<Plus size={14} color={t.foreground} />}
                />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {upload.items.map((item, index) => (
                  <View key={item.id} style={{ width: "23%", aspectRatio: 1 }}>
                    <Pressable
                      accessibilityLabel={`Edit caption for photo ${index + 1}`}
                      onPress={() => setCaptionFor(item.id)}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: captionFor === item.id ? t.primary : "transparent",
                        backgroundColor: t.muted,
                      }}
                    >
                      <Image source={img(item.src)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      {item.caption ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            fontSize: 10,
                            fontWeight: "600",
                            color: t.onImage,
                            backgroundColor: "rgba(10,10,20,0.55)",
                            paddingHorizontal: 4,
                            paddingVertical: 2,
                          }}
                        >
                          {item.caption}
                        </Text>
                      ) : null}
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      onPress={() => dispatch({ type: "removeUploadItem", id: item.id })}
                      style={{
                        position: "absolute",
                        right: -6,
                        top: -6,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: t.border,
                        backgroundColor: t.background,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={14} color={t.foreground} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 12, lineHeight: 16 }]}>
                Tap a photo to add a caption. Large files are resized automatically before upload.
              </Text>
            </View>
          )}
        </Surface>

        {state.batchMessage ? (
          <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 8 }]}>{state.batchMessage}</Text>
        ) : null}

        {/* Caption editor */}
        {captionItem ? (
          <Surface style={{ marginTop: 12, padding: 14 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Image
                source={img(captionItem.src)}
                style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: t.muted }}
              />
              <View style={{ flex: 1 }}>
                <FieldLabel hint="Optional">Caption</FieldLabel>
                <Textarea
                  autoFocus
                  value={captionItem.caption}
                  onChangeText={(caption) => dispatch({ type: "setUploadCaption", id: captionItem.id, caption })}
                  placeholder="What is happening in this photo?"
                  maxLength={200}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <Button
                size="sm"
                variant="ghost"
                title="Remove photo"
                titleColor={t.destructive}
                onPress={() => {
                  dispatch({ type: "removeUploadItem", id: captionItem.id });
                  setCaptionFor(null);
                }}
                icon={<Trash2 size={14} color={t.destructive} />}
              />
              <Button size="sm" title="Done" onPress={() => setCaptionFor(null)} />
            </View>
          </Surface>
        ) : null}

        {/* Tagging */}
        <View style={{ marginTop: 24 }}>
          <FieldLabel required hint={event ? `${used} of ${event.maxPhotosPerUser} used` : undefined}>
            Event
          </FieldLabel>
          <Select
            value={upload.eventId}
            placeholder="Choose an event"
            options={openEventOptions}
            onChange={(value) => dispatch({ type: "setUploadField", field: "eventId", value })}
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel required>Category</FieldLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {categories.map((category) => (
              <Chip
                key={category}
                selected={upload.category === category}
                onPress={() =>
                  dispatch({
                    type: "setUploadField",
                    field: "category",
                    value: upload.category === category ? null : category,
                  })
                }
              >
                {category}
              </Chip>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Optional">Club</FieldLabel>
          <Select
            value={upload.club}
            placeholder="None"
            options={[{ value: "none", label: "None" }, ...clubs.map((c) => ({ value: c, label: c }))]}
            onChange={(value) => dispatch({ type: "setUploadField", field: "club", value: value === "none" ? null : value })}
          />
        </View>

        <View style={{ marginTop: 24 }}>
          <SectionHeader eyebrow="Permissions" title="Before you submit" />
          <Surface style={{ marginTop: 12, padding: 14 }}>
            <CheckRow checked={upload.consent} onChange={() => dispatch({ type: "toggleUploadConsent" })}>
              I have permission to share these photos and the people in them agree to be published.
            </CheckRow>
          </Surface>
        </View>

        <InlineNote style={{ marginTop: 12 }}>
          Photos are compressed automatically. Nothing is visible to other students — only you and the
          committee.
        </InlineNote>
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: t.border,
          backgroundColor: t.background,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        {showGuard ? (
          <InlineBanner
            style={{ marginBottom: 12 }}
            tone={
              guard.reason === "deadline" ? "error" : guard.reason === "limit" || guard.reason === "storage" ? "warning" : "info"
            }
            title={guard.title}
            message={guard.message}
          />
        ) : null}
        <Button
          block
          size="lg"
          disabled={!guard.ok || running}
          onPress={() => {
            void submit();
          }}
          title={
            running
              ? "Uploading…"
              : `Submit ${upload.items.length || ""} ${upload.items.length === 1 ? "photo" : "photos"}`
          }
        />
        <Text style={[typography.caption, { color: t.mutedForeground, textAlign: "center", marginTop: 8 }]}>
          {event
            ? `${Math.max(0, event.maxPhotosPerUser - used)} of ${event.maxPhotosPerUser} slots left for ${event.name}`
            : "Select an event to see your remaining slots."}
        </Text>
      </View>
    </View>
  );
};
