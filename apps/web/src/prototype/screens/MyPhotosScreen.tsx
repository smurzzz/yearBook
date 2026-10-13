import { Camera, Images, Info, Plus, Settings } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { Chip, ChipRow } from "@/components/app/Chip";
import { EmptyState, Spinner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { PhotoTile } from "@/components/app/PhotoTile";
import { Surface } from "@/components/app/Surface";
import { STUDENT_ID, eventById, personById } from "@/prototype/data";
import { batchCountFor, batchCounts, myPhotos, studentStats } from "@/prototype/selectors";
import { GridOnlySkeleton } from "@/prototype/skeletons";
import { useMockApp } from "@/prototype/store";

/** Screen 4 — My Photos. Instagram-style gallery with no status anywhere. */
export const MyPhotosScreen = () => {
  const { state, dispatch, goto, open } = useMockApp();
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mine = myPhotos(state);
  const stats = studentStats(state);
  const counts = useMemo(() => batchCounts(mine), [mine]);
  const myEventIds = useMemo(() => [...new Set(mine.map((p) => p.eventId))], [mine]);
  const visible = eventFilter === "all" ? mine : mine.filter((p) => p.eventId === eventFilter);
  const avatar = personById(STUDENT_ID).avatar;

  const triggerRefresh = () => {
    dispatch({ type: "setRefreshing", value: true });
    setPull(0);
    window.setTimeout(() => dispatch({ type: "setRefreshing", value: false }), 1100);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 px-5 pt-4">
        <div className="flex items-start gap-4">
          <Avatar src={avatar} name={state.studentName} size="xl" />
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-heading font-bold text-foreground">{state.studentName}</p>
            <p className="mt-0.5 truncate text-label text-muted-foreground">
              {state.studentClub ?? "No club"}
            </p>
            <div className="mt-3 flex items-center gap-6">
              <span>
                <span className="tabular block text-subhead font-bold leading-none text-foreground">
                  {stats.photos}
                </span>
                <span className="mt-0.5 block text-caption font-semibold text-muted-foreground">
                  Photos
                </span>
              </span>
              <span>
                <span className="tabular block text-subhead font-bold leading-none text-foreground">
                  {stats.events}
                </span>
                <span className="mt-0.5 block text-caption font-semibold text-muted-foreground">
                  Events
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => open("profile")}
            aria-label="Settings and profile"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="size-[21px]" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3.5 flex items-start gap-1.5 text-caption leading-[17px] text-muted-foreground">
          <Info className="mt-[1px] size-3.5 shrink-0" aria-hidden="true" />
          Only you and the yearbook committee can see your photos.
        </p>
      </header>

      <div className="mt-3 shrink-0">
        <ChipRow>
          <Chip selected={eventFilter === "all"} onClick={() => setEventFilter("all")}>
            All
          </Chip>
          {myEventIds.map((id) => (
            <Chip key={id} selected={eventFilter === id} onClick={() => setEventFilter(id)}>
              {eventById(id).name}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2"
        onPointerDown={(e) => {
          if (scrollRef.current?.scrollTop === 0) startY.current = e.clientY;
        }}
        onPointerMove={(e) => {
          if (startY.current === null) return;
          const dy = e.clientY - startY.current;
          if (dy > 0) setPull(Math.min(72, dy * 0.55));
        }}
        onPointerUp={() => {
          if (pull > 44) triggerRefresh();
          else setPull(0);
          startY.current = null;
        }}
        onPointerCancel={() => {
          startY.current = null;
          setPull(0);
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden text-caption font-semibold text-muted-foreground transition-[height] duration-200"
          style={{ height: state.refreshing ? 40 : pull }}
          aria-live="polite"
        >
          {state.refreshing ? (
            <span className="flex items-center gap-2">
              <Spinner className="size-4" />
              Refreshing
            </span>
          ) : pull > 44 ? (
            "Release to refresh"
          ) : pull > 0 ? (
            "Pull to refresh"
          ) : null}
        </div>

        {state.loading ? (
          <GridOnlySkeleton />
        ) : visible.length ? (
          <div className="grid grid-cols-3 gap-1">
            {visible.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                batchCount={batchCountFor(counts, photo)}
                onClick={() => open("photoViewer", { photoId: photo.id })}
              />
            ))}
          </div>
        ) : mine.length ? (
          <EmptyState
            icon={Images}
            title={`Nothing in ${eventById(eventFilter).name} yet`}
            message="Pick another event or upload photos for this one."
          />
        ) : (
          <EmptyState
            icon={Images}
            title="No photos yet"
            message="Tap + to upload your first one."
          />
        )}
      </div>

      {mine.length ? (
        <div className="shrink-0 px-5 pb-4">
          <Surface inset className="flex items-center gap-3 border-dashed bg-muted/40">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Camera className="size-[18px]" aria-hidden="true" />
            </span>
            <p className="flex-1 text-caption text-muted-foreground">
              Showing {visible.length} of {mine.length} photos
            </p>
            <PhoneButton size="sm" onClick={() => goto("upload")}>
              <Plus />
              Add
            </PhoneButton>
          </Surface>
        </div>
      ) : null}
    </div>
  );
};
