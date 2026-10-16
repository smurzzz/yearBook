import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import {
  ArrowLeftRight,
  Check,
  MoreVertical,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react-native";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { Sheet } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { Avatar, PhotoTile } from "../components/ui/Media";
import { Chip, MetaChip, StatusChip } from "../components/ui/Chips";
import { DateTimeField, FieldLabel, SearchField, SwitchRow, Textarea } from "../components/ui/Fields";
import { EmptyState } from "../components/ui/Feedback";
import { Surface } from "../components/ui/Surface";
import { useMockApp } from "../prototype/store";
import { img } from "../prototype/assets";
import { api, USE_MOCK } from "../api";
import { rejectionCodeOf, registerPeopleFrom, toAdminPhoto } from "../api/dto";
import { useUploaderPhotosSync } from "../api/sync";
import { PEOPLE, eventById, personById } from "../prototype/data";
import { formatDate, formatDateTime } from "../prototype/format";
import { batchCountFor, batchCounts, filterPhotos, photosByUploader } from "../prototype/selectors";
import {
  CLUBS,
  CATEGORIES,
  REJECT_PRESETS,
  type Category,
  type Club,
  type PhotoStatus,
} from "../prototype/types";

/* ============================= Admin detail ============================= */

/** Sheet 11 — Admin Photo Detail. Status, tags, and the removal-request block. */
export const AdminPhotoDetailSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const t = useTheme();
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  /* P6: hydrate the full AdminPhotoDTO (open report, reviewer, rejection
     note, signed urls) over the tile the grid already shows. */
  useEffect(() => {
    if (USE_MOCK || !open || !photoId) return;
    let cancelled = false;
    (async () => {
      try {
        const dto = await api.adminPhoto(photoId);
        if (cancelled) return;
        registerPeopleFrom([dto.uploader]);
        dispatch({ type: "mergePhotos", photos: [toAdminPhoto(dto)] });
      } catch {
        /* keep the tile data; reopening retries */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, open, photoId]);
  const photo = state.photos.find((p) => p.id === photoId) ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    caption: "",
    category: "Candid" as Category,
    club: null as Club | null,
  });

  if (!photo) return null;

  const uploader = personById(photo.uploaderId);
  const event = eventById(photo.eventId);
  const request = photo.removalRequest;
  const reporter = request ? personById(request.reporterId) : null;

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      bare
      footer={
        editing ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button variant="outline" style={{ flex: 1 }} title="Cancel" onPress={() => setEditing(false)} />
            <Button
              variant="admin"
              style={{ flex: 1 }}
              title="Save tags"
              onPress={async () => {
                try {
                  const lookups = await api.lookups();
                  await api.patchAdminPhoto(photo.id, {
                    caption: draft.caption,
                    category_id: lookups.categories.find((c) => c.name === draft.category)?.id,
                    club_id: draft.club
                      ? lookups.clubs.find((c) => c.name === draft.club)?.id ?? null
                      : null,
                  });
                } catch {
                  return;
                }
                dispatch({
                  type: "updatePhoto",
                  photoId: photo.id,
                  patch: {
                    caption: draft.caption,
                    category: draft.category,
                    club: draft.club ?? undefined,
                  },
                });
                setEditing(false);
              }}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              size="sm"
              variant="outline"
              style={{ flex: 1 }}
              title="Pending"
              icon={<ArrowLeftRight size={15} color={t.foreground} />}
              onPress={async () => {
                try {
                  await api.resetPhoto(photo.id);
                } catch {
                  return;
                }
                dispatch({ type: "backToPending", photoId: photo.id });
              }}
            />
            <Button
              size="sm"
              variant="outline"
              tone={t.rejectedSoft}
              titleColor={t.destructive}
              style={{ flex: 1 }}
              title="Reject"
              icon={<X size={15} color={t.destructive} />}
              onPress={() => openOverlay("rejectReason", { photoId: photo.id })}
            />
            <Button
              size="sm"
              variant="admin"
              style={{ flex: 1 }}
              title="Approve"
              icon={<Check size={15} color={t.adminForeground} />}
              onPress={async () => {
                // P6: the server owns the transition; the reducer mirrors it.
                try {
                  await api.approvePhoto(photo.id);
                } catch {
                  return;
                }
                dispatch({ type: "approve", photoId: photo.id });
              }}
            />
          </View>
        )
      }
    >
      <View style={{ paddingBottom: 12 }}>
        <View style={{ height: 256, width: "100%", backgroundColor: t.canvas }}>
          <Image source={img(photo.src)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          <View style={{ position: "absolute", right: 16, top: 16, zIndex: 20 }}>
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Photo actions"
              accessibilityState={{ expanded: menuOpen }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: t.onImageBorder,
                backgroundColor: t.onImageSurface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MoreVertical size={18} color={t.onImage} />
            </Pressable>
            {menuOpen ? (
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 44,
                  width: 210,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.popover,
                  padding: 6,
                  zIndex: 30,
                  elevation: 8,
                }}
              >
                {[
                  {
                    Icon: Pencil,
                    label: "Edit tags",
                    run: () => {
                      setDraft({
                        caption: photo.caption,
                        category: photo.category,
                        club: photo.club ?? null,
                      });
                      setEditing(true);
                      setMenuOpen(false);
                    },
                    danger: false,
                  },
                  {
                    Icon: ArrowLeftRight,
                    label: "Back to pending",
                    run: () => {
                      setMenuOpen(false);
                      dispatch({ type: "backToPending", photoId: photo.id });
                    },
                    danger: false,
                  },
                  {
                    Icon: Trash2,
                    label: "Delete photo",
                    run: () => {
                      setMenuOpen(false);
                      ask("deletePhoto", { photoId: photo.id });
                    },
                    danger: true,
                  },
                ].map((item) => (
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

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {editing ? (
            <View>
              <FieldLabel>Caption</FieldLabel>
              <Textarea
                value={draft.caption}
                onChangeText={(v) => setDraft({ ...draft, caption: v })}
              />
              <FieldLabel style={{ marginTop: 16 }}>Category</FieldLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    tone="admin"
                    selected={draft.category === category}
                    onPress={() => setDraft({ ...draft, category })}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
              <FieldLabel style={{ marginTop: 16 }}>Club</FieldLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Chip tone="admin" selected={draft.club === null} onPress={() => setDraft({ ...draft, club: null })}>
                  None
                </Chip>
                {CLUBS.map((club) => (
                  <Chip
                    key={club}
                    tone="admin"
                    selected={draft.club === club}
                    onPress={() => setDraft({ ...draft, club })}
                  >
                    {club}
                  </Chip>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <StatusChip tone={photo.status} size="md" />
                <StatusChip tone="approved" label="Consent confirmed" size="md" />
                {request && !request.resolved ? (
                  <StatusChip tone="reported" size="md" />
                ) : null}
              </View>

              <Pressable
                onPress={() => openOverlay("uploaderGrid", { uploaderId: photo.uploaderId })}
                style={{
                  marginTop: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: t.card,
                  padding: 10,
                }}
              >
                <Avatar src={uploader.avatar} name={uploader.name} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                    {uploader.name}
                  </Text>
                  <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground }]}>
                    {uploader.club ?? "No club"} · {uploader.email}
                  </Text>
                </View>
                <Text style={[typography.caption, { fontWeight: "600", color: t.admin }]}>
                  All their photos
                </Text>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
                <MetaChip>{event.name}</MetaChip>
                <MetaChip>{photo.category}</MetaChip>
                <MetaChip>{photo.club ?? "No club"}</MetaChip>
                <MetaChip>Uploaded {formatDate(photo.uploadedAt)}</MetaChip>
              </ScrollView>

              <Text style={[typography.body, { color: t.foreground, marginTop: 12, lineHeight: 22 }]}>
                {photo.caption || "No caption added."}
              </Text>

              {photo.status === "rejected" && photo.rejectReason ? (
                <Surface
                  style={{
                    marginTop: 12,
                    borderColor: t.rejected + "40",
                    backgroundColor: t.rejectedSoft,
                    padding: 14,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        color: t.rejectedForeground,
                      },
                    ]}
                  >
                    Rejection reason sent to the uploader
                  </Text>
                  <Text
                    style={[typography.label, { fontWeight: "600", color: t.rejectedForeground, marginTop: 4 }]}
                  >
                    {photo.rejectReason}
                  </Text>
                </Surface>
              ) : null}

              {request && !request.resolved ? (
                <Surface style={{ marginTop: 12, borderColor: t.reported + "4D", padding: 14 }}>
                  <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
                    <ShieldCheck size={16} color={t.reported} /> Removal request
                  </Text>
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {[
                      ["Reporter", reporter?.name ?? "Unknown"],
                      ["Reason", request.reason],
                      ["Requested", formatDateTime(request.requestedAt)],
                    ].map(([dt, dd]) => (
                      <View key={dt} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <Text style={[typography.caption, { color: t.mutedForeground }]}>{dt}</Text>
                        <Text
                          style={[
                            typography.caption,
                            { fontWeight: "600", color: t.foreground, textAlign: "right", flexShrink: 1 },
                          ]}
                        >
                          {dd}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {request.notes ? (
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: t.mutedForeground,
                          backgroundColor: t.muted,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginTop: 8,
                          lineHeight: 17,
                        },
                      ]}
                    >
                      “{request.notes}”
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <Button
                      variant="outline"
                      style={{ flex: 1 }}
                      title="Dismiss"
                      onPress={async () => {
                        const reportId = photo.removalRequest?.id ?? `report-${photo.id}`;
                        try {
                          await api.resolveReport(reportId, { action: "dismiss" });
                        } catch {
                          return;
                        }
                        dispatch({ type: "dismissRemoval", photoId: photo.id });
                      }}
                    />
                    <Button
                      variant="destructive"
                      style={{ flex: 1 }}
                      title="Remove photo"
                      onPress={() => ask("removePhoto", { photoId: photo.id })}
                    />
                  </View>
                </Surface>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
};

/* ============================= Reject reason ============================ */

/** Sheet 12 — Reject Reason. Preset chips, note required for "Other". */
export const RejectReasonSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const t = useTheme();
  const { dispatch, close } = useMockApp();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const needsNote = reason === "Other";
  const canConfirm = Boolean(reason) && (!needsNote || note.trim().length > 2);

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Reject this photo?"
      description="The uploader is notified with the reason you pick."
      footer={
        <Button
          block
          size="lg"
          variant="destructive"
          disabled={!canConfirm}
          title={`Confirm reject${reason ? ` · ${reason}` : ""}`}
          icon={<X size={17} color={t.destructiveForeground} />}
          onPress={() => {
            if (!reason || !photoId) return;
            void (async () => {
              try {
                await api.rejectPhoto(photoId, {
                  reason: rejectionCodeOf(reason) as Parameters<typeof api.rejectPhoto>[1]["reason"],
                  note: needsNote ? note.trim() : undefined,
                });
              } catch {
                return; // keep the sheet open so the admin can retry
              }
              dispatch({ type: "reject", photoId, reason });
            })();
          }}
        />
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {REJECT_PRESETS.map((preset) => (
            <Chip key={preset} selected={reason === preset} onPress={() => setReason(preset)}>
              {preset}
            </Chip>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <FieldLabel required={needsNote} hint={needsNote ? "Required for Other" : "Optional"}>
            Note to the uploader
          </FieldLabel>
          <Textarea
            value={note}
            onChangeText={setNote}
            placeholder={
              needsNote
                ? "Tell them what was wrong so they can pick a better shot."
                : "Add context if the reason needs an explanation."
            }
          />
        </View>

        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 12, lineHeight: 17 }]}>
          Rejected photos stay in the archive with this reason attached, and the student sees a quiet note
          with a Replace photo button inside the photo viewer.
        </Text>
      </View>
    </Sheet>
  );
};

/* ================================= Filter =============================== */

const STATUS_OPTIONS: { value: PhotoStatus | "any"; label: string }[] = [
  { value: "any", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** Sheet 13 — Filter. Everything applies to the All photos grid. */
export const FilterSheet = ({ open }: { open: boolean }) => {
  const t = useTheme();
  const { state, dispatch, close } = useMockApp();
  const draft = state.filterDraft;
  const [uploaderSearch, setUploaderSearch] = useState("");

  const patch = (next: Partial<typeof draft>) => dispatch({ type: "patchFilterDraft", patch: next });
  const resultCount = filterPhotos(state.photos, draft).length;
  const uploaders = state.photos
    .map((p) => p.uploaderId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((id) => PEOPLE.find((person) => person.id === id))
    .filter((person): person is (typeof PEOPLE)[number] => Boolean(person))
    .filter((person) => person.name.toLowerCase().includes(uploaderSearch.trim().toLowerCase()));

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title="Filter photos"
      description="Narrow the grid down, then apply."
      footer={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            variant="outline"
            title="Reset"
            icon={<RotateCcw size={17} color={t.foreground} />}
            onPress={() => dispatch({ type: "resetFilter" })}
          />
          <Button
            variant="admin"
            style={{ flex: 1 }}
            title={`Show ${resultCount} photo${resultCount === 1 ? "" : "s"}`}
            onPress={() => dispatch({ type: "applyFilter" })}
          />
        </View>
      }
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <FieldLabel>Status</FieldLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              tone="admin"
              selected={draft.status === option.value}
              onPress={() => patch({ status: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </View>

        <FieldLabel style={{ marginTop: 20 }}>Event</FieldLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <Chip tone="admin" selected={draft.eventId === "any"} onPress={() => patch({ eventId: "any" })}>
            All events
          </Chip>
          {state.events.map((event) => (
            <Chip
              key={event.id}
              tone="admin"
              selected={draft.eventId === event.id}
              onPress={() => patch({ eventId: event.id })}
            >
              {event.name}
            </Chip>
          ))}
        </View>

        <FieldLabel style={{ marginTop: 20 }}>Category</FieldLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <Chip tone="admin" selected={draft.category === "any"} onPress={() => patch({ category: "any" })}>
            Any
          </Chip>
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              tone="admin"
              selected={draft.category === category}
              onPress={() => patch({ category: category as Category })}
            >
              {category}
            </Chip>
          ))}
        </View>

        <FieldLabel style={{ marginTop: 20 }}>Club</FieldLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <Chip tone="admin" selected={draft.club === "any"} onPress={() => patch({ club: "any" })}>
            Any
          </Chip>
          {CLUBS.map((club) => (
            <Chip
              key={club}
              tone="admin"
              selected={draft.club === club}
              onPress={() => patch({ club: club as Club })}
            >
              {club}
            </Chip>
          ))}
        </View>

        <FieldLabel style={{ marginTop: 20 }}>Uploader</FieldLabel>
        <SearchField
          style={{ marginTop: 8 }}
          value={uploaderSearch}
          onChange={setUploaderSearch}
          placeholder="Search by name"
          icon={<Search size={16} color={t.mutedForeground} />}
          ariaLabel="Search uploaders"
        />
        <ScrollView style={{ marginTop: 10, maxHeight: 208 }} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => patch({ uploaderId: "any" })}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: draft.uploaderId === "any" ? t.admin : t.border,
              backgroundColor: draft.uploaderId === "any" ? t.adminSurface : t.card,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 6,
            }}
          >
            <Text style={[typography.label, { fontWeight: "600", color: t.foreground }]}>Anyone</Text>
          </Pressable>
          {uploaders.map((person) => {
            const active = draft.uploaderId === person.id;
            return (
              <Pressable
                key={person.id}
                onPress={() => patch({ uploaderId: person.id })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: active ? t.admin : t.border,
                  backgroundColor: active ? t.adminSurface : t.card,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 6,
                }}
              >
                <Avatar src={person.avatar} name={person.name} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[typography.label, { fontWeight: "600", color: t.foreground }]}>
                    {person.name}
                  </Text>
                  <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground }]}>
                    {person.club ?? "No club"} · {state.photos.filter((p) => p.uploaderId === person.id).length}{" "}
                    photos
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ marginTop: 20 }}>
          <FieldLabel hint="Uploaded between">Date range</FieldLabel>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                value={draft.from ? new Date(draft.from).toISOString() : new Date().toISOString()}
                onChange={(iso) => patch({ from: iso.slice(0, 10) })}
              />
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4 }]}>From</Text>
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField
                value={draft.to ? new Date(draft.to).toISOString() : new Date().toISOString()}
                onChange={(iso) => patch({ to: iso.slice(0, 10) })}
              />
              <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 4 }]}>Until</Text>
            </View>
          </View>
        </View>

        <Surface style={{ marginTop: 20 }}>
          <SwitchRow
            label="Reported only"
            description="Photos with an open removal request"
            checked={draft.reportedOnly}
            onChange={(value) => patch({ reportedOnly: value })}
          />
        </Surface>
      </View>
    </Sheet>
  );
};

/* ============================== Uploader grid =========================== */

/** Extra overlay — read-only grid of one uploader's photos (All photos spec). */
export const UploaderGridSheet = ({ open, uploaderId }: { open: boolean; uploaderId?: string }) => {
  const t = useTheme();
  const { state, close, open: openOverlay } = useMockApp();
  // P6: the uploader's photos merge into the pool from GET /admin/users/:id/photos.
  useUploaderPhotosSync(uploaderId);
  const photos = useMemo(
    () => (uploaderId ? photosByUploader(state, uploaderId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.photos, uploaderId],
  );
  const counts = useMemo(() => batchCounts(photos), [photos]);
  if (!uploaderId) return null;

  const person = personById(uploaderId);

  return (
    <Sheet
      open={open}
      onClose={close}
      size="tall"
      title={person.name}
      description={`${photos.length} photo${photos.length === 1 ? "" : "s"} · read-only view`}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 16,
            backgroundColor: t.adminSurface,
            padding: 14,
          }}
        >
          <Avatar src={person.avatar} name={person.name} size="lg" />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[typography.label, { fontWeight: "700", color: t.adminInk }]}>
              {person.email}
            </Text>
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: t.adminInk, opacity: 0.8, marginTop: 2 }]}
            >
              {person.club ?? "No club"} · submitted to{" "}
              {new Set(photos.map((p) => p.eventId)).size} events
            </Text>
          </View>
        </View>

        {photos.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
            {photos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                showStatus
                batchCount={batchCountFor(counts, photo)}
                onPress={() => openOverlay("adminPhotoDetail", { photoId: photo.id })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={UserRound}
            title="No photos from this student"
            message="They have not submitted anything to the yearbook yet."
          />
        )}

        <Text style={[typography.caption, { color: t.mutedForeground, marginTop: 16, lineHeight: 17 }]}>
          Committee members can browse everything a student submitted, including photos from other events.
        </Text>
      </View>
    </Sheet>
  );
};
