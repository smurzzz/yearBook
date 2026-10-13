import {
  ArrowLeftRight,
  Check,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { Chip, MetaChip } from "@/components/app/Chip";
import { FieldLabel, PhoneTextarea } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { StatusChip } from "@/components/app/Indicators";
import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { eventById, personById } from "@/prototype/data";
import { formatDate, formatDateTime } from "@/prototype/format";
import { StatusBar } from "@/prototype/StatusBar";
import { useMockApp } from "@/prototype/store";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { CATEGORIES, CLUBS } from "@/prototype/types";
import type { Category, Club } from "@/prototype/types";

/** Sheet 11 — Admin Photo Detail. Status, tags, and the removal-request block. */
export const AdminPhotoDetailSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  const sticky = useStickyParams(open, photoId ? { id: photoId } : null);
  const photo = state.photos.find((p) => p.id === sticky?.id) ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ caption: "", category: "Candid" as Category, club: null as Club | null });

  useEffect(() => {
    if (!open) return;
    setMenuOpen(false);
    setEditing(false);
  }, [open, sticky?.id]);

  if (!photo) return null;

  const uploader = personById(photo.uploaderId);
  const event = eventById(photo.eventId);
  const request = photo.removalRequest;
  const reporter = request ? personById(request.reporterId) : null;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      bare
      footer={
        editing ? (
          <div className="grid grid-cols-2 gap-2.5">
            <PhoneButton variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </PhoneButton>
            <PhoneButton
              variant="admin"
              onClick={() => {
                dispatch({
                  type: "updatePhoto",
                  photoId: photo.id,
                  patch: { caption: draft.caption, category: draft.category, club: draft.club ?? undefined },
                });
                setEditing(false);
              }}
            >
              Save tags
            </PhoneButton>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <PhoneButton
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: "backToPending", photoId: photo.id })}
            >
              <ArrowLeftRight />
              Pending
            </PhoneButton>
            <PhoneButton
              size="sm"
              variant="outline"
              className="border-status-rejected/35 text-destructive"
              onClick={() => openOverlay("rejectReason", { photoId: photo.id })}
            >
              <X />
              Reject
            </PhoneButton>
            <PhoneButton
              size="sm"
              variant="admin"
              onClick={() => dispatch({ type: "approve", photoId: photo.id })}
            >
              <Check />
              Approve
            </PhoneButton>
          </div>
        )
      }
    >
      <div className="pb-3">
        <div className="relative h-64 w-full overflow-hidden bg-canvas">
          <img src={photo.src} alt={photo.caption} crossOrigin="anonymous" className="size-full object-cover" />
          <StatusBar tone="onImage" />
          <div className="absolute right-4 top-12 z-20">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Photo actions"
                aria-expanded={menuOpen}
                className="flex size-9 items-center justify-center rounded-full border border-onimage-border bg-onimage-surface text-onimage backdrop-blur-md"
              >
                <MoreVertical className="size-[18px]" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-11 w-[210px] animate-scale-in overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-sheet">
                  {[
                    {
                      icon: Pencil,
                      label: "Edit tags",
                      run: () => {
                        setDraft({ caption: photo.caption, category: photo.category, club: photo.club ?? null });
                        setEditing(true);
                        setMenuOpen(false);
                      },
                    },
                    {
                      icon: ArrowLeftRight,
                      label: "Back to pending",
                      run: () => {
                        setMenuOpen(false);
                        dispatch({ type: "backToPending", photoId: photo.id });
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
        </div>

        <div className="px-5 pt-4">
          {editing ? (
            <div className="animate-rise-in">
              <FieldLabel>Caption</FieldLabel>
              <PhoneTextarea
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              />
              <FieldLabel className="mt-4">Category</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    tone="admin"
                    selected={draft.category === category}
                    onClick={() => setDraft({ ...draft, category })}
                  >
                    {category}
                  </Chip>
                ))}
              </div>
              <FieldLabel className="mt-4">Club</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="admin" selected={draft.club === null} onClick={() => setDraft({ ...draft, club: null })}>
                  None
                </Chip>
                {CLUBS.map((club) => (
                  <Chip
                    key={club}
                    tone="admin"
                    selected={draft.club === club}
                    onClick={() => setDraft({ ...draft, club })}
                  >
                    {club}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusChip tone={photo.status} size="md" emphasis="soft" />
                <StatusChip tone="approved" label="Consent confirmed" size="md" />
                {request && !request.resolved ? <StatusChip tone="reported" size="md" emphasis="solid" /> : null}
              </div>

              <button
                type="button"
                onClick={() => openOverlay("uploaderGrid", { uploaderId: photo.uploaderId })}
                className="mt-3.5 flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-2.5 text-left shadow-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar src={uploader.avatar} name={uploader.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-bold text-foreground">{uploader.name}</span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {uploader.club ?? "No club"} · {uploader.email}
                  </span>
                </span>
                <span className="shrink-0 text-caption font-semibold text-admin">All their photos</span>
              </button>

              <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
                <MetaChip>{event.name}</MetaChip>
                <MetaChip>{photo.category}</MetaChip>
                <MetaChip>{photo.club ?? "No club"}</MetaChip>
                <MetaChip>Uploaded {formatDate(photo.uploadedAt)}</MetaChip>
              </div>

              <p className="mt-3 text-body leading-[22px] text-foreground">
                {photo.caption || "No caption added."}
              </p>

              {photo.status === "rejected" && photo.rejectReason ? (
                <Surface className="mt-3 border-status-rejected/25 bg-status-rejected-soft p-3.5">
                  <p className="text-caption font-bold uppercase tracking-[0.08em] text-status-rejected-foreground">
                    Rejection reason sent to the uploader
                  </p>
                  <p className="mt-1 text-label font-semibold text-status-rejected-foreground">
                    {photo.rejectReason}
                  </p>
                </Surface>
              ) : null}

              {request && !request.resolved ? (
                <Surface className="mt-3 border-status-reported/30 p-3.5">
                  <p className="flex items-center gap-2 text-label font-bold text-foreground">
                    <ShieldCheck className="size-4 text-status-reported" aria-hidden="true" />
                    Removal request
                  </p>
                  <dl className="mt-2 space-y-1.5">
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-muted-foreground">Reporter</dt>
                      <dd className="text-caption font-semibold text-foreground">
                        {reporter?.name ?? "Unknown"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-muted-foreground">Reason</dt>
                      <dd className="text-right text-caption font-semibold text-foreground">
                        {request.reason}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-caption text-muted-foreground">Requested</dt>
                      <dd className="text-caption font-semibold text-foreground">
                        {formatDateTime(request.requestedAt)}
                      </dd>
                    </div>
                  </dl>
                  {request.notes ? (
                    <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-caption leading-[17px] text-muted-foreground">
                      “{request.notes}”
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <PhoneButton variant="outline" onClick={() => dispatch({ type: "dismissRemoval", photoId: photo.id })}>
                      Dismiss
                    </PhoneButton>
                    <PhoneButton
                      variant="destructive"
                      onClick={() => ask("removePhoto", { photoId: photo.id })}
                    >
                      Remove photo
                    </PhoneButton>
                  </div>
                </Surface>
              ) : null}
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
