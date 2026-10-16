import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import {
  Check,
  ClipboardCheck,
  Flag,
  Images,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { typography } from "../theme/tokens";
import { Avatar, PhotoTile, ZoomableImage } from "../components/ui/Media";
import { Button } from "../components/ui/Button";
import { SearchField } from "../components/ui/Fields";
import { Chip, ChipRow, MetaChip, SegmentedControl } from "../components/ui/Chips";
import { EmptyState, ErrorRetryBlock, InlineBanner } from "../components/ui/Feedback";
import { eventById, personById } from "../prototype/data";
import { formatDate, relativeTime } from "../prototype/format";
import {
  activeFilterCount,
  batchCounts,
  clampReviewIndex,
  filteredPhotos,
  pendingPhotos,
  statusCounts,
} from "../prototype/selectors";
import { GridOnlySkeleton, ReviewSkeleton } from "../prototype/skeletons";
import { useMockApp } from "../prototype/store";
import { api } from "../api";
import { useBrowseSync, useEventsSync, useReviewSync } from "../api/sync";
import { AccessDeniedState, AdminBar } from "./AdminBar";
import type { FilterState } from "../prototype/types";
export const ReviewScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useMockApp();
  // P6: the deck hydrates from GET /admin/review/queue, the All-photos grid
  // from GET /admin/photos (both merge into the shared photo pool); the
  // event filter and the facet filters stay client-side over the rich data.
  useEventsSync();
  useReviewSync();
  useBrowseSync();
  const mode = state.allPhotosMode;
  const pending = pendingPhotos(state).length;

  if (state.authIssue === "denied") {
    return (
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <AdminBar title="Review queue" />
        <AccessDeniedState />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <AdminBar title={mode === "review" ? "Review queue" : "All photos"} />

      <View
        style={{
          borderBottomWidth: 1,
          borderColor: t.border,
          backgroundColor: t.adminSurface,
          paddingHorizontal: 20,
          paddingVertical: 10,
        }}
      >
        <SegmentedControl
          surface={t.admin}
          value={mode}
          onChange={(key) => dispatch({ type: "setAllPhotosMode", mode: key as "review" | "all" })}
          segments={[
            { key: "review", label: "Review", badge: pending },
            { key: "all", label: "All photos" },
          ]}
        />
      </View>

      {mode === "review" ? <ReviewDeck /> : <AllPhotos />}
      <View style={{ height: insets.bottom }} />
    </View>
  );
};

/* ------------------------------- Review deck ------------------------------ */

const ReviewDeck = () => {
  const t = useTheme();
  const { state, dispatch, open } = useMockApp();
  const queue = pendingPhotos(state);
  const index = clampReviewIndex(state.reviewIndex, queue.length);
  const photo = queue[index];

  if (state.loading) return <ReviewSkeleton />;

  if (state.loadError) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
        <ErrorRetryBlock onRetry={() => dispatch({ type: "setLoadError", value: false })} />
      </View>
    );
  }

  if (!photo) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="All caught up!"
        message="Nothing is waiting for review. New submissions show up here as soon as students upload."
        action={{ label: "Browse all photos", onClick: () => dispatch({ type: "setAllPhotosMode", mode: "all" }) }}
      />
    );
  }

  const uploader = personById(photo.uploaderId);

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
          {queue.length} pending
        </Text>
        <View style={{ flex: 1 }}>
          <ChipRow contentStyle={{ justifyContent: "flex-end", paddingVertical: 0 }}>
            <Chip
              selected={state.reviewEventFilter === "all"}
              onPress={() => dispatch({ type: "setReviewEventFilter", eventId: "all" })}
            >
              All events
            </Chip>
            {state.events.map((event) => (
              <Chip
                key={event.id}
                selected={state.reviewEventFilter === event.id}
                onPress={() => dispatch({ type: "setReviewEventFilter", eventId: event.id })}
              >
                {event.name}
              </Chip>
            ))}
          </ChipRow>
        </View>
      </View>

      <ZoomableImage
        src={photo.src}
        onSwipe={(delta) => dispatch({ type: "reviewStep", delta })}
        style={{ height: 232, borderRadius: 20, marginTop: 12, backgroundColor: t.muted }}
      >
        <View
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            borderRadius: 999,
            backgroundColor: t.onImageSurface,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={[typography.caption, { color: t.onImage, fontWeight: "700" }]}>
            {index + 1} of {queue.length}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            borderRadius: 999,
            backgroundColor: t.onImageSurface,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={[typography.caption, { color: t.onImage, fontWeight: "600" }]}>Swipe for next</Text>
        </View>
      </ZoomableImage>

      <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => open("uploaderGrid", { uploaderId: photo.uploaderId })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border + "B3",
            backgroundColor: t.card,
            padding: 10,
          }}
        >
          <Avatar src={uploader.avatar} name={uploader.name} size="sm" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[typography.label, { fontWeight: "700", color: t.foreground }]}>
              {uploader.name}
            </Text>
            <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground }]}>
              {uploader.club ?? "No club"} · {relativeTime(photo.uploadedAt)}
            </Text>
          </View>
          <Text style={[typography.caption, { fontWeight: "700", color: t.admin }]}>All their photos</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 12 }}>
          <MetaChip>{eventById(photo.eventId).name}</MetaChip>
          <MetaChip>{photo.category}</MetaChip>
          <MetaChip>{photo.club ?? "No club"}</MetaChip>
          <MetaChip>Uploaded {formatDate(photo.uploadedAt)}</MetaChip>
        </ScrollView>

        <Text style={[typography.body, { color: t.foreground, marginTop: 12, lineHeight: 22 }]}>
          {photo.caption || "No caption added."}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            borderRadius: 999,
            backgroundColor: t.approvedSoft,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginTop: 12,
          }}
        >
          <ShieldCheck size={14} color={t.approvedForeground} />
          <Text style={[typography.caption, { color: t.approvedForeground, fontWeight: "600" }]}>
            Consent confirmed
          </Text>
        </View>

        {photo.removalRequest ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: t.reported + "4D",
              backgroundColor: t.reportedSoft,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Flag size={16} color={t.reportedForeground} />
            <Text style={[typography.caption, { color: t.reportedForeground, fontWeight: "600", flex: 1 }]}>
              This photo has an open removal request.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 12, paddingBottom: Math.max(16, 8) }}>
        <Button
          size="lg"
          variant="outline"
          style={{ flex: 1 }}
          title="Reject"
          titleColor={t.destructive}
          onPress={() => open("rejectReason", { photoId: photo.id })}
          icon={<X size={18} color={t.destructive} />}
        />
        <Button
          size="lg"
          variant="admin"
          style={{ flex: 1 }}
          title="Approve"
          onPress={async () => {
            // P6: the server owns the transition; the reducer mirrors it.
            try {
              await api.approvePhoto(photo.id);
            } catch {
              return;
            }
            dispatch({ type: "approve", photoId: photo.id });
          }}
          icon={<Check size={18} color={t.adminForeground} />}
        />
      </View>
    </View>
  );
};

/* -------------------------------- All photos ------------------------------ */

const AllPhotos = () => {
  const t = useTheme();
  const { state, dispatch, open } = useMockApp();
  const [search, setSearch] = useState("");
  const filter = state.filter;
  const width = Dimensions.get("window").width;

  const results = useMemo(() => {
    const list = filteredPhotos(state);
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((photo) => {
      const uploader = personById(photo.uploaderId).name.toLowerCase();
      return (
        photo.caption.toLowerCase().includes(term) ||
        uploader.includes(term) ||
        eventById(photo.eventId).name.toLowerCase().includes(term) ||
        photo.category.toLowerCase().includes(term)
      );
    });
  }, [search, state]);

  const counts = useMemo(() => statusCounts(filteredPhotos(state)), [state]);
  const batch = useMemo(() => batchCounts(results), [results]);
  const chipCount = activeFilterCount(filter);

  const patch = (next: Partial<FilterState>) => dispatch({ type: "applyFilter", filter: { ...filter, ...next } });

  const chips: { label: string; clear: () => void }[] = [];
  if (filter.status !== "any")
    chips.push({
      label: filter.status[0].toUpperCase() + filter.status.slice(1),
      clear: () => patch({ status: "any" }),
    });
  if (filter.eventId !== "any") chips.push({ label: eventById(filter.eventId).name, clear: () => patch({ eventId: "any" }) });
  if (filter.category !== "any") chips.push({ label: filter.category, clear: () => patch({ category: "any" }) });
  if (filter.club !== "any") chips.push({ label: filter.club, clear: () => patch({ club: "any" }) });
  if (filter.uploaderId !== "any")
    chips.push({ label: personById(filter.uploaderId).name, clear: () => patch({ uploaderId: "any" }) });
  if (filter.reportedOnly) chips.push({ label: "Reported", clear: () => patch({ reportedOnly: false }) });
  if (filter.from || filter.to) chips.push({ label: "Date range", clear: () => patch({ from: null, to: null }) });

  if (state.loading) {
    return (
      <View style={{ flex: 1 }}>
        <GridOnlySkeleton count={12} />
      </View>
    );
  }

  if (state.loadError) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
        <ErrorRetryBlock onRetry={() => dispatch({ type: "setLoadError", value: false })} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <SearchField
            style={{ flex: 1 }}
            value={search}
            onChange={setSearch}
            placeholder="Search captions or uploaders"
            ariaLabel="Search photos"
            icon={<Search size={16} color={t.mutedForeground} />}
          />
          <View>
            <Button
              variant="outline"
              size="icon"
              accessibilityLabel={chipCount ? `Filters, ${chipCount} active` : "Filters"}
              onPress={() => open("filter")}
              icon={<SlidersHorizontal size={19} color={t.foreground} />}
            />
            {chipCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -2,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: t.admin,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text style={[typography.caption, { fontSize: 10, fontWeight: "700", color: t.adminForeground }]}>
                  {chipCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {chips.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 10 }}>
            {chips.map((chip) => (
              <Pressable
                key={chip.label}
                onPress={chip.clear}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  height: 28,
                  borderRadius: 999,
                  backgroundColor: t.adminSurface,
                  paddingHorizontal: 10,
                }}
              >
                <Text style={[typography.caption, { fontWeight: "600", color: t.adminInk }]}>{chip.label}</Text>
                <X size={14} color={t.adminInk} />
              </Pressable>
            ))}
            <Pressable onPress={() => dispatch({ type: "resetFilter" })} hitSlop={8} style={{ height: 28, justifyContent: "center", paddingHorizontal: 10 }}>
              <Text style={[typography.caption, { fontWeight: "700", color: t.admin, textDecorationLine: "underline" }]}>
                Reset
              </Text>
            </Pressable>
          </ScrollView>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
          <Text style={[typography.caption, { fontWeight: "600", color: t.foreground }]}>
            {results.length} of {state.photos.length} photos
          </Text>
          <Text style={[typography.caption, { color: t.mutedForeground }]}>
            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          chipCount === 0 ? (
            <EmptyState icon={Images} title="No photos yet" />
          ) : filter.reportedOnly && chipCount === 1 ? (
            <EmptyState
              icon={Flag}
              title="No removal requests"
              message="Photos students ask to remove will appear here for the committee to resolve."
            />
          ) : filter.reportedOnly ? (
            <EmptyState icon={Flag} title="No matching reports." />
          ) : (
            <EmptyState
              icon={Search}
              title="No photos match"
              message="Try a different search term or reset the filters."
              action={{ label: "Reset filters", onClick: () => dispatch({ type: "resetFilter" }) }}
            />
          )
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {results.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                showStatus
                size={(width - 40 - 8) / 3}
                batchCount={photo.batchId ? batch.get(photo.batchId) ?? 1 : 1}
                onPress={() => open("adminPhotoDetail", { photoId: photo.id })}
              />
            ))}
          </View>
        )}

        {counts.rejected > 0 ? (
          <InlineBanner
            style={{ marginTop: 16 }}
            tone="info"
            title="Rejected photos stay here"
            message="They are excluded from the yearbook layout but kept as a record, with the reason attached."
          />
        ) : null}
      </ScrollView>
    </View>
  );
};
