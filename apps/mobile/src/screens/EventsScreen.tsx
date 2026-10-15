import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { CalendarPlus, ChevronRight, Plus, Search } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { SearchField } from "../components/ui/Fields";
import { CountBadge, OpenClosedBadge } from "../components/ui/Chips";
import { EmptyState, ErrorRetryBlock } from "../components/ui/Feedback";
import { useTheme } from "../theme/useTheme";
import { radius as radii, typography } from "../theme/tokens";
import { img } from "../prototype/assets";
import { countdown, formatDateTime } from "../prototype/format";
import { eventSubmissionCount } from "../prototype/selectors";
import { ListSkeleton } from "../prototype/skeletons";
import { useMockApp } from "../prototype/store";
import { AccessDeniedState, AdminBar } from "./AdminBar";
import type { EventItem } from "../prototype/types";

/** Admin event card: denser row that leads with the Open / Closed state. */
const AdminEventCard = ({ event, submissionCount, onPress }: { event: EventItem; submissionCount: number; onPress: () => void }) => {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: t.border + "B3",
          backgroundColor: t.card,
          padding: 10,
          opacity: pressed ? 0.96 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={{ width: 68, height: 68, borderRadius: 16, overflow: "hidden", backgroundColor: t.muted }}>
        <Image source={img(event.cover)} style={{ width: 68, height: 68 }} resizeMode="cover" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[typography.subhead, { fontWeight: "700", color: t.foreground }]}>
          {event.name}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: t.mutedForeground, marginTop: 4 }]}>
          Deadline {formatDateTime(event.deadline)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <OpenClosedBadge isOpen={event.open && !countdown(event.deadline).closed} />
          <CountBadge count={submissionCount} />
        </View>
      </View>
      <ChevronRight size={16} color={t.mutedForeground} />
    </Pressable>
  );
};

/** Screen 6 — Admin events: create, edit, open/close, and submission volume. */
export const EventsScreen = () => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch, open } = useMockApp();
  const [search, setSearch] = useState("");

  const events = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...state.events].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
    return term ? list.filter((e) => e.name.toLowerCase().includes(term)) : list;
  }, [search, state.events]);

  if (state.authIssue === "denied") {
    return (
      <View style={{ flex: 1, backgroundColor: t.background }}>
        <AdminBar title="Events" />
        <AccessDeniedState />
      </View>
    );
  }

  const openCount = state.events.filter((e) => e.open && !countdown(e.deadline).closed).length;

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <AdminBar title="Events" subtitle={`${state.events.length} events · ${openCount} accepting photos`} />

      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search events"
          ariaLabel="Search events"
          icon={<Search size={16} color={t.mutedForeground} />}
        />
        <Button
          block
          variant="admin"
          style={{ marginTop: 12 }}
          title="New event"
          onPress={() => open("eventForm")}
          icon={<Plus size={18} color={t.adminForeground} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {state.loadError ? (
          <ErrorRetryBlock
            style={{ marginBottom: 16 }}
            onRetry={() => dispatch({ type: "setLoadError", value: false })}
          />
        ) : null}
        {state.loading ? (
          <ListSkeleton rows={6} />
        ) : events.length ? (
          <View style={{ gap: 12 }}>
            {events.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                submissionCount={eventSubmissionCount(state, event.id)}
                onPress={() => open("eventForm", { eventId: event.id })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="No events yet"
            message="Create an event and it appears on every student's Home screen straight away."
            action={{ label: "New event", onClick: () => open("eventForm") }}
          />
        )}
      </ScrollView>
    </View>
  );
};
