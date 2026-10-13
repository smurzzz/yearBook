import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ClipboardCheck,
  Flag,
  Home,
  Images,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { Avatar } from "@/components/app/Avatar";
import { Chip, ChipRow, MetaChip } from "@/components/app/Chip";
import { EventCard } from "@/components/app/EventCard";
import {
  CheckRow,
  ChoiceRow,
  FieldLabel,
  PhoneInput,
  SwitchRow,
  PhoneSelect,
  PhoneTextarea,
} from "@/components/app/Fields";
import {
  EmptyState,
  InlineBanner,
  OfflineBanner,
  PermissionPrompt,
  Skeleton,
  SkeletonGrid,
  SkeletonLine,
} from "@/components/app/Feedback";
import {
  CountdownChip,
  RoleBadge,
  StackBadge,
  StatusChip,
  StatusIcon,
  ToneDot,
  UnreadDot,
} from "@/components/app/Indicators";
import { IconButton, PhoneButton } from "@/components/app/PhoneButton";
import { PhotoTile } from "@/components/app/PhotoTile";
import { ListRow, SectionHeader, Surface } from "@/components/app/Surface";
import { Meter, UploadRow } from "@/components/app/UploadRow";
import { Block, Bullets, Card, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";
import { ComponentSpec, RowLabel } from "@/components/shell/FrameStage";
import { EVENTS, PHOTOS } from "@/prototype/data";

const photo = (id: string) => PHOTOS.find((p) => p.id === id) ?? PHOTOS[0];
const event = EVENTS[0];

const UPLOAD_ROWS = [
  { status: "waiting" as const, src: "/photos/photo-basketball.jpg", id: "d1", caption: "", progress: 0 },
  { status: "compressing" as const, src: "/photos/photo-track-relay.jpg", id: "d2", caption: "", progress: 14 },
  { status: "uploading" as const, src: "/photos/photo-volleyball.jpg", id: "d3", caption: "", progress: 62 },
  { status: "done" as const, src: "/photos/photo-caps-tossed.jpg", id: "d4", caption: "", progress: 100 },
  {
    status: "failed" as const,
    src: "/photos/photo-cultural-dance.jpg",
    id: "d5",
    caption: "",
    progress: 60,
    failNote: "Interrupted",
  },
];

export const ComponentLibrary = () => (
  <>
    <SectionIntro
      index="02"
      kicker="Deliverable two"
      title="Component library"
      lede="Every control the app uses, rendered live with its full set of states. Atoms are borrowed from the platform (Radix + shadcn) and re-dressed through the tokens from section 01; the phone-specific patterns are purpose-built here."
      meta={
        <>
          <Pill>Atoms</Pill>
          <Pill>Molecules</Pill>
          <Pill>Patterns</Pill>
          <Pill tone="admin">Student-safe vs committee-only</Pill>
        </>
      }
    />

    <Block
      eyebrow="Atoms"
      title="Buttons and controls"
      lede="Pill geometry, 44px minimum touch target at md, and three role-aware variants: primary for the student app, admin for committee actions, and onPhoto for anything laid over photography."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentSpec
          name="PhoneButton — variants"
          path="@/components/app/PhoneButton"
          note="primary · secondary · outline · ghost · destructive · admin · onPhoto. The onPhoto variant pairs a translucent white fill with a 26% border so it stays visible on any photo."
        >
          <div className="flex flex-wrap gap-2.5">
            <PhoneButton>Primary</PhoneButton>
            <PhoneButton variant="secondary">Secondary</PhoneButton>
            <PhoneButton variant="outline">Outline</PhoneButton>
            <PhoneButton variant="ghost">Ghost</PhoneButton>
            <PhoneButton variant="destructive">Delete</PhoneButton>
            <PhoneButton variant="admin">Approve</PhoneButton>
            <div className="relative flex items-center gap-2.5 overflow-hidden rounded-2xl bg-canvas px-4 py-3">
              <img
                src="/photos/cover-foundation-day.jpg"
                alt=""
                crossOrigin="anonymous"
                className="absolute inset-0 size-full object-cover opacity-80"
              />
              <span className="relative">
                <PhoneButton variant="onPhoto" size="sm">
                  <Camera />
                  Over a photo
                </PhoneButton>
              </span>
            </div>
          </div>
        </ComponentSpec>

        <ComponentSpec
          name="PhoneButton — sizes and states"
          path="@/components/app/PhoneButton"
          note="sm 36px · md 44px · lg 48px · icon 44px · iconSm 36px. Disabled drops to 45% and removes pointer events; loading swaps the icon for a spinner and keeps the label."
        >
          <RowLabel>sizes</RowLabel>
          <div className="flex flex-wrap items-center gap-2.5">
            <PhoneButton size="sm">Small</PhoneButton>
            <PhoneButton size="md">Medium</PhoneButton>
            <PhoneButton size="lg">Large</PhoneButton>
            <PhoneButton size="icon" aria-label="Add">
              <Plus />
            </PhoneButton>
            <PhoneButton size="iconSm" variant="outline" aria-label="Search">
              <Search />
            </PhoneButton>
          </div>
          <div className="mt-5">
            <RowLabel>states</RowLabel>
            <div className="flex flex-wrap items-center gap-2.5">
              <PhoneButton disabled>Disabled</PhoneButton>
              <PhoneButton loading>Submitting</PhoneButton>
              <PhoneButton variant="outline" disabled>
                <Check />
                Disabled with icon
              </PhoneButton>
            </div>
          </div>
          <div className="mt-5">
            <RowLabel>focus ring (keyboard)</RowLabel>
            <p className="text-caption text-muted-foreground">
              2px ring in --ring with a 2px offset in the page background, visible on every variant.
            </p>
          </div>
        </ComponentSpec>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ComponentSpec
          name="StatusChip"
          path="@/components/app/Indicators"
          note="Committee-only. Icon + label + tint always travel together."
        >
          <div className="flex flex-wrap gap-2">
            <StatusChip tone="pending" />
            <StatusChip tone="approved" />
            <StatusChip tone="rejected" />
            <StatusChip tone="reported" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip tone="pending" size="md" />
            <StatusChip tone="approved" size="md" emphasis="solid" />
          </div>
          <div className="mt-3 flex gap-2">
            <StatusIcon status="approved" />
            <StatusIcon status="pending" />
            <StatusIcon status="rejected" />
            <StatusIcon status="reported" />
          </div>
        </ComponentSpec>

        <ComponentSpec
          name="CountdownChip and badges"
          path="@/components/app/Indicators"
          note="Urgency is expressed three ways at once: label, tint and a pulsing dot. Closed states read the word."
        >
          <div className="flex flex-wrap items-center gap-2">
            <CountdownChip deadline={EVENTS[0].deadline} />
            <CountdownChip deadline={EVENTS[1].deadline} />
            <CountdownChip deadline={EVENTS[3].deadline} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RoleBadge role="student" />
            <RoleBadge role="admin" />
            <StackBadge count={3} className="bg-canvas" />
            <ToneDot tone="approved" />
            <ToneDot tone="reported" />
            <span className="relative flex size-8 items-center justify-center rounded-full bg-muted">
              <Bell className="size-4 text-foreground" aria-hidden="true" />
              <UnreadDot className="absolute right-0 top-0" />
            </span>
          </div>
        </ComponentSpec>

        <ComponentSpec
          name="Chip, ChipRow, MetaChip"
          path="@/components/app/Chip"
          note="Filter chips scroll horizontally with hidden scrollbars; the meta chip is read-only and used for photo tags."
        >
          <ChipRow className="mx-0 px-0">
            <Chip selected>All</Chip>
            <Chip>Intramurals 2026</Chip>
            <Chip>Foundation Day</Chip>
          </ChipRow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <MetaChip icon={<Images className="size-3.5" />}>Sports</MetaChip>
            <MetaChip>Robotics Club</MetaChip>
            <MetaChip icon={<Flag className="size-3.5" />}>Reported</MetaChip>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="admin" selected>
              Pending
            </Chip>
            <Chip tone="admin">Approved</Chip>
          </div>
        </ComponentSpec>
      </div>
    </Block>

    <Block
      eyebrow="Atoms"
      title="Inputs and identity"
      lede="Inputs are 48px tall with 20px radii. Selects render their option list inside the phone frame — no document portals, so nothing can escape the device."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <ComponentSpec name="PhoneInput / PhoneTextarea" path="@/components/app/Fields" note="Focus is a 2px ring plus a border colour shift — never just a border.">
          <FieldLabel required hint="Max 60 characters">
            Event name
          </FieldLabel>
          <PhoneInput placeholder="Intramurals 2026" defaultValue="Intramurals 2026" />
          <FieldLabel className="mt-4" hint="Optional">
            Caption
          </FieldLabel>
          <PhoneTextarea placeholder="What is happening in this photo?" />
        </ComponentSpec>

        <ComponentSpec name="PhoneSelect" path="@/components/app/Fields" note="Inline option list, 60vh max, Escape and outside-tap to close.">
          <FieldLabel required>Event</FieldLabel>
          <PhoneSelect
            value="foundation-day"
            options={EVENTS.map((item) => ({
              value: item.id,
              label: item.name,
              description: item.open ? "Open for submissions" : "Closed",
            }))}
            onChange={() => undefined}
          />
        </ComponentSpec>

        <ComponentSpec name="Checkbox, Switch, ChoiceRow" path="@/components/app/Fields" note="Consent is always a checkbox that gates a button; toggles are switches and take effect immediately.">
          <CheckRow checked onChange={() => undefined}>
            I have permission to share these photos and the people in them agree to be published.
          </CheckRow>
          <Surface className="mt-3 overflow-hidden">
            <SwitchRow label="Deadline reminders" description="2 days before an event closes" checked onChange={() => undefined} />
          </Surface>
          <div className="mt-3 space-y-2">
            <ChoiceRow label="I'm in this photo and want it removed" selected onSelect={() => undefined} />
            <ChoiceRow label="Wrong event or tag" selected={false} onSelect={() => undefined} />
          </div>
        </ComponentSpec>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ComponentSpec name="Avatar" path="@/components/app/Avatar" note="Photo first, initials as the fallback. The committee variant switches to the plum tint.">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar src="/photos/avatar-mikaela.jpg" name="Mikaela Reyes" size="xs" />
            <Avatar src="/photos/avatar-mikaela.jpg" name="Mikaela Reyes" size="sm" />
            <Avatar src="/photos/avatar-mikaela.jpg" name="Mikaela Reyes" size="md" />
            <Avatar src="/photos/avatar-mikaela.jpg" name="Mikaela Reyes" size="lg" />
            <Avatar src="/photos/avatar-mikaela.jpg" name="Mikaela Reyes" size="xl" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar name="Daniel Cruz" size="lg" tone="admin" />
            <Avatar name="Joshua Villanueva" size="lg" />
            <Avatar name="Alyssa Mendoza" size="md" />
            <Avatar name="Miguel Torres" size="sm" />
          </div>
        </ComponentSpec>

        <ComponentSpec name="Meter and Skeletons" path="@/components/app/UploadRow · Feedback" note="Skeletons mirror the real layout: same paddings, same tile sizes, shimmer only.">
          <RowLabel>meter tones</RowLabel>
          <div className="space-y-2">
            <Meter value={42} />
            <Meter value={72} tone="admin" />
            <Meter value={100} tone="done" />
            <Meter value={60} tone="failed" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Skeleton className="size-10 rounded-full" />
              <SkeletonLine className="w-3/4" />
              <SkeletonLine className="h-2.5 w-1/2" />
            </div>
            <SkeletonGrid count={4} />
          </div>
        </ComponentSpec>
      </div>
    </Block>

    <Block
      eyebrow="Molecules"
      title="Content blocks"
      lede="Molecules know about the domain: events, photos, uploads. Two of them have a hard rule attached — PhotoTile never shows status on a student surface, and EventCard speaks a different language per role."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentSpec
          name="EventCard — student"
          path="@/components/app/EventCard"
          note="Cover-led, countdown chip over the photo, submissions state spelled out under it. Highlighted amber when under three days."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <EventCard event={event} role="student" />
            <EventCard event={EVENTS[3]} role="student" />
          </div>
        </ComponentSpec>

        <ComponentSpec
          name="EventCard — admin"
          path="@/components/app/EventCard"
          note="Denser row: thumbnail, deadline, Open/Closed status chip and submission count. The committee scans volume, not beauty."
        >
          <div className="space-y-3">
            {EVENTS.slice(0, 4).map((item) => (
              <EventCard
                key={item.id}
                event={item}
                role="admin"
                submissionCount={PHOTOS.filter((p) => p.eventId === item.id).length}
              />
            ))}
          </div>
        </ComponentSpec>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ComponentSpec
          name="PhotoTile — student surface"
          path="@/components/app/PhotoTile"
          note="No status, no counts, no tabs. The stacked icon appears only when the photo travelled in a multi-photo batch."
        >
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-tile bg-border">
            <PhotoTile photo={photo("p-basketball")} />
            <PhotoTile photo={photo("p-foundation-booth")} batchCount={2} />
            <PhotoTile photo={photo("p-campus-steps")} />
          </div>
        </ComponentSpec>

        <ComponentSpec
          name="PhotoTile — committee surface"
          path="@/components/app/PhotoTile"
          note="showStatus adds the icon+label disc, and an open removal request adds the Reported badge."
        >
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-tile bg-border">
            <PhotoTile photo={photo("p-basketball")} showStatus />
            <PhotoTile photo={photo("p-campus-steps")} showStatus />
            <PhotoTile photo={photo("p-drama-rehearsal")} showStatus />
            <PhotoTile photo={photo("p-science-model")} showStatus />
            <PhotoTile photo={photo("p-photography-club")} showStatus />
            <PhotoTile photo={photo("p-volleyball")} showStatus batchCount={2} />
          </div>
        </ComponentSpec>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ComponentSpec
          name="UploadRow"
          path="@/components/app/UploadRow"
          note="Five states, one row each: Waiting, Compressing, Uploading with percentage, Done, and Failed with a Retry that appears only on the failed row."
        >
          <div className="divide-y divide-border/70">
            {UPLOAD_ROWS.map((item, index) => (
              <UploadRow key={item.id} item={item} index={index} onRetry={() => undefined} />
            ))}
          </div>
        </ComponentSpec>

        <ComponentSpec name="SectionHeader and ListRow" path="@/components/app/Surface" note="ListRow carries an icon disc, a destructive tone for account actions, and an optional chevron.">
          <SectionHeader eyebrow="Deadlines" title="Upcoming deadlines" action="See all" />
          <Surface className="mt-3 overflow-hidden">
            <ListRow icon={<ShieldCheck />} label="Privacy Notice" description="Data use, visibility, your rights" chevron />
            <div className="mx-4 h-px bg-border/70" />
            <ListRow icon={<Trash2 />} label="Delete account" description="Removes every photo you uploaded" tone="destructive" />
          </Surface>
        </ComponentSpec>

        <ComponentSpec name="InlineBanner" path="@/components/app/Feedback" note="Four tones with an optional action. Error is role=alert; the rest are role=status.">
          <div className="space-y-2.5">
            <InlineBanner tone="info" title="Select a category" message="Categories are how the layout team finds your photo." />
            <InlineBanner tone="warning" title="Photo limit reached" message="You already have 2 of 2 photos for Science Fair." />
            <InlineBanner
              tone="error"
              title="A few fields still need attention"
              message="Give the event a name, a description, and a deadline."
            />
            <InlineBanner
              tone="success"
              icon={Check}
              title="All photos uploaded"
              message="5 photos are with the yearbook committee."
            />
          </div>
        </ComponentSpec>
      </div>
    </Block>

    <Block
      eyebrow="Molecules"
      title="Empty states and permission prompts"
      lede="Every list has a designed empty state with one action. The permission prompts are the OS-style surfaces the camera and gallery routes use."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <ComponentSpec name="EmptyState — screen" path="@/components/app/Feedback" note="Used inside full screens: 56px icon disc, bold title, one line of guidance, one action.">
          <EmptyState
            icon={Images}
            title="No photos yet"
            message="Tap + to upload your first one."
            action={{ label: "Upload photos", icon: Plus, onClick: () => undefined }}
          />
        </ComponentSpec>
        <ComponentSpec name="EmptyState — inset" path="@/components/app/Feedback" note="Short form for panels inside a scrolling screen.">
          <EmptyState
            variant="inset"
            icon={Flag}
            title="No removal requests"
            message="Photos students ask to remove appear here."
          />
        </ComponentSpec>
        <ComponentSpec name="PermissionPrompt" path="@/components/app/Feedback" note="Allow and deny are equally weighted — no dark patterns, no pre-checked boxes.">
          <PermissionPrompt
            icon={Camera}
            title="Allow YearbookHub to use the camera?"
            message="Photos you take here go straight into the batch you are submitting."
            allowLabel="Allow camera"
            onAllow={() => undefined}
            onDeny={() => undefined}
          />
        </ComponentSpec>
      </div>
      <div className="mt-4">
        <ComponentSpec name="OfflineBanner" path="@/components/app/Feedback" note="Pinned directly above the tab bar, never a modal — the app stays usable offline.">
          <OfflineBanner />
        </ComponentSpec>
      </div>
    </Block>

    <Block
      eyebrow="Patterns"
      title="Sheets, dialogs, toasts"
      lede="Three feedback surfaces with distinct jobs: a sheet is a place to do something, a dialog guards a destructive action, and a toast confirms with an escape hatch."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Bottom sheet anatomy" note="Drag handle · title + description · scrolling body · sticky footer that respects the home indicator.">
          <div className="overflow-hidden rounded-t-sheet border border-border bg-background shadow-sheet">
            <div className="flex flex-col items-center pt-2.5">
              <span className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3">
              <div>
                <p className="text-subhead font-bold text-foreground">Reject this photo?</p>
                <p className="mt-1 text-caption text-muted-foreground">The uploader is notified with the reason.</p>
              </div>
              <IconButton size="iconSm" variant="muted" aria-label="Close">
                <X />
              </IconButton>
            </div>
            <div className="space-y-2 px-4">
              <SkeletonLine className="w-4/5" />
              <SkeletonLine className="w-3/5" />
            </div>
            <div className="mt-4 border-t border-border px-4 py-3">
              <PhoneButton block variant="destructive" size="sm">
                Confirm reject
              </PhoneButton>
            </div>
          </div>
          <div className="mt-3">
            <Bullets
              tone="compact"
              items={[
                "Enters with sheet-up 320ms, exits at 240ms",
                "role=dialog, aria-modal, Escape closes",
                "Backdrop dims to 45% with a 2px blur",
              ]}
            />
          </div>
        </Card>

        <Card title="FrameDialog" note="Centred, 24px radius, icon disc, two equal buttons. Used only for log out, delete account, delete photo, remove photo, delete event.">
          <div className="rounded-[24px] border border-border bg-background p-4 text-center shadow-sheet">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-status-rejected-soft text-status-rejected-foreground">
              <Trash2 className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-subhead font-bold text-foreground">Delete this photo?</p>
            <p className="mt-1.5 text-caption text-muted-foreground">
              It disappears from your photos and from the committee's review list right away.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <PhoneButton variant="outline" size="sm">
                Cancel
              </PhoneButton>
              <PhoneButton variant="destructive" size="sm">
                Delete
              </PhoneButton>
            </div>
          </div>
        </Card>

        <Card title="FrameToast" note="Dark surface pinned above the tab bar: Undo after approve/reject, success after a save or a removal request.">
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-canvas/95 px-3.5 py-3 text-onimage">
              <span className="flex size-8 items-center justify-center rounded-full bg-onimage-surface">
                <X className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-bold">Rejected · Blurry</span>
                <span className="block truncate text-caption opacity-80">The uploader is notified.</span>
              </span>
              <span className="rounded-full bg-onimage-surface px-3 py-1.5 text-caption font-bold">Undo</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-canvas/95 px-3.5 py-3 text-onimage">
              <span className="flex size-8 items-center justify-center rounded-full bg-status-approved/25">
                <Check className="size-4 text-status-approved" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-bold">All photos uploaded</span>
                <span className="block truncate text-caption opacity-80">5 photos are with the committee.</span>
              </span>
            </div>
          </div>
          <div className="mt-3">
            <Bullets tone="compact" items={["Auto-dismisses at 4.2s", "Hover pauses the timer", "One toast at a time"]} />
          </div>
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Patterns"
      title="Navigation and frame"
      lede="The two tab bars are the fastest way to tell which app you are in. Student: three tabs with a raised Upload action. Committee: two tabs, plum active state, live pending count."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentSpec name="TabBar — student" path="@/prototype/TabBar" note="The centre action is a 52px circle with a glow shadow; the active tab is indigo with a heavier stroke.">
          <TabBarPreview role="student" active="home" />
          <div className="mt-4">
            <TabBarPreview role="student" active="upload" />
          </div>
        </ComponentSpec>
        <ComponentSpec name="TabBar — committee" path="@/prototype/TabBar" note="Plum active state, dashed plum top border, and the pending count is announced with its noun.">
          <TabBarPreview role="admin" active="review" pending={6} />
          <div className="mt-4">
            <TabBarPreview role="admin" active="events" pending={6} />
          </div>
        </ComponentSpec>
      </div>

      <div className="mt-4">
        <SpecTable
          head={["Surface", "Role", "Type", "Notes"]}
          rows={[
            ["Home", "Student", "Screen 2", "Deadlines + recent uploads, no status"],
            ["Upload", "Student", "Screen 3", "One scrolling screen with a sticky submit"],
            ["My Photos", "Student", "Screen 4", "Private gallery, two stats only"],
            ["Review / All photos", "Admin", "Screen 5", "Segmented toggle above both modes"],
            ["Events", "Admin", "Screen 6", "Search, cards, New event"],
            ["Everything else", "Both", "Sheet / overlay / dialog / state", "Nothing else is a full screen"],
          ]}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="StatusBar" note="Drawn inside the frame in three tones: default, onImage (over photography) and admin (follows the committee bar in both themes).">
          <div className="space-y-3">
            <div className="rounded-2xl bg-background px-4 py-2 text-foreground shadow-tile">
              <p className="tabular text-caption font-bold">9:41 · default</p>
            </div>
            <div className="rounded-2xl bg-canvas px-4 py-2 text-onimage">
              <p className="tabular text-caption font-bold">9:41 · onImage</p>
            </div>
            <div className="rounded-2xl bg-admin px-4 py-2 text-admin-foreground">
              <p className="tabular text-caption font-bold">9:41 · admin</p>
            </div>
          </div>
        </Card>
        <Card title="Role languages at a glance" note="Switch the canvas theme in the sidebar footer to compare the dark variants of both.">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-eyebrow font-bold uppercase text-primary">Student</p>
              <p className="mt-2 text-label text-muted-foreground">
                Indigo, airy 20px gutters, 3-tab bar, bubbly cards, no status anywhere.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <MetaChip icon={<Images className="size-3.5" />}>9 photos</MetaChip>
                <MetaChip icon={<Info className="size-3.5" />}>Private</MetaChip>
              </div>
            </div>
            <div className="rounded-2xl border border-admin-border bg-admin-surface p-4">
              <p className="text-eyebrow font-bold uppercase text-admin-ink">Committee</p>
              <p className="mt-2 text-label text-admin-ink/85">
                Plum, denser rows, 2-tab bar, status chips, counts, filters.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusChip tone="pending" />
                <StatusChip tone="reported" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Block>
  </>
);

/** Static, non-interactive tab bar used for documentation. */
const TabBarPreview = ({
  role,
  active,
  pending = 0,
}: {
  role: "student" | "admin";
  active: string;
  pending?: number;
}) => {
  const tabs =
    role === "student"
      ? [
          { id: "home", label: "Home", icon: Home, center: false },
          { id: "upload", label: "Upload", icon: Plus, center: true },
          { id: "myPhotos", label: "My Photos", icon: Images, center: false },
        ]
      : [
          { id: "review", label: "Review", icon: ClipboardCheck, center: false },
          { id: "events", label: "Events", icon: CalendarDays, center: false },
        ];

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-background ${
        role === "admin" ? "border-admin-border" : "border-border"
      }`}
    >
      <div className="flex items-end justify-around px-3 pb-3 pt-2">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const accent = role === "admin" ? "text-admin" : "text-primary";
          return (
            <span key={tab.id} className="flex flex-col items-center gap-1">
              {tab.center ? (
                <span className="flex size-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                  <tab.icon className="size-6" aria-hidden="true" />
                </span>
              ) : (
                <span className="relative flex size-6 items-center justify-center">
                  <tab.icon
                    className={isActive ? `size-[22px] ${accent}` : "size-[22px] text-muted-foreground"}
                    aria-hidden="true"
                  />
                  {role === "admin" && tab.id === "review" && pending > 0 ? (
                    <span className="tabular absolute -right-2 -top-1.5 rounded-full bg-admin px-1 text-[10px] font-bold leading-[18px] text-admin-foreground">
                      {pending}
                    </span>
                  ) : null}
                </span>
              )}
              <span className={`text-caption font-bold ${isActive ? accent : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default ComponentLibrary;
