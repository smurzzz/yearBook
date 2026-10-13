import { RotateCcw, Search } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/app/Chip";
import { FieldLabel, PhoneInput, SwitchRow } from "@/components/app/Fields";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/prototype/overlays/BottomSheet";
import { PEOPLE } from "@/prototype/data";
import { filterPhotos } from "@/prototype/selectors";
import { useMockApp } from "@/prototype/store";
import { CATEGORIES, CLUBS } from "@/prototype/types";
import type { Category, Club, PhotoStatus } from "@/prototype/types";

const STATUS_OPTIONS: { value: PhotoStatus | "any"; label: string }[] = [
  { value: "any", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

/** Sheet 13 — Filter. Everything applies to the All photos grid. */
export const FilterSheet = ({ open }: { open: boolean }) => {
  const { state, dispatch, close } = useMockApp();
  const draft = state.filterDraft;
  const [uploaderSearch, setUploaderSearch] = useState("");

  const patch = (next: Partial<typeof draft>) => dispatch({ type: "patchFilterDraft", patch: next });
  const resultCount = filterPhotos(state.photos, draft).length;
  const uploaders = state.photos
    .map((p) => p.uploaderId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .map((id) => PEOPLE.find((person) => person.id === id))
    .filter((person): person is (typeof PEOPLE)[number] => Boolean(person))
    .filter((person) => person.name.toLowerCase().includes(uploaderSearch.trim().toLowerCase()));

  return (
    <BottomSheet
      open={open}
      onClose={close}
      size="tall"
      title="Filter photos"
      description="Narrow the grid down, then apply."
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2.5">
          <PhoneButton variant="outline" onClick={() => dispatch({ type: "resetFilter" })}>
            <RotateCcw />
            Reset
          </PhoneButton>
          <PhoneButton variant="admin" onClick={() => dispatch({ type: "applyFilter" })}>
            Show {resultCount} photo{resultCount === 1 ? "" : "s"}
          </PhoneButton>
        </div>
      }
    >
      <div className="px-5 pb-3">
        <FieldLabel>Status</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              tone="admin"
              selected={draft.status === option.value}
              onClick={() => patch({ status: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <FieldLabel className="mt-5">Event</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip tone="admin" selected={draft.eventId === "any"} onClick={() => patch({ eventId: "any" })}>
            All events
          </Chip>
          {state.events.map((event) => (
            <Chip
              key={event.id}
              tone="admin"
              selected={draft.eventId === event.id}
              onClick={() => patch({ eventId: event.id })}
            >
              {event.name}
            </Chip>
          ))}
        </div>

        <FieldLabel className="mt-5">Category</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip tone="admin" selected={draft.category === "any"} onClick={() => patch({ category: "any" })}>
            Any
          </Chip>
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              tone="admin"
              selected={draft.category === category}
              onClick={() => patch({ category: category as Category })}
            >
              {category}
            </Chip>
          ))}
        </div>

        <FieldLabel className="mt-5">Club</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip tone="admin" selected={draft.club === "any"} onClick={() => patch({ club: "any" })}>
            Any
          </Chip>
          {CLUBS.map((club) => (
            <Chip
              key={club}
              tone="admin"
              selected={draft.club === club}
              onClick={() => patch({ club: club as Club })}
            >
              {club}
            </Chip>
          ))}
        </div>

        <FieldLabel className="mt-5">Uploader</FieldLabel>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <PhoneInput
            value={uploaderSearch}
            onChange={(e) => setUploaderSearch(e.target.value)}
            placeholder="Search by name"
            className="h-11 pl-10"
            aria-label="Search uploaders"
          />
        </div>
        <div className="no-scrollbar mt-2.5 max-h-52 space-y-1.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => patch({ uploaderId: "any" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left",
              draft.uploaderId === "any" ? "border-admin bg-admin-surface" : "border-border bg-card",
            )}
          >
            <span className="text-label font-semibold text-foreground">Anyone</span>
          </button>
          {uploaders.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => patch({ uploaderId: person.id })}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left",
                draft.uploaderId === person.id ? "border-admin bg-admin-surface" : "border-border bg-card",
              )}
            >
              <Avatar src={person.avatar} name={person.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-semibold text-foreground">
                  {person.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {person.club ?? "No club"} ·{" "}
                  {state.photos.filter((p) => p.uploaderId === person.id).length} photos
                </span>
              </span>
            </button>
          ))}
        </div>

        <FieldLabel className="mt-5" hint="Uploaded between">
          Date range
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <PhoneInput
              type="date"
              value={draft.from ?? ""}
              onChange={(e) => patch({ from: e.target.value || null })}
              aria-label="From date"
            />
            <p className="mt-1 text-caption text-muted-foreground">From</p>
          </div>
          <div>
            <PhoneInput
              type="date"
              value={draft.to ?? ""}
              onChange={(e) => patch({ to: e.target.value || null })}
              aria-label="Until date"
            />
            <p className="mt-1 text-caption text-muted-foreground">Until</p>
          </div>
        </div>

        <Surface className="mt-5 overflow-hidden">
          <SwitchRow
            label="Reported only"
            description="Photos with an open removal request"
            checked={draft.reportedOnly}
            onChange={(value) => patch({ reportedOnly: value })}
          />
        </Surface>
      </div>
    </BottomSheet>
  );
};
