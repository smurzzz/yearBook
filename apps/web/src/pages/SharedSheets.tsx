import { PhoneShell } from "@/prototype/PhoneShell";
import { Block, Bullets, Card, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";
import { FrameStage, FrameStageItem, ScaledFrame } from "@/components/shell/FrameStage";

const student = { signedIn: true, notificationsAsked: true } as const;
const admin = { signedIn: true, role: "admin" as const, notificationsAsked: true };

export const SharedSheets = () => (
  <>
    <SectionIntro
      index="06"
      kicker="Deliverable six"
      title="Shared sheets, dialogs and toasts"
      lede="Four sheets both roles share, five destructive dialogs, and two toast behaviours. Together with section 03's setup sheet and sections 04–05's role sheets, that is the complete surface area of the app — six screens and nothing else."
      meta={
        <>
          <Pill>14 numbered sheets</Pill>
          <Pill>5 dialogs</Pill>
          <Pill>Undo + success toasts</Pill>
          <Pill tone="admin">Role-aware copy</Pill>
        </>
      }
    />

    <Block
      eyebrow="Sheet 1"
      title="First-Time Setup"
      lede="Shown once, immediately after the very first Google sign-in. Name comes prefilled, the club is optional, and there is no role selector in sight."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              screen: "signin",
              signedIn: false,
              consentChecked: true,
              firstTimeSetupDone: false,
            }}
            script={[{ type: "googleSignIn" }]}
            caption="After the first sign-in, and only then"
            description="Complete it and the sheet never returns. Skip semantics do not exist: Get started is the only exit."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", firstTimeSetupDone: false, overlays: [{ id: "firstTimeSetup" }] }}
            caption="Reachable from Home only while unfinished"
            description="The student can still look around behind the sheet; the setup step is never a wall."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheet 2"
      title="Profile — two variants, one component"
      lede="Same sheet, same order, different content. The role badge and the third line are the only things that change, plus the notification labels the committee actually needs."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "myPhotos", overlays: [{ id: "profile" }] }}
            caption="Student profile"
            description="Avatar, Google email (read-only), Student badge, club. Dark mode, deadline reminders, review results, then legal and account actions."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "review", overlays: [{ id: "profile" }] }}
            caption="Committee profile"
            description="“Yearbook Committee” replaces the club, review results become queue updates, and the role badge is plum."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", theme: "dark", overlays: [{ id: "profile" }] }}
            caption="Profile in dark mode"
            description="The dark-mode switch inside the sheet is the same preference the whole app reads."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Sheets 3 and 4"
      title="Privacy Notice and Help / FAQ"
      lede="Both are reachable from Sign In, from Profile, and from the inline links inside the app. Both are written to be read on a phone, not skimmed past."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", overlays: [{ id: "privacy" }] }}
            caption="3 · Privacy Notice"
            description="Collection, visibility, publication, RA 10173 rights, the removal path, and retention — six sections, no legal padding."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", overlays: [{ id: "help" }] }}
            caption="4 · Help / FAQ"
            description="Collapsible answers to the six questions the committee actually gets asked: limits, replacement, deadlines, visibility, removal, clubs."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Dialogs"
      title="Five destructive confirmations"
      lede="Every one names the thing being destroyed and the consequence. Two buttons, equal width, cancel on the left, and the destructive action never sits on the right edge alone."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", dialog: "logout" }}
            caption="Log out"
            description="Explains that signing back in needs the school Google account again."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ ...student, screen: "home", dialog: "deleteAccount" }}
            caption="Delete account"
            description="States plainly that approved photos are removed from the yearbook too — this is the highest-stakes action in the app."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...student,
              screen: "myPhotos",
              overlays: [{ id: "photoViewer", photoId: "p-basketball" }],
              dialog: "deletePhoto",
              dialogPhotoId: "p-basketball",
            }}
            caption="Delete photo"
            description="Opens over the viewer, so the photo in question is still visible behind the blur."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "all",
              dialog: "removePhoto",
              dialogPhotoId: "p-campus-steps",
            }}
            caption="Remove photo (committee)"
            description="The removal-request resolution. Confirms that the reporter is notified."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{ ...admin, screen: "events", dialog: "deleteEvent", dialogEventId: "foundation-day" }}
            caption="Delete event"
            description="Names the event and the number of linked photos, computed from the data rather than hardcoded."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Toasts"
      title="Undo and success"
      lede="Approving and rejecting are reversible for as long as the toast lives. Success toasts are used for saving an event, sending a removal request, and resolving one."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "review",
              toast: {
                kind: "undo",
                title: "Approved",
                description: "Added to the yearbook selection.",
                actionLabel: "Undo",
                key: 1,
              },
            }}
            caption="Undo after Approve"
            description="Action label is the verb, and undo restores the exact previous status — including a previous rejection reason."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "review",
              allPhotosMode: "review",
              toast: {
                kind: "undo",
                title: "Rejected · Too dark",
                description: "The uploader is notified with this reason.",
                actionLabel: "Undo",
                key: 1,
              },
            }}
            caption="Undo after Reject"
            description="The reason travels with the toast, so a mis-tap is obvious before it is undone."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="admin"
            initial={{
              ...admin,
              screen: "events",
              toast: {
                kind: "success",
                title: "Event created",
                description: "Christmas Program is live for students.",
                key: 1,
              },
            }}
            caption="Success · event saved"
            description="Confirmations name the object, not the action: “Event created”, not “Saved successfully”."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              ...student,
              screen: "myPhotos",
              toast: {
                kind: "success",
                title: "Removal request sent",
                description: "The yearbook committee will review it.",
                key: 1,
              },
            }}
            caption="Success · removal requested"
            description="Tells the student what happens next and who does it."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Inventory"
      title="The complete surface list"
      lede="Fourteen numbered sheets plus system overlays. If a need does not fit one of these, it becomes a state — not a seventh screen."
    >
      <SpecTable
        head={["#", "Surface", "Role", "Spec"]}
        rows={[
          ["1", "First-Time Setup", "Student", "Name prefilled, club optional"],
          ["2", "Profile", "Both", "Two variants, one component"],
          ["3", "Privacy Notice", "Both", "Six sections incl. RA 10173"],
          ["4", "Help / FAQ", "Both", "Six collapsible answers"],
          ["5", "Notification permission", "Student", "Allow / Not now, once"],
          ["6", "Notifications", "Student", "Unread dot, mark all read, empty state"],
          ["7", "Event detail", "Student", "Rules, countdown, disabled upload when closed"],
          ["8", "Upload progress", "Student", "Per-photo rows, retry, offline, success"],
          ["9", "Photo viewer", "Student", "Swipe, zoom, overflow menu, quiet note"],
          ["10", "Request removal", "Student", "Five reasons, optional notes"],
          ["11", "Admin photo detail", "Admin", "Status actions + removal block"],
          ["12", "Reject reason", "Admin", "7 presets, note required for Other"],
          ["13", "Filter", "Admin", "8 facets + result count"],
          ["14", "Event form", "Admin", "Cover, deadline, limit, open toggle"],
          ["—", "Uploader grid", "Admin", "Read-only grid from the named uploader"],
          ["—", "Picker + permissions", "Both", "System surfaces: source, camera, gallery"],
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Sheet behaviour" note="One primitive, BottomSheet, backs all fourteen.">
          <Bullets
            tone="compact"
            items={[
              "Rendered inside the frame — never a document portal",
              "Enters 320ms, exits 240ms",
              "Handle, title, scrolling body, sticky footer",
              "Escape and backdrop both dismiss",
            ]}
          />
        </Card>
        <Card title="Stacking" note="Sheets stack deliberately: the reject reason sits over the detail sheet, removal request over the viewer.">
          <div className="flex gap-2">
            <ScaledFrame
              scale={0.34}
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
            />
            <ScaledFrame
              scale={0.34}
              role="student"
              initial={{
                ...student,
                screen: "myPhotos",
                overlays: [
                  { id: "photoViewer", photoId: "p-volleyball" },
                  { id: "requestRemoval", photoId: "p-volleyball" },
                ],
              }}
            />
          </div>
        </Card>
        <Card title="Copy rules" note="Applies to every shared surface.">
          <Bullets
            tone="compact"
            items={[
              "Confirm buttons are verbs: Delete, Remove photo, Delete event",
              "Destructive copy names the data loss, not the action type",
              "Every empty state offers the one useful next step",
              "No exclamation marks outside the “All caught up!” celebration",
            ]}
          />
        </Card>
      </div>
    </Block>
  </>
);

export default SharedSheets;
