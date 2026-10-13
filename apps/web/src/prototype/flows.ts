import { EVENTS, LIBRARY_PHOTOS } from "./data";
import { emptyFilter } from "./selectors";
import type { Action } from "./reducer";
import type { PrototypeState, UploadItem } from "./types";

/* =========================================================================
   The 7 clickable prototype flows, written as pure action scripts.
   Every flow is replayed from step 0, so a flow is deterministic and each
   step is deep-linkable: /flows?flow=upload&step=4
   ========================================================================= */

export interface FlowStep {
  label: string;
  detail: string;
  /** Replayed in order on mount. Empty = a "read this" step. */
  actions: Action[];
  /** Needs a tap inside the frame (local UI state the script cannot reach). */
  manual?: boolean;
}

export interface Flow {
  id: string;
  title: string;
  summary: string;
  start: Partial<PrototypeState>;
  steps: FlowStep[];
}

export const uploadQueue = (
  statuses: UploadItem["status"][],
  captions: string[] = [],
): UploadItem[] =>
  statuses.map((status, index) => ({
    id: `flow-u-${index}`,
    src: LIBRARY_PHOTOS[index + 4] ?? LIBRARY_PHOTOS[index],
    caption: captions[index] ?? "",
    status,
    progress: status === "done" ? 100 : status === "failed" ? 60 : status === "uploading" ? 42 : 0,
    failNote: status === "failed" ? "Interrupted" : undefined,
    willFail: false,
  }));

const partyEvent = {
  id: "event-christmas-program",
  name: "Christmas Program",
  description:
    "The grade-level Christmas program in the gymnasium — performances, the lighting of the tree, and the class photo at the end.",
  cover: EVENTS[1].cover,
  deadline: new Date(Date.now() + 12 * 86_400_000).toISOString(),
  open: true,
  maxPhotosPerUser: 10,
  rules: [
    "Up to 10 photos per student",
    "Stage performances and the tree lighting",
    "Get permission from everyone in the photo",
  ],
};

export const FLOWS: Flow[] = [
  {
    id: "first-use",
    title: "1 · First use",
    summary:
      "Consent, Google sign-in, first-time setup, then the notification permission prompt on the first bell tap.",
    start: {
      role: "student",
      screen: "signin",
      signedIn: false,
      consentChecked: false,
      firstTimeSetupDone: false,
    },
    steps: [
      {
        label: "Read the Privacy Notice",
        detail:
          "The link inside the consent sentence opens the Privacy Notice sheet — the same sheet you can reach later from Profile.",
        actions: [{ type: "openOverlay", overlay: { id: "privacy" } }],
      },
      {
        label: "Agree to the notice",
        detail:
          "Close the sheet and tick the box. Until this is checked, Continue with Google stays disabled.",
        actions: [{ type: "closeOverlays" }, { type: "setConsent", value: true }],
      },
      {
        label: "Continue with Google",
        detail:
          "The only way in: no email field, no password, no register toggle. First sign-in leads straight into setup.",
        actions: [{ type: "googleSignIn" }],
      },
      {
        label: "Complete first-time setup",
        detail:
          "Name prefilled from the Google account, club optional. Committee access is never offered here.",
        actions: [
          { type: "finishSetup", name: "Mikaela Reyes", club: "Robotics Club" },
        ],
      },
      {
        label: "First bell tap",
        detail:
          "Home opens with a preview of what you get notified about — deadline reminders and review results.",
        actions: [{ type: "openOverlay", overlay: { id: "notifPermission" } }],
      },
      {
        label: "Allow notifications",
        detail: "The bell now opens the real notification list, with an unread dot when something is new.",
        actions: [{ type: "setNotifications", enabled: true }],
      },
      {
        label: "Open the notification list",
        detail:
          "Two unread items: the Intramurals deadline and a photo that needs replacing.",
        actions: [{ type: "openOverlay", overlay: { id: "notifications" } }],
      },
    ],
  },
  {
    id: "upload",
    title: "2 · Upload a batch",
    summary:
      "Pick photos, tag them, confirm consent, submit — one upload fails and is retried, then the success state.",
    start: { role: "student", screen: "upload", signedIn: true },
    steps: [
      {
        label: "Add photos",
        detail: "Camera or gallery, up to 20 in one batch. Both routes start here.",
        actions: [{ type: "openOverlay", overlay: { id: "sourceChooser" } }],
      },
      {
        label: "Choose from gallery",
        detail: "The gallery asks for photo access first — nothing is uploaded until you submit.",
        actions: [{ type: "openOverlay", overlay: { id: "galleryPermission" } }],
      },
      {
        label: "Allow access",
        detail: "The system picker opens over the app.",
        actions: [{ type: "openOverlay", overlay: { id: "libraryPicker" } }],
      },
      {
        label: "Select 5 photos",
        detail:
          "Multi-select with a running counter. Each thumbnail carries a remove (x) so a batch can be corrected before submitting.",
        actions: [
          {
            type: "addUploadItems",
            srcs: [
              LIBRARY_PHOTOS[0],
              LIBRARY_PHOTOS[2],
              LIBRARY_PHOTOS[3],
              LIBRARY_PHOTOS[4],
              LIBRARY_PHOTOS[5],
            ],
          },
          { type: "goto", screen: "upload" },
        ],
      },
      {
        label: "Tag the batch",
        detail:
          "Event is required and only lists open events. Category is required, club is optional, captions are per photo.",
        actions: [
          { type: "setUploadField", field: "eventId", value: "intramurals-2026" },
          { type: "setUploadField", field: "category", value: "Sports" },
          { type: "setUploadField", field: "club", value: "Robotics Club" },
        ],
      },
      {
        label: "Add a caption",
        detail:
          "Tap any thumbnail to open the caption editor for that photo — the first one, \"Last leg of the 4x100\", is written in here.",
        actions: [
          { type: "setUploadCaption", id: "flow-u-0", caption: "Last leg of the 4x100 relay." },
          { type: "setUploadCaption", id: "flow-u-1", caption: "Bench reaction after the buzzer beater." },
        ],
      },
      {
        label: "Confirm permission",
        detail:
          "Submit stays disabled until this box is ticked — the same rule as the Sign In consent.",
        actions: [{ type: "toggleUploadConsent" }],
      },
      {
        label: "Submit and watch the queue",
        detail:
          "Per-photo rows move through Waiting, Compressing, Uploading and Done. One photo fails with a Retry button, and the overall bar shows 4 of 5.",
        actions: [
          {
            type: "hydrate",
            patch: {
              uploadPhase: "running",
              upload: {
                eventId: "intramurals-2026",
                category: "Sports",
                club: "Robotics Club",
                consent: true,
                items: uploadQueue(
                  ["done", "failed", "done", "uploading", "waiting"],
                  [
                    "Last leg of the 4x100 relay.",
                    "Bench reaction after the buzzer beater.",
                    "",
                    "",
                    "",
                  ],
                ),
              },
              overlays: [{ id: "uploadProgress" }],
            },
          },
        ],
      },
      {
        label: "Retry all failed",
        detail: "The failed photo rejoins the queue, finishes, and the batch commits to My Photos.",
        actions: [{ type: "retryFailed" }],
      },
      {
        label: "View my photos",
        detail:
          "The five new photos are already in the grid, newest first. No status anywhere on a student screen.",
        actions: [{ type: "resetUpload" }, { type: "goto", screen: "myPhotos" }],
      },
    ],
  },
  {
    id: "rejection",
    title: "3 · Rejection recovery",
    summary:
      "A student learns about a rejection only through a notification, then replaces the photo from a quiet note inside the viewer.",
    start: { role: "student", screen: "home", signedIn: true, notificationsAsked: true },
    steps: [
      {
        label: "The notification arrives",
        detail: "“Your photo needs a new photo: Blurry” — no status label, no queue, no badge.",
        actions: [{ type: "openOverlay", overlay: { id: "notifications" } }],
      },
      {
        label: "Open the photo",
        detail: "Tapping the item jumps straight into that photo in the viewer.",
        actions: [
          { type: "markAllRead" },
          { type: "closeOverlays" },
          { type: "openOverlay", overlay: { id: "photoViewer", photoId: "p-foundation-booth" } },
        ],
      },
      {
        label: "The quiet note",
        detail:
          "One card explains what is wrong and offers a single action. Nothing else in the viewer hints that the photo was reviewed.",
        actions: [],
      },
      {
        label: "Replace photo",
        detail: "The event, category and club are carried over, so only the shot itself changes.",
        actions: [
          { type: "setUploadField", field: "eventId", value: "foundation-day" },
          { type: "setUploadField", field: "category", value: "Candid" },
          { type: "closeOverlays" },
          { type: "openOverlay", overlay: { id: "sourceChooser" } },
        ],
      },
      {
        label: "Choose from gallery",
        detail: "Straight to the picker — photo access was already granted on the first upload.",
        actions: [{ type: "openOverlay", overlay: { id: "libraryPicker" } }],
      },
      {
        label: "Pick the replacement",
        detail: "One tap selects the better shot; the tags come back prefilled.",
        actions: [
          { type: "addUploadItems", srcs: [LIBRARY_PHOTOS[13]] },
          { type: "goto", screen: "upload" },
        ],
      },
      {
        label: "Submit the replacement",
        detail: "It enters the review queue again as a brand new submission.",
        actions: [{ type: "toggleUploadConsent" }, { type: "startUpload" }],
      },
    ],
  },
  {
    id: "admin-review",
    title: "4 · Committee review",
    summary:
      "One photo at a time: approve, move to the next, reject with a reason, then undo straight from the toast.",
    start: { role: "admin", screen: "review", signedIn: true, notificationsAsked: true },
    steps: [
      {
        label: "The pending queue",
        detail:
          "Six photos are waiting. The event filter narrows the deck; the swipe (or arrow keys) moves between photos.",
        actions: [],
      },
      {
        label: "Approve",
        detail:
          "The photo leaves the queue immediately, the counter advances, and an Undo toast appears.",
        actions: [{ type: "approve", photoId: "p-robotics-build" }],
      },
      {
        label: "The next photo is already up",
        detail: "Because the queue shrinks, index 1 of 6 is now the second photo — no extra tap needed.",
        actions: [],
      },
      {
        label: "Reject it",
        detail: "Reject opens the reason sheet with preset chips and a note field.",
        actions: [{ type: "openOverlay", overlay: { id: "rejectReason", photoId: "p-science-model" } }],
      },
      {
        label: "Pick a reason",
        detail: "Tap “Too dark” in the sheet. The note is only required when you pick Other.",
        actions: [],
        manual: true,
      },
      {
        label: "Confirm reject",
        detail:
          "The uploader gets a notification with the reason, and the committee gets the same Undo affordance.",
        actions: [{ type: "reject", photoId: "p-science-model", reason: "Too dark" }],
      },
      {
        label: "Undo from the toast",
        detail: "Both photo actions are reversible for as long as the toast is on screen.",
        actions: [{ type: "undo" }],
      },
    ],
  },
  {
    id: "events",
    title: "5 · Create an event",
    summary:
      "The committee creates an event; it appears on the student Home screen immediately, marked Open with the full countdown.",
    start: { role: "admin", screen: "events", signedIn: true, notificationsAsked: true },
    steps: [
      {
        label: "New event",
        detail:
          "Events is the only committee tab besides Review. Cards carry the cover, deadline, Open/Closed badge and submission count.",
        actions: [{ type: "openOverlay", overlay: { id: "eventForm" } }],
      },
      {
        label: "Fill in the form",
        detail:
          "Name, description, cover, deadline with time, max photos per student, and the open toggle. Everything is editable in the frame.",
        actions: [],
        manual: true,
      },
      {
        label: "Save",
        detail:
          "The sheet closes and a success toast confirms; the new event sorts into the list by deadline.",
        actions: [{ type: "saveEvent", event: partyEvent }],
      },
      {
        label: "Now look at the student app",
        detail:
          "Switching to the student role shows Christmas Program on Home as Open, with a countdown chip and the event detail sheet behind it.",
        actions: [
          { type: "setRole", role: "student" },
          { type: "openOverlay", overlay: { id: "eventDetail", eventId: "event-christmas-program" } },
        ],
      },
    ],
  },
  {
    id: "report",
    title: "6 · Removal request",
    summary:
      "A student asks for their own photo to be taken out; the committee resolves it from the Reported filter.",
    start: { role: "student", screen: "myPhotos", signedIn: true, notificationsAsked: true },
    steps: [
      {
        label: "Open one of my photos",
        detail: "My Photos is private to the student and the committee — there is no public feed.",
        actions: [{ type: "openOverlay", overlay: { id: "photoViewer", photoId: "p-volleyball" } }],
      },
      {
        label: "Request removal",
        detail: "The overflow menu holds Edit caption and tags, Request removal, and Delete photo.",
        actions: [{ type: "openOverlay", overlay: { id: "requestRemoval", photoId: "p-volleyball" } }],
      },
      {
        label: "Send the request",
        detail: "Pick a reason, add a note, submit — the committee is notified right away.",
        actions: [
          {
            type: "requestRemoval",
            photoId: "p-volleyball",
            reason: "I'm in this photo and want it removed",
            notes: "Please use the shot from the sideline instead.",
          },
        ],
      },
      {
        label: "Switch to the committee app",
        detail: "All photos mode shows every submission, with status icons and a Reported badge.",
        actions: [
          { type: "setRole", role: "admin" },
          { type: "setAllPhotosMode", mode: "all" },
        ],
      },
      {
        label: "Filter to Reported",
        detail: "The filter is one tap away, and the active-filter chip can clear it again.",
        actions: [{ type: "applyFilter", filter: { ...emptyFilter, reportedOnly: true } }],
      },
      {
        label: "Open the reported photo",
        detail:
          "The detail sheet shows the reporter, the reason, the date and their note, with Remove photo and Dismiss.",
        actions: [{ type: "openOverlay", overlay: { id: "adminPhotoDetail", photoId: "p-volleyball" } }],
      },
      {
        label: "Remove photo",
        detail: "Destructive actions always confirm first.",
        actions: [{ type: "openDialog", dialog: "removePhoto", photoId: "p-volleyball" }],
      },
      {
        label: "Confirm",
        detail: "The photo leaves the selection and the student who asked is notified.",
        actions: [{ type: "removeReportedPhoto", photoId: "p-volleyball" }],
      },
    ],
  },
  {
    id: "deadline",
    title: "7 · After the deadline",
    summary:
      "A closed event explains itself instead of hiding the upload button: the countdown reads Closed and Upload stays disabled with a reason.",
    start: { role: "student", screen: "home", signedIn: true, notificationsAsked: true },
    steps: [
      {
        label: "The closed event on Home",
        detail:
          "Science Fair reads Closed in the countdown chip and “Submissions closed” in the card footer — icon plus label, never colour alone.",
        actions: [{ type: "openOverlay", overlay: { id: "eventDetail", eventId: "science-fair" } }],
      },
      {
        label: "The event detail explains it",
        detail:
          "The upload button is disabled and the sheet says when submissions stopped and who to ask for an extension.",
        actions: [],
      },
      {
        label: "Upload with a closed event selected",
        detail:
          "Even if an event closes while a batch is being prepared, the Submit button stays disabled and the reason is spelled out inline.",
        actions: [
          { type: "goto", screen: "upload" },
          {
            type: "hydrate",
            patch: {
              upload: {
                eventId: "science-fair",
                category: "Academics",
                club: null,
                consent: true,
                items: uploadQueue(["waiting", "waiting"]),
              },
            },
          },
        ],
      },
      {
        label: "Back to Home",
        detail: "Everything already submitted stays visible — closing an event never deletes work.",
        actions: [{ type: "resetUpload" }, { type: "goto", screen: "home" }],
      },
    ],
  },
];

export const flowById = (id: string) => FLOWS.find((flow) => flow.id === id) ?? FLOWS[0];

/** Every action needed to reach `step`, replayed from a clean frame. */
export const scriptFor = (flow: Flow, step: number) =>
  flow.steps.slice(0, step + 1).flatMap((flowStep) => flowStep.actions);

export const clampStep = (flow: Flow, step: number) =>
  Math.max(0, Math.min(step, flow.steps.length - 1));
