import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Check, CheckCircle2, Info, Lock, Minus, Plus, Trash2 } from "lucide-react-native";
import { useTheme } from "../theme/useTheme";
import { radius as radii, typography } from "../theme/tokens";
import { Sheet } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { Chip, CountdownChip } from "../components/ui/Chips";
import { FieldLabel, DateTimeField, SwitchRow, Textarea, TextField } from "../components/ui/Fields";
import { InlineBanner } from "../components/ui/Feedback";
import { Surface } from "../components/ui/Surface";
import { useMockApp } from "../prototype/store";
import { api } from "../api";
import { coverKeyOf, toEventItem } from "../api/dto";
import { EVENTS, eventById } from "../prototype/data";
import { countdown, formatDateTime } from "../prototype/format";
import { userEventCount } from "../prototype/selectors";
import type { EventItem } from "../prototype/types";

const COVER_OPTIONS = EVENTS.map((event) => ({ src: event.cover, name: event.name }));

/** Sheet 7 — Event Detail. Rules, countdown, and the upload entry point. */
export const EventDetailSheet = ({ open, eventId }: { open: boolean; eventId?: string }) => {
  const t = useTheme();
  const { state, dispatch, close, goto } = useMockApp();
  const event = eventId ? eventById(eventId) : null;
  if (!event) return null;

  const info = countdown(event.deadline);
  const closed = !event.open || info.closed;
  const used = userEventCount(state, event.id);

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      bare
      footer={
        <View style={{ gap: 10 }}>
          <Button
            block
            size="lg"
            title="Upload to this event"
            disabled={closed}
            onPress={() => {
              dispatch({ type: "setUploadField", field: "eventId", value: event.id });
              close();
              goto("upload");
            }}
          />
          <Text style={[typography.caption, { color: t.mutedForeground, textAlign: "center" }]}>
            {closed
              ? `This event stopped accepting photos on ${formatDateTime(
                  event.deadline,
                )}. Ask a committee member if you need an extension.`
              : `${Math.max(0, event.maxPhotosPerUser - used)} of ${event.maxPhotosPerUser} slots left for you`}
          </Text>
        </View>
      }
    >
      <View style={{ paddingBottom: 12 }}>
        <View style={{ height: 176, width: "100%", backgroundColor: t.muted }}>
          <Image source={{ uri: event.cover }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, backgroundColor: "rgba(6, 6, 15, 0.45)" }}
          />
          <View style={{ position: "absolute", left: 20, right: 20, bottom: 16 }}>
            <CountdownChip deadline={event.deadline} />
            <Text
              style={[
                typography.title,
                { color: t.onImage, fontWeight: "800", marginTop: 8 },
              ]}
              numberOfLines={2}
            >
              {event.name}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={[typography.label, { color: t.mutedForeground, lineHeight: 21 }]}>
            {event.description}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Surface inset style={{ flex: 1, backgroundColor: t.muted + "80" }}>
              <Text style={[typography.caption, { fontWeight: "600", color: t.mutedForeground }]}>
                Deadline
              </Text>
              <Text style={[typography.label, { fontWeight: "700", color: t.foreground, marginTop: 4 }]}>
                {formatDateTime(event.deadline)}
              </Text>
            </Surface>
            <Surface inset style={{ flex: 1, backgroundColor: t.muted + "80" }}>
              <Text style={[typography.caption, { fontWeight: "600", color: t.mutedForeground }]}>
                Your uploads
              </Text>
              <Text
                style={[
                  typography.label,
                  { fontWeight: "700", color: t.foreground, marginTop: 4 },
                ]}
              >
                {used} of {event.maxPhotosPerUser}
              </Text>
            </Surface>
          </View>

          {closed ? (
            <InlineBanner
              style={{ marginTop: 16 }}
              tone="warning"
              icon={Lock}
              title="Submissions are closed"
              message="You can still browse the photos you already uploaded for this event."
            />
          ) : (
            <InlineBanner
              style={{ marginTop: 16 }}
              tone="info"
              icon={Info}
              title={info.label}
              message="Photos submitted after the deadline cannot be considered for the layout."
            />
          )}

          <Text
            style={[
              typography.eyebrow,
              { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 20 },
            ]}
          >
            Rules and guidelines
          </Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {event.rules.map((rule) => (
              <View key={rule} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <CheckCircle2 size={18} color={t.approved} style={{ marginTop: 1 }} />
                <Text style={[typography.label, { color: t.foreground, flex: 1, lineHeight: 20 }]}>
                  {rule}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", marginTop: 16 }}>
            <Chip selected onPress={() => undefined}>
              Tag photos as {event.name}
            </Chip>
          </View>
        </View>
      </View>
    </Sheet>
  );
};

/** Sheet 14 — Event Form. Create, edit, open or close, and delete. */
export const EventFormSheet = ({ open, eventId }: { open: boolean; eventId?: string }) => {
  const t = useTheme();
  const { state, dispatch, close, ask } = useMockApp();
  const existing = eventId ? state.events.find((event) => event.id === eventId) ?? null : null;

  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  };

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [cover, setCover] = useState(existing?.cover ?? COVER_OPTIONS[0]?.src ?? "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? defaultDeadline());
  const [maxPhotos, setMaxPhotos] = useState(existing?.maxPhotosPerUser ?? 10);
  const [isOpen, setIsOpen] = useState(existing?.open ?? true);
  const [touched, setTouched] = useState(false);

  const valid = name.trim().length > 2 && description.trim().length > 9 && Boolean(deadline);

  const save = () => {
    setTouched(true);
    if (!valid) return;
    void (async () => {
      const input = {
        name: name.trim(),
        description: description.trim(),
        cover_key: coverKeyOf(cover),
        deadline,
        max_photos: maxPhotos,
        is_open: isOpen,
      };
      let event: EventItem;
      try {
        // P6: the server owns the event (and derives its rules on create);
        // the saved EventItem comes back from the API response.
        const dto = existing
          ? await api.updateEvent(existing.id, input)
          : await api.createEvent(input);
        event = toEventItem(dto);
      } catch {
        return; // P8 polish: surface the failure in the sheet
      }
      dispatch({ type: "saveEvent", event });
    })();
  };

  // api.md: the linked count comes from EventDTO.photo_count once the
  // catalog is hydrated from the API; fixtures only have the local pool.
  const linked = existing
    ? (existing.photoCount ?? state.photos.filter((p) => p.eventId === existing.id).length)
    : 0;

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title={existing ? "Edit event" : "New event"}
      description={
        existing
          ? `Saved changes reach students immediately · ${linked} photos linked`
          : "It appears on every student's Home screen the moment you save."
      }
      footer={
        <View style={{ gap: 10 }}>
          <Button
            block
            size="lg"
            variant="admin"
            title={existing ? "Save changes" : "Create event"}
            icon={<Check size={17} color={t.adminForeground} />}
            onPress={save}
          />
          {existing ? (
            <Button
              block
              variant="ghost"
              title="Delete event"
              titleColor={t.destructive}
              icon={<Trash2 size={17} color={t.destructive} />}
              onPress={() => ask("deleteEvent", { eventId: existing.id })}
            />
          ) : null}
        </View>
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <TextField
          label="Event name"
          required
          value={name}
          onChangeText={setName}
          placeholder="e.g. Intramurals 2026"
          error={touched && name.trim().length < 3 ? "Give the event a name." : undefined}
        />

        <Textarea
          style={{ marginTop: 20 }}
          label="Description"
          required
          value={description}
          onChangeText={setDescription}
          placeholder="What should students photograph at this event?"
        />

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Tap to choose">Cover image</FieldLabel>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {COVER_OPTIONS.map((option) => {
              const active = cover === option.src;
              return (
                <Pressable
                  key={option.src}
                  onPress={() => setCover(option.src)}
                  accessibilityLabel={option.name}
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: radii.sm,
                    borderWidth: 2,
                    borderColor: active ? t.admin : "transparent",
                    overflow: "hidden",
                  }}
                >
                  <Image source={{ uri: option.src }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  {active ? (
                    <View
                      style={{
                        position: "absolute",
                        right: 4,
                        top: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: t.admin,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={12} color={t.adminForeground} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <DateTimeField label="Deadline" required value={deadline} onChange={setDeadline} />
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Per student">Max photos</FieldLabel>
          <Surface style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10 }}>
            <Button
              size="iconSm"
              variant="outline"
              title=""
              icon={<Minus size={16} color={t.foreground} />}
              accessibilityLabel="Fewer photos"
              disabled={maxPhotos <= 1}
              onPress={() => setMaxPhotos((v) => Math.max(1, v - 1))}
            />
            <Text style={[typography.title, { fontWeight: "800", color: t.foreground }]}>{maxPhotos}</Text>
            <Button
              size="iconSm"
              variant="outline"
              title=""
              icon={<Plus size={16} color={t.foreground} />}
              accessibilityLabel="More photos"
              disabled={maxPhotos >= 20}
              onPress={() => setMaxPhotos((v) => Math.min(20, v + 1))}
            />
          </Surface>
        </View>

        <Surface style={{ marginTop: 20 }}>
          <SwitchRow
            label="Open for submissions"
            description={
              isOpen ? "Students can upload right now" : "Uploads are blocked until you reopen"
            }
            checked={isOpen}
            onChange={setIsOpen}
          />
        </Surface>

        {touched && !valid ? (
          <InlineBanner
            style={{ marginTop: 16 }}
            tone="error"
            title="A few fields still need attention"
            message="Give the event a name, a short description, and a deadline."
          />
        ) : null}

        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 16, lineHeight: 17 }]}>
          Closing an event keeps everything already submitted. Students see a Closed badge and the upload
          button is disabled with an explanation.
        </Text>
      </View>
    </Sheet>
  );
};
