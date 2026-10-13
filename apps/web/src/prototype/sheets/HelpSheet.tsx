import { ChevronDown, LifeBuoy, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { FAQ, SCHOOL_NAME } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";

/** Sheet 4 — Help / FAQ. Collapsible Q&A, one answer open at a time. */
export const HelpSheet = ({ open }: { open: boolean }) => {
  const { close } = useMockApp();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title="Help and FAQ"
      description="The questions the committee hears most."
      footer={
        <PhoneButton block variant="outline" onClick={close}>
          <LifeBuoy />
          Close
        </PhoneButton>
      }
    >
      <div className="px-5 pb-3">
        {FAQ.map((item, index) => {
          const expanded = openIndex === index;
          return (
            <Surface key={item.q} className="mb-2.5 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(expanded ? null : index)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <MessageCircleQuestion
                  className="size-[18px] shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="flex-1 text-label font-bold text-foreground">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
              {expanded ? (
                <p className="animate-rise-in px-3.5 pb-3.5 text-caption leading-[18px] text-muted-foreground">
                  {item.a}
                </p>
              ) : null}
            </Surface>
          );
        })}

        <div className="mt-3 rounded-2xl border border-dashed border-border p-3.5">
          <p className="text-label font-bold text-foreground">Still stuck?</p>
          <p className="mt-1 text-caption leading-[17px] text-muted-foreground">
            Look for a committee member at the yearbook room, or reply to any notification email from{" "}
            {SCHOOL_NAME}.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
