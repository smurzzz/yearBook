import { CheckCircle2, Info, Lock } from "lucide-react";

import { Chip } from "@/components/app/Chip";
import { CountdownChip } from "@/components/app/Indicators";
import { InlineBanner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { eventById } from "@/prototype/data";
import { countdown, formatDateTime } from "@/prototype/format";
import { userEventCount } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";

/** Sheet 7 — Event Detail. Rules, countdown, and the upload entry point. */
export const EventDetailSheet = ({ open, eventId }: { open: boolean; eventId?: string }) => {
  const { state, dispatch, close, goto } = useMockApp();
  const sticky = useStickyParams(open, eventId ? { id: eventId } : null);
  const event = sticky ? eventById(sticky.id) : null;
  if (!event) return null;

  const info = countdown(event.deadline);
  const closed = !event.open || info.closed;
  const used = userEventCount(state, event.id);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      bare
      footer={
        <div className="space-y-2.5">
          <PhoneButton
            block
            size="lg"
            disabled={closed}
            onClick={() => {
              dispatch({ type: "setUploadField", field: "eventId", value: event.id });
              close();
              goto("upload");
            }}
          >
            Upload to this event
          </PhoneButton>
          {closed ? (
            <p className="text-center text-caption text-muted-foreground">
              This event stopped accepting photos on {formatDateTime(event.deadline)}. Ask a committee
              member if you need an extension.
            </p>
          ) : (
            <p className="text-center text-caption text-muted-foreground">
              {Math.max(0, event.maxPhotosPerUser - used)} of {event.maxPhotosPerUser} slots left for
              you
            </p>
          )}
        </div>
      }
    >
      <div className="pb-3">
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={event.cover}
            alt=""
            crossOrigin="anonymous"
            className="size-full object-cover"
          />
          <span className="photo-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="absolute inset-x-5 bottom-4">
            <CountdownChip deadline={event.deadline} />
            <h3 className="mt-2 text-title font-extrabold tracking-[-0.02em] text-onimage drop-shadow-[0_1px_8px_hsl(240_30%_6%/0.55)]">
              {event.name}
            </h3>
          </div>
        </div>

        <div className="px-5 pt-4">
          <p className="text-label leading-[21px] text-muted-foreground">{event.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Surface inset className="bg-muted/50">
              <p className="text-caption font-semibold text-muted-foreground">Deadline</p>
              <p className="mt-1 text-label font-bold text-foreground">
                {formatDateTime(event.deadline)}
              </p>
            </Surface>
            <Surface inset className="bg-muted/50">
              <p className="text-caption font-semibold text-muted-foreground">Your uploads</p>
              <p className="tabular mt-1 text-label font-bold text-foreground">
                {used} of {event.maxPhotosPerUser}
              </p>
            </Surface>
          </div>

          {closed ? (
            <InlineBanner
              className="mt-4"
              tone="warning"
              icon={Lock}
              title="Submissions are closed"
              message="You can still browse the photos you already uploaded for this event."
            />
          ) : (
            <InlineBanner
              className="mt-4"
              tone="info"
              icon={Info}
              title={info.label}
              message="Photos submitted after the deadline cannot be considered for the layout."
            />
          )}

          <p className="mt-5 text-eyebrow font-bold uppercase text-muted-foreground">
            Rules and guidelines
          </p>
          <ul className="mt-2 space-y-2">
            {event.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-[1px] size-[18px] shrink-0 text-status-approved"
                  aria-hidden="true"
                />
                <span className="text-label leading-[20px] text-foreground">{rule}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip selected tone="brand">
              Tag photos as {event.name}
            </Chip>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
