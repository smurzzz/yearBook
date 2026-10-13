import { Bell, Images, Plus } from "lucide-react";
import { useMemo } from "react";

import { Avatar } from "@/components/app/Avatar";
import { EventCard } from "@/components/app/EventCard";
import { EmptyState } from "@/components/app/Feedback";
import { UnreadDot } from "@/components/app/Indicators";
import { PhoneButton } from "@/components/app/PhoneButton";
import { PhotoTile } from "@/components/app/PhotoTile";
import { SectionHeader } from "@/components/app/Surface";
import { STUDENT_ID, personById } from "@/prototype/data";
import {
  batchCountFor,
  batchCounts,
  eventsForStudent,
  myPhotos,
  unreadCount,
} from "@/prototype/selectors";
import { HomeSkeleton } from "@/prototype/skeletons";
import { useMockApp } from "@/prototype/store";

/** Screen 2 — Student home: deadlines plus the student's recent uploads. */
export const HomeScreen = () => {
  const { state, dispatch, goto, open } = useMockApp();
  const photos = myPhotos(state);
  const events = eventsForStudent(state);
  const unread = unreadCount(state);
  const counts = useMemo(() => batchCounts(photos), [photos]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = state.studentName.split(" ")[0];
  const avatar = personById(STUDENT_ID).avatar;

  if (state.loading) {
    return (
      <div className="relative h-full overflow-hidden bg-background">
        <HomeSkeleton />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 px-5 pb-1 pt-3">
        <button
          type="button"
          onClick={() => open("profile")}
          aria-label="Open profile"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar src={avatar} name={state.studentName} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-semibold text-muted-foreground">
            {state.studentClub ? `Grade 11 · ${state.studentClub}` : "Grade 11"}
          </p>
          <p className="truncate text-subhead font-bold text-foreground">
            {greeting}, {firstName}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "openOverlay",
              overlay: { id: state.notificationsAsked ? "notifications" : "notifPermission" },
            })
          }
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-[21px]" aria-hidden="true" />
          {unread > 0 ? <UnreadDot className="absolute right-2.5 top-2.5" /> : null}
        </button>
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        <SectionHeader className="mt-4" eyebrow="Deadlines" title="Upcoming deadlines" />
        <div className="mt-3 space-y-3.5">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              role="student"
              onClick={() => open("eventDetail", { eventId: event.id })}
            />
          ))}
        </div>

        <SectionHeader
          className="mt-7"
          eyebrow="Your submissions"
          title="Recent uploads"
          action="Upload"
          onAction={() => goto("upload")}
        />
        {photos.length ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {photos.slice(0, 9).map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  batchCount={batchCountFor(counts, photo)}
                  onClick={() => open("photoViewer", { photoId: photo.id })}
                />
              ))}
            </div>
            <PhoneButton block variant="outline" className="mt-4" onClick={() => goto("myPhotos")}>
              View all {photos.length} photos
            </PhoneButton>
          </>
        ) : (
          <EmptyState
            className="mt-3"
            variant="inset"
            icon={Images}
            title="No photos yet"
            message="Tap + to upload your first one."
            action={{ label: "Upload photos", icon: Plus, onClick: () => goto("upload") }}
          />
        )}

        <p className="mt-4 text-center text-caption text-muted-foreground">
          Only you and the yearbook committee can see your photos.
        </p>
      </main>
    </div>
  );
};
