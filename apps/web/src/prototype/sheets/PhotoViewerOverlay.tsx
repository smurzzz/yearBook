import {
  CalendarDays,
  Flag,
  ImageOff,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Chip, MetaChip } from "@/components/app/Chip";
import { PhoneTextarea } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { eventById } from "@/prototype/data";
import { formatDate } from "@/prototype/format";
import { filteredPhotos, myPhotos } from "@/prototype/selectors";
import { StatusBar } from "@/prototype/StatusBar";
import { useMockApp } from "@/prototype/store";
import { ZoomableImage } from "@/prototype/ZoomableImage";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { CATEGORIES, CLUBS } from "@/prototype/types";
import type { Category, PhotoItem } from "@/prototype/types";

/** Sheet 9 — Photo Viewer. Student surface: no status anywhere. */
export const PhotoViewerOverlay = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  const sticky = useStickyParams(open, photoId ? { id: photoId } : null);
  const list: PhotoItem[] = state.role === "admin" ? filteredPhotos(state) : myPhotos(state);
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ caption: "", category: "Candid" as Category, club: null as string | null });
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const found = list.findIndex((p) => p.id === sticky?.id);
      setIndex(found < 0 ? 0 : found);
      setMenuOpen(false);
      setEditing(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sticky?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(list.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, list.length, open]);

  if (!visible) return null;
  const photo = list[index];
  if (!photo) return null;

  const wasRejected = photo.status === "rejected";
  const event = eventById(photo.eventId);

  const startEditing = () => {
    setDraft({ caption: photo.caption, category: photo.category, club: photo.club ?? null });
    setEditing(true);
    setMenuOpen(false);
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex flex-col bg-canvas",
        open ? "animate-fade-in" : "animate-fade-out",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <StatusBar tone="onImage" />

      <div className="flex shrink-0 items-center justify-between px-3">
        <button
          type="button"
          onClick={close}
          aria-label="Close photo"
          className="flex size-11 items-center justify-center rounded-full text-onimage transition-colors hover:bg-onimage-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onimage"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <p className="tabular text-label font-bold text-onimage">
          {index + 1} of {list.length}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Photo options"
            aria-expanded={menuOpen}
            className="flex size-11 items-center justify-center rounded-full text-onimage transition-colors hover:bg-onimage-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-onimage"
          >
            <MoreVertical className="size-5" aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-[236px] animate-scale-in overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-sheet">
              {[
                { icon: Pencil, label: "Edit caption and tags", run: startEditing },
                {
                  icon: Flag,
                  label: "Request removal",
                  run: () => {
                    setMenuOpen(false);
                    openOverlay("requestRemoval", { photoId: photo.id });
                  },
                },
                {
                  icon: Trash2,
                  label: "Delete photo",
                  run: () => {
                    setMenuOpen(false);
                    ask("deletePhoto", { photoId: photo.id });
                  },
                  danger: true,
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body font-semibold transition-colors hover:bg-muted",
                    item.danger ? "text-destructive" : "text-foreground",
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ZoomableImage
        src={photo.src}
        alt={photo.caption}
        className="min-h-0 flex-1"
        onSwipe={(delta) => setIndex((i) => Math.min(list.length - 1, Math.max(0, i + delta)))}
      />

      <div className="shrink-0 rounded-t-[26px] border-t border-onimage-border bg-card px-5 pb-7 pt-4">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />

        {editing ? (
          <div className="animate-rise-in">
            <p className="text-eyebrow font-bold uppercase text-muted-foreground">Edit caption</p>
            <PhoneTextarea
              className="mt-2"
              value={draft.caption}
              onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              placeholder="What is happening in this photo?"
            />
            <p className="mt-3 text-eyebrow font-bold uppercase text-muted-foreground">Category</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => (
                <Chip
                  key={category}
                  selected={draft.category === category}
                  onClick={() => setDraft({ ...draft, category })}
                >
                  {category}
                </Chip>
              ))}
            </div>
            <p className="mt-3 text-eyebrow font-bold uppercase text-muted-foreground">Club</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip selected={draft.club === null} onClick={() => setDraft({ ...draft, club: null })}>
                None
              </Chip>
              {CLUBS.map((club) => (
                <Chip
                  key={club}
                  selected={draft.club === club}
                  onClick={() => setDraft({ ...draft, club })}
                >
                  {club}
                </Chip>
              ))}
            </div>
            <div className="mt-4 flex gap-2.5">
              <PhoneButton variant="outline" block onClick={() => setEditing(false)}>
                Cancel
              </PhoneButton>
              <PhoneButton
                block
                onClick={() => {
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
              >
                Save changes
              </PhoneButton>
            </div>
          </div>
        ) : (
          <>
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              <MetaChip>{event.name}</MetaChip>
              <MetaChip>{photo.category}</MetaChip>
              {photo.club ? <MetaChip>{photo.club}</MetaChip> : null}
              <MetaChip icon={<CalendarDays className="size-3.5" aria-hidden="true" />}>
                {formatDate(photo.uploadedAt)}
              </MetaChip>
            </div>

            <p className="mt-3 text-body leading-[22px] text-foreground">
              {photo.caption || "No caption added yet."}
            </p>

            {wasRejected ? (
              <Surface className="mt-3 border-dashed bg-muted/60 p-3.5">
                <p className="flex items-center gap-2 text-label font-bold text-foreground">
                  <ImageOff className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  Needs a new photo: {photo.rejectReason}
                </p>
                <p className="mt-1 text-caption leading-[17px] text-muted-foreground">
                  The committee asked for a replacement for this shot. Your original stays in the
                  yearbook selection until you send a new one.
                </p>
                <PhoneButton
                  size="sm"
                  variant="outline"
                  className="mt-2.5"
                  onClick={() => {
                    dispatch({ type: "setUploadField", field: "eventId", value: photo.eventId });
                    dispatch({ type: "setUploadField", field: "category", value: photo.category });
                    dispatch({
                      type: "setUploadField",
                      field: "club",
                      value: photo.club ?? null,
                    });
                    close();
                    openOverlay("sourceChooser");
                  }}
                >
                  <Share2 />
                  Replace photo
                </PhoneButton>
              </Surface>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};
