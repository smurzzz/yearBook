import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  CalendarDays,
  Flag,
  ImageOff,
  MoreVertical,
  Pencil,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { Sheet } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { Chip, MetaChip } from "../components/ui/Chips";
import { ChoiceRow, FieldLabel, Textarea } from "../components/ui/Fields";
import { ZoomableImage } from "../components/ui/Media";
import { Surface } from "../components/ui/Surface";
import { useMockApp } from "../prototype/store";
import { eventById } from "../prototype/data";
import { formatDate } from "../prototype/format";
import { filteredPhotos, myPhotos } from "../prototype/selectors";
import { CLUBS, CATEGORIES, REMOVAL_REASONS, type Category, type PhotoItem } from "../prototype/types";

const MENU_ITEM = (
  Icon: React.ComponentType<{ size?: number; color?: string }>,
  label: string,
  run: () => void,
  danger?: boolean,
) => ({ Icon, label, run, danger });

/**
 * Sheet 9 — Photo Viewer. Full-screen, student surface: no status anywhere.
 * Rendered either as an overlay (open + photoId) or directly by the
 * /photo/[id] route (pass onClose).
 */
export const PhotoViewerOverlay = ({
  open,
  photoId,
  onClose,
}: {
  open: boolean;
  photoId?: string;
  onClose?: () => void;
}) => {
  const t = useTheme();
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  const dismiss = onClose ?? close;
  const list: PhotoItem[] = state.role === "admin" ? filteredPhotos(state) : myPhotos(state);
  const [index, setIndex] = useState(() => {
    const found = list.findIndex((p) => p.id === photoId);
    return found < 0 ? 0 : found;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    caption: "",
    category: "Candid" as Category,
    club: null as string | null,
  });

  if (!open) return null;
  const photo = list[index];
  if (!photo) {
    // Spec §10 "Not found": dead deep link (/photo/[id]) or a removed photo.
    return (
      <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={dismiss}>
        <View style={{ flex: 1, backgroundColor: t.canvas, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: t.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImageOff size={26} color={t.mutedForeground} />
          </View>
          <Text style={[typography.title, { color: t.foreground, marginTop: 16, textAlign: "center" }]}>
            This item is no longer available.
          </Text>
          <Button title="Close" variant="outline" style={{ marginTop: 20 }} onPress={dismiss} />
        </View>
      </Modal>
    );
  }

  const wasRejected = photo.status === "rejected";
  const event = eventById(photo.eventId);

  const startEditing = () => {
    setDraft({ caption: photo.caption, category: photo.category, club: photo.club ?? null });
    setEditing(true);
    setMenuOpen(false);
  };

  const menu = [
    MENU_ITEM(Pencil, "Edit caption and tags", startEditing),
    MENU_ITEM(
      Flag,
      "Request removal",
      () => {
        setMenuOpen(false);
        openOverlay("requestRemoval", { photoId: photo.id });
      },
    ),
    MENU_ITEM(
      Trash2,
      "Delete photo",
      () => {
        setMenuOpen(false);
        ask("deletePhoto", { photoId: photo.id });
      },
      true,
    ),
  ];

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: t.canvas }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            hitSlop={8}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} color={t.onImage} />
          </Pressable>
          <Text style={[typography.label, { fontWeight: "700", color: t.onImage }]}>
            {index + 1} of {list.length}
          </Text>
          <View>
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Photo options"
              accessibilityState={{ expanded: menuOpen }}
              hitSlop={8}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
            >
              <MoreVertical size={20} color={t.onImage} />
            </Pressable>
            {menuOpen ? (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 48,
                  width: 236,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.popover,
                  padding: 6,
                  zIndex: 30,
                  elevation: 8,
                }}
              >
                {menu.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={item.run}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <item.Icon size={18} color={item.danger ? t.destructive : t.foreground} />
                    <Text
                      style={[
                        typography.body,
                        { fontWeight: "600", color: item.danger ? t.destructive : t.foreground },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <ZoomableImage
            src={photo.src}
            style={{ flex: 1 }}
            onSwipe={(delta) => setIndex((i) => Math.min(list.length - 1, Math.max(0, i + delta)))}
          />
        </View>

        <View
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderTopWidth: 1,
            borderColor: t.onImageBorder,
            backgroundColor: t.card,
            paddingHorizontal: 20,
            paddingBottom: 28,
            paddingTop: 14,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ height: 6, width: 40, borderRadius: 3, backgroundColor: t.border }} />
          </View>

          {editing ? (
            <View>
              <Text
                style={[
                  typography.eyebrow,
                  { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700" },
                ]}
              >
                Edit caption
              </Text>
              <Textarea
                style={{ marginTop: 8 }}
                value={draft.caption}
                onChangeText={(v) => setDraft({ ...draft, caption: v })}
                placeholder="What is happening in this photo?"
              />
              <Text
                style={[
                  typography.eyebrow,
                  { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 14 },
                ]}
              >
                Category
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    selected={draft.category === category}
                    onPress={() => setDraft({ ...draft, category })}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
              <Text
                style={[
                  typography.eyebrow,
                  { color: t.mutedForeground, textTransform: "uppercase", fontWeight: "700", marginTop: 14 },
                ]}
              >
                Club
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                <Chip selected={draft.club === null} onPress={() => setDraft({ ...draft, club: null })}>
                  None
                </Chip>
                {CLUBS.map((club) => (
                  <Chip key={club} selected={draft.club === club} onPress={() => setDraft({ ...draft, club })}>
                    {club}
                  </Chip>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Button
                  variant="outline"
                  style={{ flex: 1 }}
                  title="Cancel"
                  onPress={() => setEditing(false)}
                />
                <Button
                  style={{ flex: 1 }}
                  title="Save changes"
                  onPress={() => {
                    dispatch({
                      type: "updatePhoto",
                      photoId: photo.id,
                      patch: {
                        caption: draft.caption,
                        category: draft.category,
                        club: (draft.club as PhotoItem["club"]) ?? undefined,
                      },
                    });
                    setEditing(false);
                  }}
                />
              </View>
            </View>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <MetaChip>{event.name}</MetaChip>
                <MetaChip>{photo.category}</MetaChip>
                {photo.club ? <MetaChip>{photo.club}</MetaChip> : null}
                <MetaChip icon={<CalendarDays size={14} color={t.mutedForeground} />}>
                  {formatDate(photo.uploadedAt)}
                </MetaChip>
              </ScrollView>

              <Text style={[typography.body, { color: t.foreground, marginTop: 12, lineHeight: 22 }]}>
                {photo.caption || "No caption added yet."}
              </Text>

              {wasRejected ? (
                <Surface dashed style={{ marginTop: 12, backgroundColor: t.muted + "99", padding: 14 }}>
                  <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                    <ImageOff size={16} color={t.mutedForeground} /> Needs a new photo: {photo.rejectReason}
                  </Text>
                  <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4, lineHeight: 17 }]}>
                    The committee asked for a replacement for this shot. Your original stays in the yearbook
                    selection until you send a new one.
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ marginTop: 10, alignSelf: "flex-start" }}
                    title="Replace photo"
                    icon={<Share2 size={15} color={t.foreground} />}
                    onPress={() => {
                      dispatch({ type: "setUploadField", field: "eventId", value: photo.eventId });
                      dispatch({ type: "setUploadField", field: "category", value: photo.category });
                      dispatch({ type: "setUploadField", field: "club", value: photo.club ?? null });
                      dismiss();
                      openOverlay("sourceChooser");
                    }}
                  />
                </Surface>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

/** Sheet 10 — Request Removal. Reason list, optional notes, success toast. */
export const RequestRemovalSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const t = useTheme();
  const { dispatch, close } = useMockApp();
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Request removal"
      description="The committee reviews every request within a day."
      footer={
        <Button
          block
          size="lg"
          title="Submit request"
          icon={<Send size={17} color={reason ? t.primaryForeground : t.mutedForeground} />}
          disabled={!reason}
          onPress={() => {
            if (!reason || !photoId) return;
            dispatch({ type: "requestRemoval", photoId, reason, notes: notes || undefined });
          }}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View accessibilityLabel="Reason" style={{ gap: 10 }}>
          {REMOVAL_REASONS.map((option) => (
            <ChoiceRow
              key={option}
              label={option}
              selected={reason === option}
              onSelect={() => setReason(option)}
            />
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Optional">Notes for the committee</FieldLabel>
          <Textarea
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything that helps us resolve this faster."
          />
        </View>

        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 12, lineHeight: 17 }]}>
          If the photo is already printed or published, we will take it out of the online selection and note
          the request for the archival copy.
        </Text>
      </View>
    </Sheet>
  );
};
