import { Send } from "lucide-react";
import { useEffect, useState } from "react";

import { ChoiceRow, FieldLabel, PhoneTextarea } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { useStickyParams } from "@/prototype/overlays/useStickyParams";
import { REMOVAL_REASONS } from "@/prototype/types";
import { useMockApp } from "@/prototype/store";

/** Sheet 10 — Request Removal. Reason list, optional notes, success toast. */
export const RequestRemovalSheet = ({ open, photoId }: { open: boolean; photoId?: string }) => {
  const { dispatch, close } = useMockApp();
  const sticky = useStickyParams(open, photoId ? { id: photoId } : null);
  const [reason, setReason] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReason(null);
      setNotes("");
    }
  }, [open]);

  const target = sticky?.id;

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Request removal"
      description="The committee reviews every request within a day."
      footer={
        <PhoneButton
          block
          size="lg"
          disabled={!reason}
          onClick={() => {
            if (!reason || !target) return;
            dispatch({ type: "requestRemoval", photoId: target, reason, notes: notes || undefined });
          }}
        >
          <Send />
          Submit request
        </PhoneButton>
      }
    >
      <div className="px-5 pb-3">
        <div role="radiogroup" aria-label="Reason" className="space-y-2.5">
          {REMOVAL_REASONS.map((option) => (
            <ChoiceRow
              key={option}
              label={option}
              selected={reason === option}
              onSelect={() => setReason(option)}
            />
          ))}
        </div>

        <div className="mt-5">
          <FieldLabel hint="Optional">Notes for the committee</FieldLabel>
          <PhoneTextarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything that helps us resolve this faster."
          />
        </div>

        <p className="mt-3 text-caption leading-[17px] text-muted-foreground">
          If the photo is already printed or published, we will take it out of the online selection
          and note the request for the archival copy.
        </p>
      </div>
    </BottomSheet>
  );
};
