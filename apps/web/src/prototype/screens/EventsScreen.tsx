import { CalendarPlus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EventCard } from "@/components/app/EventCard";
import { PhoneInput } from "@/components/app/Fields";
import { EmptyState } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { countdown } from "@/prototype/format";
import { eventSubmissionCount } from "@/prototype/selectors";
import { ListSkeleton } from "@/prototype/skeletons";
import { useMockApp } from "@/prototype/store";
import { AccessDeniedState, AdminBar } from "@/prototype/screens/AdminBar";

/** Screen 6 — Admin events: create, edit, open/close, and see submission volume. */
export const EventsScreen = () => {
  const { state, open } = useMockApp();
  const [search, setSearch] = useState("");

  const events = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...state.events].sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
    return term ? list.filter((e) => e.name.toLowerCase().includes(term)) : list;
  }, [search, state.events]);

  if (state.authIssue === "denied") {
    return (
      <div className="flex h-full flex-col bg-background">
        <AdminBar title="Events" />
        <AccessDeniedState />
      </div>
    );
  }

  const openCount = state.events.filter((e) => e.open && !countdown(e.deadline).closed).length;

  return (
    <div className="flex h-full flex-col bg-background">
      <AdminBar
        title="Events"
        subtitle={`${state.events.length} events · ${openCount} accepting photos`}
      />

      <div className="shrink-0 px-5 pt-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <PhoneInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
            className="h-11 pl-10"
            aria-label="Search events"
          />
        </div>
        <PhoneButton block variant="admin" className="mt-3" onClick={() => open("eventForm")}>
          <Plus />
          New event
        </PhoneButton>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {state.loading ? (
          <ListSkeleton rows={4} />
        ) : events.length ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                role="admin"
                submissionCount={eventSubmissionCount(state, event.id)}
                onClick={() => open("eventForm", { eventId: event.id })}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="No events yet"
            message="Create an event and it appears on every student's Home screen straight away."
            action={{ label: "New event", onClick: () => open("eventForm") }}
          />
        )}
      </div>
    </div>
  );
};
