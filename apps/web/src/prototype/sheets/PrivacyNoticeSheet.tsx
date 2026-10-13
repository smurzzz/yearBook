import { FileText, ShieldCheck } from "lucide-react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { PRIVACY_SECTIONS, SCHOOL_NAME } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";

/** Sheet 3 — Privacy Notice. Linked from Sign In, Profile, and every caption. */
export const PrivacyNoticeSheet = ({ open }: { open: boolean }) => {
  const { close, open: openOverlay } = useMockApp();

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title="Privacy Notice"
      description={`How ${SCHOOL_NAME} handles the photos you submit.`}
      footer={
        <div className="space-y-2">
          <PhoneButton block variant="outline" onClick={() => openOverlay("help")}>
            <FileText />
            Read the FAQ instead
          </PhoneButton>
          <PhoneButton block onClick={close}>
            I understand
          </PhoneButton>
        </div>
      }
    >
      <div className="px-5 pb-3">
        <div className="flex items-start gap-3 rounded-2xl bg-primary/8 p-3.5">
          <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
          <p className="text-label leading-[20px] text-foreground">
            Only you and the yearbook committee can see your photos. There is no public feed, and no
            other student can browse your submissions.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h4 className="text-label font-bold text-foreground">{section.title}</h4>
              <p className="mt-1 text-caption leading-[18px] text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-5 rounded-2xl bg-muted px-3.5 py-3 text-caption leading-[17px] text-muted-foreground">
          Consent for photo publication is collected separately from this notice, on the Upload
          screen, and can be withdrawn at any time by deleting the photo or requesting its removal.
        </p>
      </div>
    </BottomSheet>
  );
};
