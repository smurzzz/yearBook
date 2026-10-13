import { Camera, Images, RefreshCw, ServerCrash, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { InlineBanner } from "@/components/app/Feedback";
import { Block, Bullets, Card, Pill, SectionIntro } from "@/components/shell/Docs";
import { RowLabel, ScaledFrame } from "@/components/shell/FrameStage";
import { PHOTOS, LIBRARY_PHOTOS } from "@/prototype/data";
import { uploadQueue } from "@/prototype/flows";

const student = { signedIn: true, notificationsAsked: true } as const;
const admin = { signedIn: true, role: "admin" as const, notificationsAsked: true };
const noReports = PHOTOS.filter((photo) => !photo.removalRequest);

const Group = ({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) => (
  <Card title={title} note={note}>
    <div className="flex flex-wrap gap-6">{children}</div>
  </Card>
);

export const StatesPage = () => (
  <>
    <SectionIntro
      index="07"
      kicker="Deliverable seven"
      title="Every state, designed"
      lede="Loading, empty, offline, failed, blocked, expired and denied. None of these is an afterthought: each one is a first-class composition with its own copy, and every one keeps a way forward."
      meta={
        <>
          <Pill>Skeletons mirror layout</Pill>
          <Pill>7 empty states</Pill>
          <Pill>5 upload failures</Pill>
          <Pill tone="admin">Denied, not hidden</Pill>
        </>
      }
    />

    <Block
      eyebrow="Loading"
      title="Skeletons, not spinners"
      lede="A skeleton repeats the real layout — identical paddings, card heights and tile sizes — so nothing shifts when data arrives. Shimmer runs at 1.6s and only on the placeholder."
    >
      <Group title="Screen skeletons" note="Each mirrors the screen it stands in for.">
        <ScaledFrame scale={0.4} role="student" initial={{ ...student, screen: "home", loading: true }} animate={false} caption="Home" />
        <ScaledFrame scale={0.4} role="student" initial={{ ...student, screen: "myPhotos", loading: true }} animate={false} caption="Gallery + header" />
        <ScaledFrame scale={0.4} role="admin" initial={{ ...admin, screen: "review", allPhotosMode: "review", loading: true }} animate={false} caption="Review deck" />
        <ScaledFrame scale={0.4} role="admin" initial={{ ...admin, screen: "review", allPhotosMode: "all", loading: true }} animate={false} caption="Grid + search" />
        <ScaledFrame scale={0.4} role="admin" initial={{ ...admin, screen: "events", loading: true }} animate={false} caption="Event list" />
      </Group>
    </Block>

    <Block
      eyebrow="Empty"
      title="Empty states"
      lede="An empty state is an instruction, not an apology. Every one names the action that fills it."
    >
      <Group title="The seven empties" note="“All caught up!” gets the celebration; the rest stay matter-of-fact.">
        <ScaledFrame scale={0.4} role="student" initial={{ ...student, screen: "myPhotos", photos: [] }} caption="No photos yet" />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ ...student, screen: "home", notifications: [], overlays: [{ id: "notifications" }] }}
          caption="No notifications"
        />
        <ScaledFrame scale={0.4} role="admin" initial={{ ...admin, screen: "review", allPhotosMode: "review", photos: [] }} caption="All caught up!" />
        <ScaledFrame scale={0.4} role="admin" initial={{ ...admin, screen: "events", events: [] }} caption="No events yet" />
        <ScaledFrame
          scale={0.4}
          role="admin"
          initial={{
            ...admin,
            screen: "review",
            allPhotosMode: "all",
            photos: noReports,
            filter: { status: "any", eventId: "any", category: "any", club: "any", uploaderId: "any", from: null, to: null, reportedOnly: true },
          }}
          caption="No removal requests"
        />
        <ScaledFrame
          scale={0.4}
          role="admin"
          initial={{
            ...admin,
            screen: "review",
            allPhotosMode: "all",
            photos: [],
            filter: { status: "any", eventId: "any", category: "any", club: "any", uploaderId: "any", from: null, to: null, reportedOnly: false },
          }}
          caption="Uploader grid with nothing in it"
          script={[{ type: "openOverlay", overlay: { id: "uploaderGrid", uploaderId: "joshua" } }]}
        />
      </Group>
    </Block>

    <Block
      eyebrow="Network"
      title="Offline and failed"
      lede="The app stays usable offline. Uploads queue, the gallery keeps working, and the promise that nothing is lost is repeated on every surface where it matters."
    >
      <Group title="Connection states" note="The offline strip is pinned above the tab bar, never a blocking modal.">
        <ScaledFrame scale={0.4} role="student" initial={{ ...student, screen: "home", network: "offline" }} caption="Offline on Home" />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            network: "offline",
            uploadPhase: "running",
            upload: {
              eventId: "intramurals-2026",
              category: "Sports",
              club: null,
              consent: true,
              items: uploadQueue(["done", "failed", "waiting"]),
            },
            overlays: [{ id: "uploadProgress" }],
          }}
          animate={false}
          caption="Upload paused offline"
        />
        <ScaledFrame scale={0.4} role="student" initial={{ ...student, screen: "myPhotos", network: "offline" }} caption="Gallery still browsable" />
      </Group>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Retry affordances" note="A retry always appears next to the thing that failed, never in a global banner.">
          <div className="space-y-2.5">
            <InlineBanner
              tone="error"
              icon={ServerCrash}
              title="Couldn't load your photos"
              message="The request timed out. Your uploads are unaffected."
              action={{ label: "Try again", icon: RefreshCw, onClick: () => undefined }}
            />
            <InlineBanner
              tone="warning"
              title="No connection. Your photos are saved and will retry."
              message="Nothing was lost. The queue resumes automatically."
              action={{ label: "Try again", icon: RefreshCw, onClick: () => undefined }}
            />
          </div>
        </Card>
        <Card title="Failure copy rules" note="Never a code, never a blame.">
          <Bullets
            tone="compact"
            items={[
              "Say what happened in plain words: “Upload interrupted”",
              "Say what is safe: “Your photos are saved”",
              "Offer exactly one action per failure",
              "Keep the failed photo in the batch until it succeeds or is removed",
            ]}
          />
        </Card>
        <Card title="Success" note="Reached only when every photo in the batch is done.">
          <ScaledFrame
            scale={0.34}
            role="student"
            initial={{
              ...student,
              screen: "upload",
              uploadPhase: "success",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: uploadQueue(["done", "done", "done"]),
              },
              overlays: [{ id: "uploadProgress" }],
            }}
            animate={false}
          />
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Upload"
      title="Upload limits and blocks"
      lede="Every reason Submit is disabled is shown inline, in the student's words, before they tap it — and the button never silently does nothing."
    >
      <Group title="Guard states" note="Rendered from the same guard the Submit button reads, so they can never disagree.">
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            upload: {
              eventId: "intramurals-2026",
              category: "Sports",
              club: null,
              consent: true,
              items: [
                { id: "g1", src: "/photos/photo-basketball.jpg", caption: "", status: "waiting", progress: 0 },
                { id: "g2", src: "/photos/photo-track-relay.jpg", caption: "", status: "waiting", progress: 0 },
              ],
            },
          }}
          caption="Ready to submit"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            upload: {
              eventId: "intramurals-2026",
              category: "Sports",
              club: "Robotics Club",
              consent: true,
              items: Array.from({ length: 9 }).map((_, index) => ({
                id: `limit-${index}`,
                src: LIBRARY_PHOTOS[index],
                caption: "",
                status: "waiting" as const,
                progress: 0,
              })),
            },
          }}
          caption="Photo limit reached"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            storageUsedMb: 199,
            upload: {
              eventId: "intramurals-2026",
              category: "Sports",
              club: null,
              consent: true,
              items: [
                { id: "g5", src: "/photos/photo-cheering-crowd.jpg", caption: "", status: "waiting", progress: 0 },
              ],
            },
          }}
          caption="Storage limit reached"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            upload: {
              eventId: "science-fair",
              category: "Academics",
              club: null,
              consent: true,
              items: [{ id: "g6", src: "/photos/photo-science-model.jpg", caption: "", status: "waiting", progress: 0 }],
            },
          }}
          caption="Deadline passed"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{
            ...student,
            screen: "upload",
            batchMessage: "Large files are resized automatically. IMG_4212.HEIC went from 12.4 MB to 3.1 MB.",
            upload: {
              eventId: "intramurals-2026",
              category: "Sports",
              club: null,
              consent: false,
              items: [
                { id: "g7", src: "/photos/photo-volleyball.jpg", caption: "", status: "waiting", progress: 0 },
                { id: "g8", src: "/photos/photo-cultural-dance.jpg", caption: "", status: "waiting", progress: 0 },
              ],
            },
          }}
          caption="Auto-compression notice"
        />
      </Group>
    </Block>

    <Block
      eyebrow="Auth and system"
      title="Blocked, expired, denied, and dark"
      lede="The unglamorous states. Section 03 shows the auth states full size; here they are side by side with the system-level ones."
    >
      <Group title="Blocked flows" note="Each one tells the person exactly which door to use instead.">
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ screen: "signin", signedIn: false, consentChecked: true, authIssue: "expired" }}
          caption="Session expired"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ screen: "signin", signedIn: false, consentChecked: true, authIssue: "nonSchool" }}
          caption="Non-school account"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ screen: "signin", signedIn: false, authIssue: "maintenance" }}
          caption="Maintenance"
        />
        <ScaledFrame
          scale={0.4}
          role="admin"
          initial={{ ...admin, screen: "review", authIssue: "denied" }}
          caption="Committee access denied"
        />
        <ScaledFrame
          scale={0.4}
          role="admin"
          initial={{ ...admin, screen: "events", authIssue: "denied" }}
          caption="Denied, second entry point"
        />
      </Group>
      <div className="mt-4">
        <Card title="Rules for blocked states" note="Hiding a door is worse than explaining it.">
          <Bullets
            items={[
              "Never show an empty committee screen without the access-denied explanation.",
              "Denied states always offer the route the account does have — My Photos.",
              "Maintenance promises that drafts are safe, because they are stored locally first.",
              "Expired sessions keep the frame mounted so returning after sign-in resumes the same screen.",
            ]}
          />
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Permissions"
      title="Camera and gallery prompts"
      lede="Permission prompts are shown before the OS dialog would appear, so the reason is always clear. Denial is a state, not a dead end."
    >
      <Group title="Three prompts, three outcomes" note="Allow and Not now carry identical weight; denial routes to the other source.">
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ ...student, screen: "upload", overlays: [{ id: "sourceChooser" }, { id: "cameraPermission" }] }}
          caption="Camera permission"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ ...student, screen: "upload", overlays: [{ id: "sourceChooser" }, { id: "galleryPermission" }] }}
          caption="Gallery permission"
        />
        <ScaledFrame
          scale={0.4}
          role="student"
          initial={{ ...student, screen: "upload", overlays: [{ id: "sourceChooser" }] }}
          caption="No permission granted yet"
        />
      </Group>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Camera" note="One photo at a time; nothing is retained on the device.">
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3.5">
            <Camera className="size-5 text-primary" aria-hidden="true" />
            <p className="text-caption text-muted-foreground">
              Denied camera → the gallery route still works, and vice versa.
            </p>
          </div>
        </Card>
        <Card title="Gallery" note="Access is scoped to the photos the student picks.">
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3.5">
            <Images className="size-5 text-primary" aria-hidden="true" />
            <p className="text-caption text-muted-foreground">
              Denied gallery → an explanation, an Open settings route, and a camera fallback.
            </p>
          </div>
        </Card>
        <Card title="Never" note="Rules the prompts obey.">
          <ul className="space-y-2">
            <li className="flex items-start gap-2.5 text-label text-muted-foreground">
              <TriangleAlert className="mt-[3px] size-4 shrink-0 text-status-pending" aria-hidden="true" />
              No pre-emptive prompt on first launch — only when the student taps Add photos.
            </li>
            <li className="flex items-start gap-2.5 text-label text-muted-foreground">
              <TriangleAlert className="mt-[3px] size-4 shrink-0 text-status-pending" aria-hidden="true" />
              No nagging after a denial; the fallback carries the flow.
            </li>
          </ul>
        </Card>
      </div>
    </Block>

    <Block eyebrow="Coverage" title="State inventory" lede="Where each state lives in the build.">
      <RowLabel>Used by</RowLabel>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "HomeSkeleton · skeletons.tsx",
          "GallerySkeleton · skeletons.tsx",
          "ReviewSkeleton · skeletons.tsx",
          "ListSkeleton · skeletons.tsx",
          "EmptyState · Feedback.tsx",
          "InlineBanner · Feedback.tsx",
          "OfflineBanner · Feedback.tsx",
          "PermissionPrompt · Feedback.tsx",
          "MaintenanceState · Feedback.tsx",
          "uploadGuard · selectors.ts",
          "AccessDeniedState · AdminBar.tsx",
          "UploadRow failed state · UploadRow.tsx",
        ].map((item) => (
          <li
            key={item}
            className="rounded-xl border border-border/70 bg-card px-3 py-2 font-mono text-caption text-muted-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </Block>
  </>
);

export default StatesPage;
