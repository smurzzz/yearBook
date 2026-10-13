import { Camera, Images, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Chip } from "@/components/app/Chip";
import { CheckRow, FieldLabel, PhoneSelect, PhoneTextarea } from "@/components/app/Fields";
import { InlineBanner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { SectionHeader, Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { eventById } from "@/prototype/data";
import { countdown, formatShortDate } from "@/prototype/format";
import { MAX_BATCH, uploadGuard, userEventCount } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";
import { CATEGORIES, CLUBS } from "@/prototype/types";

/** Screen 3 — Upload. One scrolling screen, single submit action. */
export const UploadScreen = () => {
  const { state, dispatch, open } = useMockApp();
  const { upload } = state;
  const [captionFor, setCaptionFor] = useState<string | null>(null);
  const guard = uploadGuard(state);
  const event = upload.eventId ? eventById(upload.eventId) : null;
  const used = event ? userEventCount(state, event.id) : 0;
  const captionItem = upload.items.find((i) => i.id === captionFor) ?? null;

  const openEventOptions = state.events
    .filter((e) => e.open && !countdown(e.deadline).closed)
    .map((e) => ({
      value: e.id,
      label: e.name,
      description: `Closes ${formatShortDate(e.deadline)} · up to ${e.maxPhotosPerUser} per student`,
    }));

  const showGuard = !guard.ok && guard.reason !== "no-photos";

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="shrink-0 px-5 pb-1 pt-4">
        <h1 className="text-title font-extrabold tracking-[-0.02em] text-foreground">Upload photos</h1>
        <p className="mt-1 text-label text-muted-foreground">
          They go straight to the yearbook committee for review.
        </p>
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">
        {/* ---------------------------- Photo picker ---------------------------- */}
        <Surface className="mt-4 border-dashed">
          {upload.items.length === 0 ? (
            <button
              type="button"
              onClick={() => open("sourceChooser")}
              className="flex w-full flex-col items-center px-4 py-7 focus-visible:outline-none"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Camera className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-3 text-subhead font-bold text-foreground">Add photos</span>
              <span className="mt-1 text-caption text-muted-foreground">
                Camera or gallery · up to {MAX_BATCH} at a time
              </span>
            </button>
          ) : (
            <div className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label font-bold text-foreground">
                  {upload.items.length}{" "}
                  <span className="text-muted-foreground">of {MAX_BATCH} selected</span>
                </p>
                <PhoneButton size="sm" variant="outline" onClick={() => open("sourceChooser")}>
                  <Plus />
                  Add more
                </PhoneButton>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                {upload.items.map((item, index) => (
                  <div key={item.id} className="relative aspect-square">
                    <button
                      type="button"
                      onClick={() => setCaptionFor(item.id)}
                      aria-label={`Edit caption for photo ${index + 1}`}
                      className={cn(
                        "absolute inset-0 overflow-hidden rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        captionFor === item.id ? "border-primary" : "border-transparent",
                      )}
                    >
                      <img
                        src={item.src}
                        alt=""
                        crossOrigin="anonymous"
                        className="size-full object-cover"
                      />
                      {item.caption ? (
                        <span className="absolute inset-x-0 bottom-0 truncate bg-canvas/65 px-1 py-0.5 text-[10px] font-semibold text-onimage">
                          {item.caption}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "removeUploadItem", id: item.id })}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-tile transition-transform active:scale-90"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-caption leading-[16px] text-muted-foreground">
                Tap a photo to add a caption. Large files are resized automatically before upload.
              </p>
            </div>
          )}
        </Surface>

        {state.batchMessage ? (
          <p className="mt-2 text-caption text-muted-foreground">{state.batchMessage}</p>
        ) : null}

        {/* ----------------------------- Caption editor ----------------------------- */}
        {captionItem ? (
          <Surface className="mt-3 animate-rise-in p-3.5">
            <div className="flex gap-3">
              <img
                src={captionItem.src}
                alt=""
                crossOrigin="anonymous"
                className="size-[72px] shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <FieldLabel hint="Optional">Caption</FieldLabel>
                <PhoneTextarea
                  autoFocus
                  value={captionItem.caption}
                  onChange={(e) =>
                    dispatch({ type: "setUploadCaption", id: captionItem.id, caption: e.target.value })
                  }
                  placeholder="What is happening in this photo?"
                  className="min-h-[76px]"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <PhoneButton
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  dispatch({ type: "removeUploadItem", id: captionItem.id });
                  setCaptionFor(null);
                }}
              >
                <Trash2 />
                Remove photo
              </PhoneButton>
              <PhoneButton size="sm" onClick={() => setCaptionFor(null)}>
                Done
              </PhoneButton>
            </div>
          </Surface>
        ) : null}

        {/* -------------------------------- Tagging -------------------------------- */}
        <div className="mt-6">
          <FieldLabel required hint={event ? `${used} of ${event.maxPhotosPerUser} used` : undefined}>
            Event
          </FieldLabel>
          <PhoneSelect
            value={upload.eventId}
            placeholder="Choose an event"
            options={openEventOptions}
            onChange={(value) => dispatch({ type: "setUploadField", field: "eventId", value })}
          />
        </div>

        <div className="mt-5">
          <FieldLabel required>Category</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                selected={upload.category === category}
                onClick={() =>
                  dispatch({
                    type: "setUploadField",
                    field: "category",
                    value: upload.category === category ? null : category,
                  })
                }
              >
                {category}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel hint="Optional">Club</FieldLabel>
          <PhoneSelect
            value={upload.club}
            placeholder="None"
            options={[{ value: "none", label: "None" }, ...CLUBS.map((c) => ({ value: c, label: c }))]}
            onChange={(value) =>
              dispatch({
                type: "setUploadField",
                field: "club",
                value: value === "none" ? null : value,
              })
            }
          />
        </div>

        <div className="mt-6">
          <SectionHeader eyebrow="Permissions" title="Before you submit" />
          <Surface className="mt-3 p-3.5">
            <CheckRow
              checked={upload.consent}
              onChange={() => dispatch({ type: "toggleUploadConsent" })}
            >
              I have permission to share these photos and the people in them agree to be published.
            </CheckRow>
          </Surface>
        </div>

        <Surface inset className="mt-3 flex items-start gap-3 border-dashed bg-muted/40">
          <Images className="mt-[1px] size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-caption leading-[17px] text-muted-foreground">
            Photos are compressed automatically. Nothing is visible to other students — only you and
            the committee.
          </p>
        </Surface>
      </main>

      <div className="shrink-0 border-t border-border bg-background px-5 pb-4 pt-3">
        {showGuard ? (
          <InlineBanner
            className="mb-3"
            tone={
              guard.reason === "deadline"
                ? "error"
                : guard.reason === "limit" || guard.reason === "storage"
                  ? "warning"
                  : "info"
            }
            title={guard.title}
            message={guard.message}
          />
        ) : null}
        <PhoneButton
          block
          size="lg"
          disabled={!guard.ok}
          onClick={() => dispatch({ type: "startUpload" })}
        >
          Submit {upload.items.length || ""} {upload.items.length === 1 ? "photo" : "photos"}
        </PhoneButton>
        <p className="mt-2 text-center text-caption text-muted-foreground">
          {event
            ? `${Math.max(0, event.maxPhotosPerUser - used)} of ${event.maxPhotosPerUser} slots left for ${event.name}`
            : "Select an event to see your remaining slots."}
        </p>
      </div>
    </div>
  );
};
