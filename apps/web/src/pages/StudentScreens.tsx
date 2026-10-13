import { LIBRARY_PHOTOS } from "@/prototype/data";
import { uploadQueue } from "@/prototype/flows";
import { PhoneShell } from "@/prototype/PhoneShell";
import { Block, Bullets, Card, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";
import { FrameStage, FrameStageItem, ScaledFrame } from "@/components/shell/FrameStage";

const signedIn = { signedIn: true, notificationsAsked: true } as const;

export const StudentScreens = () => (
  <>
    <SectionIntro
      index="04"
      kicker="Deliverable four"
      title="Student screens and sheets"
      lede="Three screens for the student: Home, Upload, My Photos. Everything else — deadlines, notifications, the photo viewer, upload progress — arrives as a bottom sheet or a quiet state. No screen, tab, badge or count ever mentions the word review."
      meta={
        <>
          <Pill tone="brand">Home · Upload · My Photos</Pill>
          <Pill>6 sheets</Pill>
          <Pill>Zero status UI</Pill>
        </>
      }
    />

    <Block
      eyebrow="Screens 2, 3 and 4"
      title="The three student screens, live"
      lede="All three are interactive: tap the bell, open an event, edit a caption, pull the gallery down to refresh. Each frame owns its own state, so nothing you do here leaks into the others."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "home" }}
            caption="2 · Home"
            description="Greeting, avatar and bell, deadline cards with countdown chips, then recent uploads with no status badges."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "upload" }}
            caption="3 · Upload"
            description="One scrolling screen: picker, event, category, club, captions, consent, and a sticky submit that explains why it is off."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "myPhotos" }}
            caption="4 · My Photos"
            description="Profile-style header with two stats, event chips, a 3-column grid, pull to refresh. The stacked icon marks multi-photo batches."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "home", loading: true }}
            animate={false}
            caption="Home while loading"
            description="Skeletons mirror the real layout — same card heights, same grid — so nothing jumps when data lands."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheet 7"
      title="Event detail"
      lede="Cover-led sheet with the countdown, the rules that actually matter, and the one action worth taking."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "home", overlays: [{ id: "eventDetail", eventId: "intramurals-2026" }] }}
            caption="Open event · 2 days left"
            description="Upload to this event carries the event into the Upload screen, prefilled, so the student never re-picks it."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "home", overlays: [{ id: "eventDetail", eventId: "science-fair" }] }}
            caption="Closed event · deadline passed"
            description="The upload button is disabled and the sheet says when submissions stopped and who to ask for an extension."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "home",
              overlays: [{ id: "eventDetail", eventId: "foundation-day" }],
            }}
            caption="Foundation Day · 9 days left"
            description="Rules are event-specific: photo limit, tagging guidance, and what not to upload."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 5 and 6"
      title="Notifications"
      lede="The bell opens the permission prompt once, then the notification list forever after. Unread is a dot plus a count in the accessible name."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ signedIn: true, screen: "home", notificationsAsked: false, overlays: [{ id: "notifPermission" }] }}
            caption="5 · First bell tap"
            description="Two notification kinds, spelled out. Allow and Not now carry equal weight."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "home", overlays: [{ id: "notifications" }] }}
            caption="6 · Notification list"
            description="Deadline reminder, review result, removal resolved. Tapping a review item opens that photo in the viewer."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "home",
              notifications: [],
              overlays: [{ id: "notifications" }],
            }}
            caption="6 · Empty list"
            description="Empty, not broken: tells the student what will appear here."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 8 and 9"
      title="Upload progress and the photo viewer"
      lede="The progress sheet is where trust is won: every photo has its own row and its own state, and a failure never kills the batch."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "upload",
              uploadPhase: "running",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: uploadQueue(
                  ["done", "failed", "done", "uploading", "waiting"],
                  ["Last leg of the 4x100 relay.", "Bench reaction after the buzzer beater."],
                ),
              },
              overlays: [{ id: "uploadProgress" }],
            }}
            animate={false}
            caption="8 · One photo failed"
            description="Overall progress, per-photo status, an offline promise, and Retry all failed. Nothing is lost."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "upload",
              uploadPhase: "running",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: uploadQueue(["done", "failed", "done", "compressing", "waiting"]),
              },
              network: "offline",
              overlays: [{ id: "uploadProgress" }],
            }}
            animate={false}
            caption="8 · Offline mid-batch"
            description="“No connection. Your photos are saved and will retry.” The queue resumes automatically."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "home",
              uploadPhase: "success",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: uploadQueue(["done", "done", "done", "done", "done"]),
              },
              overlays: [{ id: "uploadProgress" }],
            }}
            animate={false}
            caption="8 · Success"
            description="One celebratory check, a plain sentence about what happens next, and two exits: upload more, or go look at them."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "myPhotos",
              overlays: [{ id: "photoViewer", photoId: "p-basketball" }],
            }}
            caption="9 · Photo viewer"
            description="Swipe between photos, pinch or double-tap to zoom, chips for event, category, club and date. No status."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "myPhotos",
              overlays: [{ id: "photoViewer", photoId: "p-foundation-booth" }],
            }}
            caption="9 · A photo that needs replacing"
            description="One quiet note, one action. This is the only place a student ever learns a photo was sent back."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 10 and extras"
      title="Removal request, captions, picker"
      lede="Request removal is a five-option reason list, not a free-text box. Editing tags happens inside the viewer so the student never loses their place."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "myPhotos",
              overlays: [
                { id: "photoViewer", photoId: "p-volleyball" },
                { id: "requestRemoval", photoId: "p-volleyball" },
              ],
            }}
            caption="10 · Request removal"
            description="Submit stays disabled until a reason is chosen; notes are optional. The committee sees the reporter's name."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "upload", overlays: [{ id: "sourceChooser" }] }}
            caption="System · Add photos"
            description="Camera or gallery. Both routes start with a permission prompt, never a silent denial."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...signedIn, screen: "upload", overlays: [{ id: "libraryPicker" }] }}
            animate={false}
            caption="System · Gallery picker"
            description="Multi-select up to 20 with a numbered counter; the footer states exactly how many will be added."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...signedIn,
              screen: "upload",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: [0, 2, 3, 4].map((index, i) => ({
                  id: `demo-${i}`,
                  src: LIBRARY_PHOTOS[index],
                  caption: "",
                  status: "waiting" as const,
                  progress: 0,
                })),
              },
            }}
            caption="3 · Batch staged"
            description="Four selected, with remove (x) on each thumbnail and a caption editor one tap away."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Rules"
      title="Student-side invariants"
      lede="These hold across every student surface in the build."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Privacy" note="No public feed exists, and no student can see another student's photos.">
          <Bullets
            items={[
              "My Photos shows only the signed-in student's own uploads.",
              "The gallery header repeats the visibility promise in the student's own words.",
              "Need is stated in the data model: a removal request is the only way a student asks for a change.",
            ]}
          />
        </Card>
        <Card title="No status, ever" note="The student-facing components physically cannot render a status chip.">
          <Bullets
            items={[
              "No tabs, no counts, no badges, no “pending” wording anywhere in the student tree.",
              "A sent-back photo surfaces only as a notification and one quiet note inside the viewer.",
              "The word rejected never appears on a student surface — the copy always names the fix.",
            ]}
          />
        </Card>
      </div>
      <div className="mt-4">
        <SpecTable
          head={["Student surface", "Shows", "Never shows"]}
          rows={[
            ["Home · Recent uploads", "Plain thumbnails, newest first", "Status, counts, tabs"],
            ["My Photos", "Two stats (photos, events) and the event chips", "Review state, uploader names"],
            ["Photo viewer", "Tags, caption, date", "Reviewer identity, status labels"],
            ["Notifications", "Deadline reminders, review results, removal outcomes", "Queue position, admin names"],
          ]}
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ScaledFrame scale={0.46} role="student" initial={{ ...signedIn, screen: "myPhotos", photos: [] }} caption="Empty gallery" />
        <ScaledFrame
          scale={0.46}
          role="student"
          initial={{ ...signedIn, screen: "upload", batchMessage: "No photos added yet. Pick from your camera or gallery — up to 20 at a time." }}
          caption="Upload, nothing picked"
        />
        <ScaledFrame
          scale={0.46}
          role="student"
          initial={{ ...signedIn, screen: "myPhotos", refreshing: true }}
          animate={false}
          caption="Pull to refresh"
        />
      </div>
    </Block>
  </>
);

export default StudentScreens;
