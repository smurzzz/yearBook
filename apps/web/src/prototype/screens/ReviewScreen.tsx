import {
  Check,
  ClipboardCheck,
  Flag,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { Chip, ChipRow, MetaChip } from "@/components/app/Chip";
import { EmptyState, InlineBanner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { PhotoTile } from "@/components/app/PhotoTile";
import { PhoneInput } from "@/components/app/Fields";
import { cn } from "@/lib/utils";
import { eventById, personById } from "@/prototype/data";
import { formatDate, relativeTime } from "@/prototype/format";
import {
  activeFilterCount,
  batchCountFor,
  batchCounts,
  clampReviewIndex,
  filteredPhotos,
  pendingPhotos,
  statusCounts,
} from "@/prototype/selectors";
import { GridOnlySkeleton, ReviewSkeleton } from "@/prototype/skeletons";
import { useMockApp } from "@/prototype/store";
import { AccessDeniedState, AdminBar } from "@/prototype/screens/AdminBar";
import { ZoomableImage } from "@/prototype/ZoomableImage";

/** Screen 5 — Admin review, with the Review | All photos switch at the top. */
export const ReviewScreen = () => {
  const { state, dispatch } = useMockApp();
  const mode = state.allPhotosMode;

  if (state.authIssue === "denied") {
    return (
      <div className="flex h-full flex-col bg-background">
        <AdminBar title="Review queue" />
        <AccessDeniedState />
      </div>
    );
  }

  const pending = pendingPhotos(state).length;

  return (
    <div className="flex h-full flex-col bg-background">
      <AdminBar title={mode === "review" ? "Review queue" : "All photos"} />

      <div className="shrink-0 border-b border-border bg-admin-surface px-5 py-2.5">
        <div role="tablist" aria-label="Review mode" className="flex rounded-full bg-background p-1 shadow-tile">
          {(
            [
              { id: "review" as const, label: "Review" },
              { id: "all" as const, label: "All photos" },
            ]
          ).map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => dispatch({ type: "setAllPhotosMode", mode: tab.id })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-label font-bold transition-all duration-200 ease-smooth",
                  active ? "bg-admin text-admin-foreground shadow-tile" : "text-muted-foreground",
                )}
              >
                {tab.label}
                {tab.id === "review" && pending > 0 ? (
                  <span
                    className={cn(
                      "tabular rounded-full px-1.5 text-caption",
                      active ? "bg-admin-foreground/20" : "bg-muted-foreground/15",
                    )}
                  >
                    {pending}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "review" ? <ReviewDeck /> : <AllPhotos />}
    </div>
  );
};

/* ------------------------------- Review deck ------------------------------ */

const ReviewDeck = () => {
  const { state, dispatch, open } = useMockApp();
  const queue = pendingPhotos(state);
  const index = clampReviewIndex(state.reviewIndex, queue.length);
  const photo = queue[index];

  if (state.loading) return <ReviewSkeleton />;

  if (!photo) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="All caught up!"
        message="Nothing is waiting for review. New submissions show up here as soon as students upload."
        action={{
          label: "Browse all photos",
          onClick: () => dispatch({ type: "setAllPhotosMode", mode: "all" }),
        }}
      />
    );
  }

  const uploader = personById(photo.uploaderId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-5 pt-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="shrink-0 text-label font-bold text-foreground">
          <span className="tabular">{queue.length}</span> pending
        </p>
        <ChipRow className="-mx-0 flex-1 justify-end px-0">
          <Chip
            selected={state.reviewEventFilter === "all"}
            onClick={() => dispatch({ type: "setReviewEventFilter", eventId: "all" })}
          >
            All events
          </Chip>
          {state.events.map((event) => (
            <Chip
              key={event.id}
              selected={state.reviewEventFilter === event.id}
              onClick={() => dispatch({ type: "setReviewEventFilter", eventId: event.id })}
            >
              {event.name}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className="relative mt-3 h-[232px] shrink-0 overflow-hidden rounded-[20px] bg-canvas">
        <ZoomableImage
          src={photo.src}
          alt={photo.caption}
          className="size-full"
          onSwipe={(delta) => dispatch({ type: "reviewStep", delta })}
          overlay={
            <>
              <span className="absolute left-3 top-3 rounded-full bg-onimage-surface px-2.5 py-1 text-caption font-bold text-onimage backdrop-blur-md">
                <span className="tabular">
                  {index + 1} of {queue.length}
                </span>
              </span>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-onimage-surface px-2.5 py-1 text-caption font-semibold text-onimage backdrop-blur-md">
                Swipe for next
              </span>
            </>
          }
        />
      </div>

      <div className="no-scrollbar mt-3.5 flex-1 overflow-y-auto pb-2">
        <button
          type="button"
          onClick={() => open("uploaderGrid", { uploaderId: photo.uploaderId })}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 text-left shadow-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar src={uploader.avatar} name={uploader.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-label font-bold text-foreground">
              {uploader.name}
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {uploader.club ?? "No club"} · {relativeTime(photo.uploadedAt)}
            </span>
          </span>
          <span className="text-caption font-semibold text-admin">All their photos</span>
        </button>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
          <MetaChip>{eventById(photo.eventId).name}</MetaChip>
          <MetaChip>{photo.category}</MetaChip>
          {photo.club ? <MetaChip>{photo.club}</MetaChip> : <MetaChip>No club</MetaChip>}
          <MetaChip>Uploaded {formatDate(photo.uploadedAt)}</MetaChip>
        </div>

        <p className="mt-3 text-body leading-[22px] text-foreground">
          {photo.caption || "No caption added."}
        </p>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-status-approved-soft px-2.5 py-1 text-caption font-semibold text-status-approved-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Consent confirmed
        </span>

        {photo.removalRequest ? (
          <span className="mt-3 flex items-center gap-2 rounded-2xl border border-status-reported/30 bg-status-reported-soft px-3 py-2 text-caption font-semibold text-status-reported-foreground">
            <Flag className="size-4 shrink-0" aria-hidden="true" />
            This photo has an open removal request.
          </span>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-3 pb-4 pt-3">
        <PhoneButton
          size="lg"
          variant="outline"
          block
          className="flex-1 border-status-rejected/35 text-destructive"
          onClick={() => open("rejectReason", { photoId: photo.id })}
        >
          <X />
          Reject
        </PhoneButton>
        <PhoneButton
          size="lg"
          block
          variant="admin"
          className="flex-1"
          onClick={() => dispatch({ type: "approve", photoId: photo.id })}
        >
          <Check />
          Approve
        </PhoneButton>
      </div>
    </div>
  );
};

/* -------------------------------- All photos ------------------------------ */

const AllPhotos = () => {
  const { state, dispatch, open } = useMockApp();
  const [search, setSearch] = useState("");
  const filter = state.filter;

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
  const reported = results.filter((p) => p.removalRequest && !p.removalRequest.resolved);

  const patch = (next: Partial<typeof filter>) =>
    dispatch({ type: "applyFilter", filter: { ...filter, ...next } });

  const chips: { label: string; clear: () => void }[] = [];
  if (filter.status !== "any")
    chips.push({
      label: filter.status[0].toUpperCase() + filter.status.slice(1),
      clear: () => patch({ status: "any" }),
    });
  if (filter.eventId !== "any")
    chips.push({ label: eventById(filter.eventId).name, clear: () => patch({ eventId: "any" }) });
  if (filter.category !== "any")
    chips.push({ label: filter.category, clear: () => patch({ category: "any" }) });
  if (filter.club !== "any") chips.push({ label: filter.club, clear: () => patch({ club: "any" }) });
  if (filter.uploaderId !== "any")
    chips.push({
      label: personById(filter.uploaderId).name,
      clear: () => patch({ uploaderId: "any" }),
    });
  if (filter.reportedOnly)
    chips.push({ label: "Reported", clear: () => patch({ reportedOnly: false }) });
  if (filter.from || filter.to)
    chips.push({ label: "Date range", clear: () => patch({ from: null, to: null }) });

  if (state.loading) {
    return (
      <div className="flex-1 overflow-hidden">
        <GridOnlySkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <PhoneInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captions or uploaders"
              className="h-11 pl-10"
              aria-label="Search photos"
            />
          </div>
          <PhoneButton
            variant="outline"
            size="icon"
            className="relative shrink-0"
            aria-label={chipCount ? `Filters, ${chipCount} active` : "Filters"}
            onClick={() => open("filter")}
          >
            <SlidersHorizontal />
            {chipCount > 0 ? (
              <span className="tabular absolute -right-1 -top-1 min-w-[18px] rounded-full bg-admin px-1 text-center text-[10px] font-bold leading-[18px] text-admin-foreground">
                {chipCount}
              </span>
            ) : null}
          </PhoneButton>
        </div>

        {chips.length ? (
          <div className="no-scrollbar -mx-5 mt-2.5 flex gap-1.5 overflow-x-auto px-5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.clear}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-admin-surface px-2.5 text-caption font-semibold text-admin-ink"
              >
                {chip.label}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: "resetFilter" })}
              className="inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-caption font-bold text-admin underline underline-offset-2"
            >
              Reset
            </button>
          </div>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <p className="text-caption font-semibold text-foreground">
            <span className="tabular">{results.length}</span> of{" "}
            <span className="tabular">{state.photos.length}</span> photos
          </p>
          <p className="tabular text-caption text-muted-foreground">
            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6 pt-3">
        {filter.reportedOnly && reported.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No removal requests"
            message="Photos students ask to remove will appear here for the committee to resolve."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No photos match"
            message="Try a different search term or reset the filters."
            action={{ label: "Reset filters", onClick: () => dispatch({ type: "resetFilter" }) }}
          />
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {results.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                showStatus
                batchCount={batchCountFor(batch, photo)}
                onClick={() => open("adminPhotoDetail", { photoId: photo.id })}
              />
            ))}
          </div>
        )}

        {counts.rejected > 0 ? (
          <InlineBanner
            className="mt-4"
            tone="info"
            title="Rejected photos stay here"
            message="They are excluded from the yearbook layout but kept as a record, with the reason attached."
          />
        ) : null}
      </div>
    </div>
  );
};
