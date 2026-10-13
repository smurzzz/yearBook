import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { FieldLabel, PhoneInput, PhoneTextarea, SwitchRow } from "@/components/app/Fields";
import { InlineBanner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { EVENTS } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";
import type { EventItem } from "@/prototype/types";

const COVERS = EVENTS.map((event) => ({ src: event.cover, name: event.name }));

const toDateInput = (iso: string) => iso.slice(0, 10);
const toTimeInput = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const defaultDeadline = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

/** Sheet 14 — Event Form. Create, edit, open or close, and delete. */
export const EventFormSheet = ({ open, eventId }: { open: boolean; eventId?: string }) => {
  const { state, dispatch, close, ask } = useMockApp();
  const sticky = useStickyParams(open, eventId ? { id: eventId } : null);
  const existing = sticky ? state.events.find((event) => event.id === sticky.id) ?? null : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState(COVERS[0].src);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [maxPhotos, setMaxPhotos] = useState(10);
  const [isOpen, setIsOpen] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setCover(existing.cover);
      setDate(toDateInput(existing.deadline));
      setTime(toTimeInput(existing.deadline));
      setMaxPhotos(existing.maxPhotosPerUser);
      setIsOpen(existing.open);
    } else {
      setName("");
      setDescription("");
      setCover(COVERS[0].src);
      setDate(toDateInput(defaultDeadline()));
      setTime(toTimeInput(defaultDeadline()));
      setMaxPhotos(10);
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sticky?.id]);

  const valid = name.trim().length > 2 && description.trim().length > 9 && Boolean(date);

  const save = () => {
    setTouched(true);
    if (!valid) return;
    const deadline = new Date(`${date}T${time || "17:00"}:00`).toISOString();
    const event: EventItem = {
      id: existing?.id ?? `event-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      cover,
      deadline,
      open: isOpen,
      maxPhotosPerUser: maxPhotos,
      rules: existing?.rules ?? [
        `Up to ${maxPhotos} photos per student`,
        "Photos must be taken at this event",
        "Get permission from everyone in the photo",
      ],
    };
    dispatch({ type: "saveEvent", event });
  };

  const linked = existing ? state.photos.filter((p) => p.eventId === existing.id).length : 0;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title={existing ? "Edit event" : "New event"}
      description={
        existing
          ? `Saved changes reach students immediately · ${linked} photos linked`
          : "It appears on every student's Home screen the moment you save."
      }
      footer={
        <div className="space-y-2.5">
          <PhoneButton block size="lg" variant="admin" onClick={save}>
            <Check />
            {existing ? "Save changes" : "Create event"}
          </PhoneButton>
          {existing ? (
            <PhoneButton
              block
              variant="ghost"
              className="text-destructive"
              onClick={() => ask("deleteEvent", { eventId: existing.id })}
            >
              <Trash2 />
              Delete event
            </PhoneButton>
          ) : null}
        </div>
      }
    >
      <div className="px-5 pb-3">
        <FieldLabel required>Event name</FieldLabel>
        <PhoneInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Intramurals 2026"
          className={touched && name.trim().length < 3 ? "border-destructive" : undefined}
        />

        <div className="mt-5">
          <FieldLabel required>Description</FieldLabel>
          <PhoneTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should students photograph at this event?"
            className={touched && description.trim().length < 10 ? "border-destructive" : undefined}
          />
        </div>

        <div className="mt-5">
          <FieldLabel hint="Tap to choose">Cover image</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {COVERS.map((option) => (
              <button
                key={option.src}
                type="button"
                onClick={() => setCover(option.src)}
                aria-label={option.name}
                aria-pressed={cover === option.src}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                  cover === option.src ? "border-admin" : "border-transparent"
                }`}
              >
                <img src={option.src} alt="" crossOrigin="anonymous" className="size-full object-cover" />
                {cover === option.src ? (
                  <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-admin text-admin-foreground">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel required>Deadline</FieldLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <PhoneInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Deadline date"
            />
            <PhoneInput
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Deadline time"
            />
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel hint="Per student">Max photos</FieldLabel>
          <Surface className="flex items-center justify-between p-2.5">
            <PhoneButton
              size="iconSm"
              variant="outline"
              aria-label="Fewer photos"
              disabled={maxPhotos <= 1}
              onClick={() => setMaxPhotos((v) => Math.max(1, v - 1))}
            >
              <Minus />
            </PhoneButton>
            <span className="tabular text-title font-extrabold text-foreground">{maxPhotos}</span>
            <PhoneButton
              size="iconSm"
              variant="outline"
              aria-label="More photos"
              disabled={maxPhotos >= 20}
              onClick={() => setMaxPhotos((v) => Math.min(20, v + 1))}
            >
              <Plus />
            </PhoneButton>
          </Surface>
        </div>

        <Surface className="mt-5">
          <SwitchRow
            label="Open for submissions"
            description={isOpen ? "Students can upload right now" : "Uploads are blocked until you reopen"}
            checked={isOpen}
            onChange={setIsOpen}
          />
        </Surface>

        {touched && !valid ? (
          <InlineBanner
            className="mt-4"
            tone="error"
            title="A few fields still need attention"
            message="Give the event a name, a short description, and a deadline."
          />
        ) : null}

        <p className="mt-4 text-caption leading-[17px] text-muted-foreground">
          Closing an event keeps everything already submitted. Students see a Closed badge and the
          upload button is disabled with an explanation.
        </p>
      </div>
    </BottomSheet>
  );
};
