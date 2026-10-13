import { Images, ShieldAlert } from "lucide-react";

import { Avatar } from "@/components/app/Avatar";
import { IconButton } from "@/components/app/PhoneButton";
import { LogoMark } from "@/components/brand/Logo";
import { ADMIN_ID, personById } from "@/prototype/data";
import { StatusBar } from "@/prototype/StatusBar";
import { useMockApp } from "@/prototype/store";

/**
 * Committee app bar. Deliberately unlike the student header: plum surface,
 * a "Yearbook Committee" eyebrow, and the admin avatar instead of a bell.
 */
export const AdminBar = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const { state, open } = useMockApp();
  const admin = personById(ADMIN_ID);

  return (
    <header className="shrink-0 bg-admin text-admin-foreground">
      <StatusBar tone="admin" />
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-0.5">
        <LogoMark size={26} className="text-admin-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow font-bold uppercase opacity-70">Yearbook Committee</p>
          <p className="truncate text-subhead font-bold leading-tight">{title}</p>
          {subtitle ? <p className="truncate text-caption opacity-70">{subtitle}</p> : null}
        </div>
        <IconButton
          variant="ghost"
          size="iconSm"
          onClick={() => open("profile")}
          aria-label="Committee profile"
          className="text-admin-foreground hover:bg-admin-foreground/15"
        >
          <Avatar src={admin.avatar} name={admin.name} size="md" tone="brand" />
        </IconButton>
      </div>
      <span className="sr-only">{state.role === "admin" ? "Signed in as committee" : ""}</span>
    </header>
  );
};

/** Shown when a non-admin account reaches the committee workspace. */
export const AccessDeniedState = () => {
  const { goto } = useMockApp();
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-admin-surface text-admin">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-title font-bold text-foreground">Committee access only</p>
      <p className="mt-2 text-label leading-[20px] text-muted-foreground">
        This workspace is for yearbook committee members. Access is assigned by the committee — it
        can never be self-selected.
      </p>
      <button
        type="button"
        onClick={() => goto("myPhotos")}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-body font-semibold text-primary-foreground"
      >
        <Images className="size-[18px]" aria-hidden="true" />
        Go to my photos
      </button>
    </div>
  );
};
