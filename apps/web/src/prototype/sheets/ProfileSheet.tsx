import {
  BellRing,
  BookOpenCheck,
  ChevronRight,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Avatar } from "@/components/app/Avatar";
import { SwitchRow } from "@/components/app/Fields";
import { RoleBadge } from "@/components/app/Indicators";
import { ListRow, Surface } from "@/components/app/Surface";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { ADMIN_ID, SCHOOL_NAME, STUDENT_ID, personById } from "@/prototype/data";
import { useMockApp } from "@/prototype/store";

/** Sheet 2 — Profile. One sheet, two role variants. */
export const ProfileSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close, ask, open: openOverlay } = useMockApp();
  const admin = state.role === "admin";
  const person = personById(admin ? ADMIN_ID : STUDENT_ID);
  const name = admin ? person.name : state.studentName;

  return (
    <BottomSheet open={open} onClose={close} title={admin ? "Committee profile" : "Profile"}>
      <div className="px-5 pb-3">
        <Surface className="p-4">
          <div className="flex items-center gap-3.5">
            <Avatar
              src={person.avatar}
              name={name}
              size="lg"
              tone={admin ? "admin" : "brand"}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-subhead font-bold text-foreground">{name}</p>
              <p className="truncate text-caption text-muted-foreground">{person.email}</p>
              <div className="mt-2">
                <RoleBadge role={state.role} />
              </div>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <BookOpenCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-caption text-muted-foreground">
              {admin ? "Yearbook Committee · assigned by the adviser" : state.studentClub ?? "No club"}
            </p>
          </div>
        </Surface>

        <p className="mt-4 text-eyebrow font-bold uppercase text-muted-foreground">Preferences</p>
        <Surface className="mt-2 overflow-hidden">
          <SwitchRow
            label="Dark mode"
            description="Match the app to your phone"
            checked={state.theme === "dark"}
            onChange={(value) => dispatch({ type: "setTheme", theme: value ? "dark" : "light" })}
          />
          <div className="mx-4 h-px bg-border/70" />
          <SwitchRow
            label="Deadline reminders"
            description={admin ? "When an event is closing soon" : "2 days before an event closes"}
            checked={state.deadlineReminders}
            onChange={() => dispatch({ type: "togglePreference", key: "deadlineReminders" })}
          />
          <div className="mx-4 h-px bg-border/70" />
          <SwitchRow
            label={admin ? "Review queue updates" : "Review results"}
            description={
              admin ? "New submissions and removal requests" : "When a photo is approved or needs replacing"
            }
            checked={state.reviewResults}
            onChange={() => dispatch({ type: "togglePreference", key: "reviewResults" })}
          />
        </Surface>

        <p className="mt-4 text-eyebrow font-bold uppercase text-muted-foreground">About</p>
        <Surface className="mt-2 overflow-hidden">
          <ListRow
            icon={<ShieldCheck />}
            label="Privacy Notice"
            description="Data use, visibility, your rights"
            chevron
            onClick={() => openOverlay("privacy")}
          />
          <div className="mx-4 h-px bg-border/70" />
          <ListRow
            icon={<HelpCircle />}
            label="Help and FAQ"
            description="Limits, deadlines, removal requests"
            chevron
            onClick={() => openOverlay("help")}
          />
          <div className="mx-4 h-px bg-border/70" />
          <ListRow
            icon={<BellRing />}
            label="Notifications"
            description={
              state.notificationsEnabled ? "Deadline and review alerts are on" : "Currently turned off"
            }
            trailing={<ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
            onClick={() => openOverlay("notifPermission")}
          />
        </Surface>

        <p className="mt-4 text-eyebrow font-bold uppercase text-muted-foreground">Account</p>
        <Surface className="mt-2 overflow-hidden">
          <ListRow icon={<LogOut />} label="Log out" onClick={() => ask("logout")} />
          <div className="mx-4 h-px bg-border/70" />
          <ListRow
            icon={<Trash2 />}
            label="Delete account"
            description="Removes every photo you uploaded"
            tone="destructive"
            onClick={() => ask("deleteAccount")}
          />
        </Surface>

        <p className="mt-4 text-center text-caption text-muted-foreground">
          {SCHOOL_NAME} Yearbook · v1.0
        </p>
      </div>
    </BottomSheet>
  );
};
