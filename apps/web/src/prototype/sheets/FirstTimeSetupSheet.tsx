import { useEffect, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { FieldLabel, PhoneInput, PhoneSelect } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { FIRST_TIME_SETUP_CLUBS_NOTE, STUDENT_ID, personById } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";
import { CLUBS } from "@/prototype/types";
import type { Club } from "@/prototype/types";

/** Sheet 1 — First-Time Setup. Shown once, right after the first Google sign-in. */
export const FirstTimeSetupSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close } = useMockApp();
  const [name, setName] = useState(state.studentName);
  const [club, setClub] = useState<string | null>(state.studentClub);
  const person = personById(STUDENT_ID);

  useEffect(() => {
    if (!open) return;
    setName(state.studentName);
    setClub(state.studentClub);
  }, [open, state.studentClub, state.studentName]);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="You're in!"
      description="One quick step and your photos go to the right chapter."
      hideClose
      footer={
        <PhoneButton
          block
          size="lg"
          onClick={() =>
            dispatch({
              type: "finishSetup",
              name: name.trim() || state.studentName,
              club: club as Club | null,
            })
          }
        >
          Get started
        </PhoneButton>
      }
    >
      <div className="px-5 pb-3">
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-3.5">
          <Avatar src={person.avatar} name={name} size="lg" />
          <div className="min-w-0">
            <p className="text-label font-bold text-foreground">Signed in with Google</p>
            <p className="truncate text-caption text-muted-foreground">{person.email}</p>
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel required>Full name</FieldLabel>
          <PhoneInput value={name} onChange={(e) => setName(e.target.value)} />
          <p className="mt-1.5 text-caption text-muted-foreground">
            Taken from your Google account. This is how the committee credits your photos.
          </p>
        </div>

        <div className="mt-5">
          <FieldLabel hint="Optional">Club</FieldLabel>
          <PhoneSelect
            value={club}
            placeholder="None"
            options={[{ value: "none", label: "None" }, ...CLUBS.map((c) => ({ value: c, label: c }))]}
            onChange={(value) => setClub(value === "none" ? null : value)}
          />
          <p className="mt-1.5 text-caption text-muted-foreground">{FIRST_TIME_SETUP_CLUBS_NOTE}</p>
        </div>

        <p className="mt-5 text-caption leading-[17px] text-muted-foreground">
          Committee access is assigned by the yearbook adviser. You cannot turn it on yourself.
        </p>
      </div>
    </BottomSheet>
  );
};
