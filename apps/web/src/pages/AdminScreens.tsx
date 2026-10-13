import { emptyFilter } from "@/prototype/selectors";
import { PhoneShell } from "@/prototype/PhoneShell";
import { Block, Bullets, Card, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";
import { FrameStage, FrameStageItem, ScaledFrame } from "@/components/shell/FrameStage";

const admin = { signedIn: true, role: "admin" as const, notificationsAsked: true };

export const AdminScreens = () => (
  <>
    <SectionIntro
      index="05"
      kicker="Deliverable five"
      title="Admin screens and sheets"
      lede="The committee app looks like a different tool on purpose: plum chrome, a YEARBOOK COMMITTEE eyebrow, a two-tab bar, and a Review | All photos switch pinned under the app bar. Status, counts and filters live here and only here."
      meta={
        <>
          <Pill tone="admin">Review · Events</Pill>
          <Pill>4 committee sheets</Pill>
          <Pill>Status is icon + label</Pill>
        </>
      }
    />

    <Block
      eyebrow="Screen 5"
      title="Review mode"
      lede="One photo at a time with everything the committee needs to decide: who sent it, where it belongs, what the caption says, and whether consent was confirmed."
      >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", allPhotosMode: "review" }}
            caption="5 · The pending queue"
            description="Six pending photos, newest first. Progress reads “1 of 6”; pinch to zoom, swipe (or arrow keys) for the next photo."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "review",
              reviewEventFilter: "foundation-day",
              reviewIndex: 1,
            }}
            caption="5 · A photo with an open removal request"
            description="The deck flags it before the committee approves anything by mistake. The event filter chips narrow the queue."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", allPhotosMode: "review", photos: [] }}
            caption="5 · All caught up!"
            description="The best state in the app. It offers the one useful next move instead of a dead end."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", allPhotosMode: "review", loading: true }}
            animate={false}
            caption="5 · Loading"
            description="A skeleton of the deck — image block, meta lines, action bar — so the layout never shifts."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Screen 5, second mode"
      title="All photos"
      lede="Search, filters, result counts and a 3-column grid where every tile carries its status as an icon and a label."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", allPhotosMode: "all" }}
            caption="5 · All photos"
            description="Search across captions, uploaders, events and categories. Result count and status breakdown sit above the grid."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              filter: { ...emptyFilter, reportedOnly: true },
            }}
            caption="5 · Reported only"
            description="One active-filter chip, removable in a tap. Reported tiles wear a flag badge, not just a colour."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              filter: { ...emptyFilter, reportedOnly: true, eventId: "graduation-rites" },
              photos: [],
            }}
            caption="5 · No reports"
            description="An empty report queue is a good day — the copy says so instead of showing a bare grid."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              filter: { ...emptyFilter, status: "rejected" },
            }}
            caption="5 · Rejected filter"
            description="Rejected photos stay browsable with the reason attached, and the banner explains why they are kept."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Screen 6"
      title="Events"
      lede="The second committee tab: search events, see submission volume, and create or edit one without leaving the list."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "events" }}
            caption="6 · Events"
            description="Sorted by deadline, with Open/Closed badges and photo counts. The four named events, nothing invented."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "events", events: [] }}
            caption="6 · No events yet"
            description="Empty state with the one action that fixes it."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "events", overlays: [{ id: "eventForm", eventId: "intramurals-2026" }] }}
            caption="14 · Event form, editing"
            description="Every field editable in the frame — name, description, cover, deadline with time, max photos, open toggle."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "events", overlays: [{ id: "eventForm" }] }}
            caption="14 · Event form, new"
            description="Deadline defaults to a week out. Saving publishes it to every student Home screen immediately."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 11 and 12"
      title="Photo detail and rejection"
      lede="The detail sheet is the committee's single source of truth for a photo: status, consent, tags, and any removal request waiting on a decision."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              overlays: [{ id: "adminPhotoDetail", photoId: "p-basketball" }],
            }}
            caption="11 · Photo detail"
            description="Status, consent confirmed, uploader (tappable for their full grid), tags, caption and the three status actions."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              overlays: [{ id: "adminPhotoDetail", photoId: "p-campus-steps" }],
            }}
            caption="11 · With a removal request"
            description="Reporter, reason, date and their note, with Remove photo and Dismiss as the only two exits."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              overlays: [{ id: "adminPhotoDetail", photoId: "p-drama-rehearsal" }],
            }}
            caption="11 · Rejected photo"
            description="The reason that was sent to the student is shown back to the committee, so a second reviewer knows the context."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              overlays: [{ id: "rejectReason", photoId: "p-robotics-build" }],
            }}
            caption="12 · Reject reason"
            description="Seven preset chips. Confirm stays disabled until a reason is picked, and the note is required only for Other."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              overlays: [
                { id: "adminPhotoDetail", photoId: "p-campus-steps" },
                { id: "rejectReason", photoId: "p-campus-steps" },
              ],
            }}
            caption="12 · Rejecting from the detail sheet"
            description="The reason sheet stacks over the detail sheet, which stays alive underneath."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 13 and extras"
      title="Filter and uploader grid"
      lede="Filter is a full sheet rather than a row of chips, because it holds eight facets including a searched uploader and a date range."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", allPhotosMode: "all", overlays: [{ id: "filter" }] }}
            caption="13 · Filter"
            description="The apply button states the result count — “Show 7 photos” — so the committee never applies a filter blind."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              filter: { ...emptyFilter, status: "pending", category: "Sports" },
              overlays: [{ id: "filter" }],
            }}
            caption="13 · Filter with active facets"
            description="Applying twists the grid; the active chips above the grid clear a single facet at a time."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              overlays: [{ id: "uploaderGrid", uploaderId: "alyssa" }],
            }}
            caption="Read-only uploader grid"
            description="Tapping an uploader's name opens everything they have submitted, with the same status treatment."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              dialog: "deleteEvent",
              dialogEventId: "science-fair",
            }}
            caption="Dialog · Delete event"
            description="Names the event and states how many photos are linked to it before anything is destroyed."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Rules"
      title="How the committee app stays distinct"
      lede="Role difference is carried by structure, not by a badge alone."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Structural differences" note="You can tell the role from a screenshot with the text blurred out.">
          <Bullets
            items={[
              "Plum app bar with a YEARBOOK COMMITTEE eyebrow instead of a greeting header.",
              "Two tabs, not three — and no raised centre action.",
              "A segmented Review | All photos switch that does not exist in the student app.",
              "Status chips, pending counts, filters and result counts appear only here.",
              "Denser geometry: 68px thumbnails in row cards instead of 144px cover cards.",
            ]}
          />
        </Card>
        <Card title="Access" note="Committee rights are granted by the adviser, never chosen in the UI.">
          <Bullets
            items={[
              "There is no role picker anywhere in the product.",
              "A student account that reaches the committee area sees the access-denied state.",
              "The same account keeps full access to its own student screens.",
            ]}
          />
        </Card>
      </div>
      <div className="mt-4">
        <SpecTable
          head={["Item", "Student app", "Committee app"]}
          rows={[
            ["Accent", "Indigo 244 72% 57%", "Plum 268 52% 38%"],
            ["Header", "Greeting + avatar + bell", "Committee eyebrow + avatar only"],
            ["Tabs", "Home · Upload (raised) · My Photos", "Review · Events"],
            ["Status", "Never rendered", "Icon + label on every tile and detail"],
            ["Home surface", "Photo-first cards", "Review deck and filterable grid"],
          ]}
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ScaledFrame scale={0.46} role="admin" initial={{ ...admin, screen: "review", allPhotosMode: "all", loading: true }} animate={false} caption="All photos, loading" />
        <ScaledFrame scale={0.46} role="admin" initial={{ ...admin, screen: "review", allPhotosMode: "all", photos: [] }} caption="No photos at all" />
        <ScaledFrame scale={0.46} role="admin" initial={{ ...admin, screen: "events", dialog: "logout" }} caption="Dialog over the events list" />
      </div>
    </Block>
  </>
);

export default AdminScreens;
