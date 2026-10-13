import { Check, Images, RefreshCw, UploadCloud } from "lucide-react";

import { InlineBanner } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Meter, UploadRow } from "@/components/app/UploadRow";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { eventById } from "@/prototype/data";
import { uploadGuard, uploadSummary } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";

/** Sheet 8 — Upload Progress. Per-photo rows, retry, and the success state. */
export const UploadProgressSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close, goto } = useMockApp();
  const summary = uploadSummary(state);
  const guard = uploadGuard(state);
  const event = state.upload.eventId ? eventById(state.upload.eventId) : null;
  const succeeded = state.uploadPhase === "success";

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size={succeeded ? "auto" : "tall"}
      hideClose={succeeded}
      title={succeeded ? undefined : summary.failed ? "Some photos need another try" : "Uploading photos"}
      footer={
        succeeded ? (
          <div className="grid grid-cols-2 gap-2.5">
            <PhoneButton
              variant="outline"
              onClick={() => {
                dispatch({ type: "resetUpload" });
              }}
            >
              <Images />
              Upload more
            </PhoneButton>
            <PhoneButton
              onClick={() => {
                dispatch({ type: "resetUpload" });
                goto("myPhotos");
              }}
            >
              View my photos
            </PhoneButton>
          </div>
        ) : summary.failed ? (
          <PhoneButton block onClick={() => dispatch({ type: "retryFailed" })}>
            <RefreshCw />
            Retry all failed
          </PhoneButton>
        ) : (
          <PhoneButton block variant="outline" onClick={close}>
            Continue in the background
          </PhoneButton>
        )
      }
    >
      {succeeded ? (
        <div className="flex flex-col items-center px-6 pb-2 pt-4 text-center">
          <span className="flex size-16 animate-check-pop items-center justify-center rounded-full bg-status-approved text-onimage shadow-glow">
            <Check className="size-8" strokeWidth={3} aria-hidden="true" />
          </span>
          <p className="mt-4 text-title font-extrabold text-foreground">All photos uploaded</p>
          <p className="mt-1.5 max-w-[17rem] text-label text-muted-foreground">
            {summary.total} photo{summary.total === 1 ? "" : "s"} {summary.total === 1 ? "is" : "are"}{" "}
            with the yearbook committee{event ? ` for ${event.name}` : ""}. You will get a
            notification when they are reviewed.
          </p>
          <div className="mt-4 flex w-full gap-2">
            {state.upload.items.slice(0, 4).map((item) => (
              <span key={item.id} className="size-14 overflow-hidden rounded-xl">
                <img src={item.src} alt="" crossOrigin="anonymous" className="size-full object-cover" />
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-3">
          {state.uploadError === "offline" || state.network === "offline" ? (
            <InlineBanner
              className="mb-4"
              tone="warning"
              title="No connection. Your photos are saved and will retry."
              message="Nothing was lost. The queue resumes automatically when you are back online."
              action={{
                label: "Try again",
                icon: RefreshCw,
                onClick: () => {
                  dispatch({ type: "setNetwork", network: "online" });
                  dispatch({ type: "retryFailed" });
                },
              }}
            />
          ) : null}

          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <UploadCloud className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label font-bold text-foreground">
                <span className="tabular">
                  {summary.done} of {summary.total}
                </span>{" "}
                done
                {summary.failed ? (
                  <span className="text-status-rejected-foreground"> · {summary.failed} failed</span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-caption text-muted-foreground">
                {event ? `${event.name} · ${state.upload.category ?? "No category"}` : "Preparing"}
              </p>
            </div>
            <span className="tabular text-subhead font-bold text-foreground">{summary.percent}%</span>
          </div>

          <Meter className="mt-3" value={summary.percent} />

          <p className="mt-4 text-eyebrow font-bold uppercase text-muted-foreground">Photos</p>
          <div className="divide-y divide-border/70">
            {state.upload.items.map((item, index) => (
              <UploadRow
                key={item.id}
                item={item}
                index={index}
                onRetry={() => dispatch({ type: "retryFailed" })}
              />
            ))}
          </div>

          <p className="mt-3 text-caption leading-[17px] text-muted-foreground">
            Keep the app open until this finishes. Photos compress automatically, so uploading{" "}
            {state.upload.items.length} photos uses about{" "}
            {state.upload.items.length * 4} MB of data.
          </p>

          {!guard.ok ? (
            <InlineBanner className="mt-4" tone="warning" title={guard.title} message={guard.message} />
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
};
