import { UserRound } from "lucide-react";
import { useMemo } from "react";

import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/Feedback";
import { PhotoTile } from "@/components/app/PhotoTile";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { personById } from "@/prototype/data";
import { batchCountFor, batchCounts, photosByUploader } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";

/** Extra overlay — read-only grid of one uploader's photos (All photos spec). */
export const UploaderGridSheet = ({ open, uploaderId }: { open: boolean; uploaderId?: string }) => {
  const { state, close, open: openOverlay } = useMockApp();
  const sticky = useStickyParams(open, uploaderId ? { id: uploaderId } : null);
  const photos = useMemo(
    () => (sticky ? photosByUploader(state, sticky.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.photos, sticky?.id],
  );
  const counts = useMemo(() => batchCounts(photos), [photos]);
  if (!sticky) return null;

  const person = personById(sticky.id);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title={person.name}
      description={`${photos.length} photo${photos.length === 1 ? "" : "s"} · read-only view`}
    >
      <div className="px-5 pb-3">
        <div className="flex items-center gap-3 rounded-2xl bg-admin-surface p-3.5">
          <Avatar src={person.avatar} name={person.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-label font-bold text-admin-ink">{person.email}</p>
            <p className="mt-0.5 truncate text-caption text-admin-ink/80">
              {person.club ?? "No club"} · submitted to {new Set(photos.map((p) => p.eventId)).size}{" "}
              events
            </p>
          </div>
        </div>

        {photos.length ? (
          <div className="mt-3 grid grid-cols-3 gap-1">
            {photos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                showStatus
                batchCount={batchCountFor(counts, photo)}
                onClick={() => openOverlay("adminPhotoDetail", { photoId: photo.id })}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserRound}
            title="No photos from this student"
            message="They have not submitted anything to the yearbook yet."
          />
        )}

        <p className="mt-4 text-caption leading-[17px] text-muted-foreground">
          Committee members can browse everything a student submitted, including photos from other
          events.
        </p>
      </div>
    </BottomSheet>
  );
};
