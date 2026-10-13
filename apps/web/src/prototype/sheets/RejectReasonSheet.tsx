import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Chip } from "@/components/app/Chip";
import { FieldLabel, PhoneTextarea } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { REJECT_PRESETS } from "@/prototype/types";
import { useMockApp } from "@/prototype/store";

/** Sheet 12 — Reject Reason. Preset chips, note required for "Other". */
export const RejectReasonSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const { dispatch, close } = useMockApp();
  const sticky = useStickyParams(open, photoId ? { id: photoId } : null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote("");
    }
  }, [open]);

  const needsNote = reason === "Other";
  const canConfirm = Boolean(reason) && (!needsNote || note.trim().length > 2);
  const target = sticky?.id;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Reject this photo?"
      description="The uploader is notified with the reason you pick."
      footer={
        <PhoneButton
          block
          size="lg"
          variant="destructive"
          disabled={!canConfirm}
          onClick={() => {
            if (!reason || !target) return;
            dispatch({ type: "reject", photoId: target, reason });
          }}
        >
          <X />
          Confirm reject
          {reason ? ` · ${reason}` : ""}
        </PhoneButton>
      }
    >
      <div className="px-5 pb-3">
        <div className="flex flex-wrap gap-2">
          {REJECT_PRESETS.map((preset) => (
            <Chip key={preset} selected={reason === preset} onClick={() => setReason(preset)}>
              {preset}
            </Chip>
          ))}
        </div>

        <div className="mt-5">
          <FieldLabel required={needsNote} hint={needsNote ? "Required for Other" : "Optional"}>
            Note to the uploader
          </FieldLabel>
          <PhoneTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              needsNote
                ? "Tell them what was wrong so they can pick a better shot."
                : "Add context if the reason needs an explanation."
            }
          />
        </div>

        <p className="mt-3 text-caption leading-[17px] text-muted-foreground">
          Rejected photos stay in the archive with this reason attached, and the student sees a quiet
          note with a Replace photo button inside the photo viewer.
        </p>
      </div>
    </BottomSheet>
  );
};
