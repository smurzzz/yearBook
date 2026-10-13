import type {
  EventItem,
  NotificationItem,
  Person,
  PhotoItem,
} from "./types";

/* =========================================================================
   Realistic sample content. Deadlines are generated relative to "today" so
   the countdown chips are always truthful; every count in the UI is derived
   from these records rather than hardcoded.
   ========================================================================= */

const NOW = new Date();

const daysOut = (days: number, hour = 23, minute = 59) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

export const SCHOOL_NAME = "St. Michael's Academy";
export const SCHOOL_DOMAIN = "student.stmichaels.edu.ph";

/* --------------------------------- People -------------------------------- */

export const PEOPLE: Person[] = [
  {
    id: "mikaela",
    name: "Mikaela Reyes",
    email: `mikaela.reyes@${SCHOOL_DOMAIN}`,
    avatar: "/photos/avatar-mikaela.jpg",
    club: "Robotics Club",
    role: "student",
  },
  {
    id: "daniel",
    name: "Daniel Cruz",
    email: `daniel.cruz@${SCHOOL_DOMAIN}`,
    avatar: "/photos/avatar-daniel.jpg",
    role: "admin",
  },
  {
    id: "joshua",
    name: "Joshua Villanueva",
    email: `joshua.villanueva@${SCHOOL_DOMAIN}`,
    avatar: "/photos/avatar-joshua.jpg",
    club: "Drama Club",
    role: "student",
  },
  {
    id: "alyssa",
    name: "Alyssa Mendoza",
    email: `alyssa.mendoza@${SCHOOL_DOMAIN}`,
    avatar: "/photos/avatar-alyssa.jpg",
    club: "Photography Club",
    role: "student",
  },
  {
    id: "miguel",
    name: "Miguel Torres",
    email: `miguel.torres@${SCHOOL_DOMAIN}`,
    avatar: "/photos/avatar-miguel.jpg",
    club: "Robotics Club",
    role: "student",
  },
];

export const STUDENT_ID = "mikaela";
export const ADMIN_ID = "daniel";

export const personById = (id: string): Person =>
  PEOPLE.find((p) => p.id === id) ?? PEOPLE[0];

/* --------------------------------- Events -------------------------------- */

export const EVENTS: EventItem[] = [
  {
    id: "intramurals-2026",
    name: "Intramurals 2026",
    description:
      "Three days of inter-section sports across the court, the field, and the gym. We are after action shots, team huddles, and candid sideline moments for the Sports chapter.",
    cover: "/photos/cover-intramurals.jpg",
    deadline: daysOut(2),
    open: true,
    maxPhotosPerUser: 12,
    rules: [
      "Up to 12 photos per student",
      "Action and candid shots preferred over posed line-ups",
      "Portrait or landscape both welcome",
      "No screenshots or downloaded images",
    ],
  },
  {
    id: "foundation-day",
    name: "Foundation Day",
    description:
      "The 48th Foundation Day — the parade of nations, club booths along the quadrangle, and the evening cultural program under the string lights.",
    cover: "/photos/cover-foundation-day.jpg",
    deadline: daysOut(9),
    open: true,
    maxPhotosPerUser: 10,
    rules: [
      "Up to 10 photos per student",
      "Tag your club if the photo is from a club booth or showcase",
      "Make sure faces are clear and well lit",
      "Do not upload photos of the same moment twice",
    ],
  },
  {
    id: "graduation-rites",
    name: "Graduation Rites",
    description:
      "Class of 2026 commencement in the gymnasium. Caps, diplomas, and the family photos taken right after the ceremony.",
    cover: "/photos/cover-graduation.jpg",
    deadline: daysOut(21),
    open: true,
    maxPhotosPerUser: 8,
    rules: [
      "Up to 8 photos per student",
      "Ceremony and post-ceremony photos only",
      "Group photos are allowed if everyone in them agrees",
      "Ask before uploading photos of other families",
    ],
  },
  {
    id: "science-fair",
    name: "Science Fair",
    description:
      "Section exhibits and student prototypes judged in the gym. Close-ups of the projects and the presentation moments work best for the Academics spread.",
    cover: "/photos/cover-science-fair.jpg",
    deadline: daysOut(-3),
    open: false,
    maxPhotosPerUser: 2,
    rules: [
      "Up to 2 photos per student",
      "Project close-ups and presentation shots",
      "No photos of written answers on the boards",
    ],
  },
];

export const eventById = (id: string): EventItem =>
  EVENTS.find((e) => e.id === id) ?? EVENTS[0];

/* --------------------------------- Photos -------------------------------- */

export const PHOTOS: PhotoItem[] = [
  {
    id: "p-basketball",
    src: "/photos/photo-basketball.jpg",
    caption: "Fourth quarter, one-point game — the whole bench was on its feet.",
    eventId: "intramurals-2026",
    category: "Sports",
    uploaderId: "mikaela",
    status: "approved",
    uploadedAt: hoursAgo(30),
    consentConfirmed: true,
  },
  {
    id: "p-track-relay",
    src: "/photos/photo-track-relay.jpg",
    caption: "Last leg of the 4x100. The handoff was clean this time.",
    eventId: "intramurals-2026",
    category: "Sports",
    uploaderId: "mikaela",
    status: "pending",
    uploadedAt: hoursAgo(30),
    batchId: "batch-mikaela-intramurals",
    consentConfirmed: true,
  },
  {
    id: "p-volleyball",
    src: "/photos/photo-volleyball.jpg",
    caption: "Senior setter going up for the spike at the net.",
    eventId: "intramurals-2026",
    category: "Sports",
    uploaderId: "mikaela",
    status: "pending",
    uploadedAt: hoursAgo(30),
    batchId: "batch-mikaela-intramurals",
    consentConfirmed: true,
  },
  {
    id: "p-cheering-crowd",
    src: "/photos/photo-cheering-crowd.jpg",
    caption: "Grade 11 stands during the championship round.",
    eventId: "intramurals-2026",
    category: "Candid",
    uploaderId: "mikaela",
    status: "approved",
    uploadedAt: hoursAgo(29),
    consentConfirmed: true,
  },
  {
    id: "p-foundation-parade",
    src: "/photos/photo-foundation-parade.jpg",
    caption: "Parade of nations — the drum line led the whole line.",
    eventId: "foundation-day",
    category: "Culture",
    uploaderId: "mikaela",
    status: "approved",
    uploadedAt: hoursAgo(52),
    consentConfirmed: true,
  },
  {
    id: "p-foundation-booth",
    src: "/photos/photo-foundation-booth.jpg",
    caption: "Our club booth during the lunch rush.",
    eventId: "foundation-day",
    category: "Candid",
    uploaderId: "mikaela",
    status: "rejected",
    rejectReason: "Blurry",
    uploadedAt: hoursAgo(53),
    consentConfirmed: true,
  },
  {
    id: "p-campus-steps",
    src: "/photos/photo-campus-steps.jpg",
    caption: "Waiting for the program to start on the front steps.",
    eventId: "foundation-day",
    category: "Candid",
    uploaderId: "mikaela",
    status: "pending",
    uploadedAt: hoursAgo(54),
    consentConfirmed: true,
    removalRequest: {
      reporterId: "mikaela",
      reason: "I'm in this photo and want it removed",
      notes: "Please use the shot from the side instead — my eyes are closed here.",
      requestedAt: hoursAgo(20),
    },
  },
  {
    id: "p-cultural-dance",
    src: "/photos/photo-cultural-dance.jpg",
    caption: "Folk dance finale under the string lights.",
    eventId: "foundation-day",
    category: "Culture",
    uploaderId: "joshua",
    status: "approved",
    uploadedAt: hoursAgo(51),
    consentConfirmed: true,
  },
  {
    id: "p-drama-rehearsal",
    src: "/photos/photo-drama-rehearsal.jpg",
    caption: "Drama Club tech rehearsal before the evening showcase.",
    eventId: "foundation-day",
    category: "Clubs",
    club: "Drama Club",
    uploaderId: "joshua",
    status: "rejected",
    rejectReason: "Too dark",
    uploadedAt: hoursAgo(50),
    consentConfirmed: true,
  },
  {
    id: "p-photography-club",
    src: "/photos/photo-photography-club.jpg",
    caption: "Photography Club covering the booths at golden hour.",
    eventId: "foundation-day",
    category: "Clubs",
    club: "Photography Club",
    uploaderId: "alyssa",
    status: "pending",
    uploadedAt: hoursAgo(48),
    consentConfirmed: true,
  },
  {
    id: "p-caps-tossed",
    src: "/photos/photo-caps-tossed.jpg",
    caption: "Caps up! Class of 2026.",
    eventId: "graduation-rites",
    category: "Graduation",
    uploaderId: "mikaela",
    status: "approved",
    uploadedAt: hoursAgo(18),
    consentConfirmed: true,
  },
  {
    id: "p-diploma",
    src: "/photos/photo-diploma.jpg",
    caption: "Receiving the diploma on stage.",
    eventId: "graduation-rites",
    category: "Graduation",
    uploaderId: "alyssa",
    status: "approved",
    uploadedAt: hoursAgo(17),
    consentConfirmed: true,
  },
  {
    id: "p-graduation-family",
    src: "/photos/photo-graduation-family.jpg",
    caption: "Tita flew in for this one.",
    eventId: "graduation-rites",
    category: "Candid",
    uploaderId: "alyssa",
    status: "approved",
    uploadedAt: hoursAgo(16),
    consentConfirmed: true,
  },
  {
    id: "p-science-model",
    src: "/photos/photo-science-model.jpg",
    caption: "Working prototype of the water-level alarm.",
    eventId: "science-fair",
    category: "Academics",
    uploaderId: "mikaela",
    status: "pending",
    uploadedAt: hoursAgo(8),
    consentConfirmed: true,
  },
  {
    id: "p-science-present",
    src: "/photos/photo-science-present.jpg",
    caption: "Presenting to the judges after two weeks of practice.",
    eventId: "science-fair",
    category: "Academics",
    uploaderId: "miguel",
    status: "approved",
    uploadedAt: hoursAgo(7),
    consentConfirmed: true,
  },
  {
    id: "p-robotics-build",
    src: "/photos/photo-robotics-build.jpg",
    caption: "Line-following robot, third rebuild. It finally turned.",
    eventId: "science-fair",
    category: "Clubs",
    club: "Robotics Club",
    uploaderId: "miguel",
    status: "pending",
    uploadedAt: hoursAgo(6),
    consentConfirmed: true,
  },
];

export const photoById = (id: string, photos: PhotoItem[]): PhotoItem | undefined =>
  photos.find((p) => p.id === id);

/** The device photo library the mock picker reads from. */
export const LIBRARY_PHOTOS: string[] = [
  "/photos/photo-basketball.jpg",
  "/photos/photo-track-relay.jpg",
  "/photos/photo-volleyball.jpg",
  "/photos/photo-cheering-crowd.jpg",
  "/photos/photo-cultural-dance.jpg",
  "/photos/photo-drama-rehearsal.jpg",
  "/photos/photo-robotics-build.jpg",
  "/photos/photo-photography-club.jpg",
  "/photos/photo-caps-tossed.jpg",
  "/photos/photo-diploma.jpg",
  "/photos/photo-graduation-family.jpg",
  "/photos/photo-science-model.jpg",
  "/photos/photo-science-present.jpg",
  "/photos/photo-foundation-parade.jpg",
  "/photos/photo-foundation-booth.jpg",
  "/photos/photo-campus-steps.jpg",
  "/photos/cover-intramurals.jpg",
  "/photos/cover-foundation-day.jpg",
];

/* ----------------------------- Notifications ----------------------------- */

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    kind: "deadline",
    title: "Intramurals 2026 closes in 2 days",
    body: "Submit your best shots from the court and the field before the deadline.",
    at: hoursAgo(3),
    read: false,
  },
  {
    id: "n-2",
    kind: "review",
    title: "Your photo needs a new photo: Blurry",
    body: "Foundation Day · Candid. Open it to replace the photo.",
    at: hoursAgo(21),
    read: false,
    photoId: "p-foundation-booth",
  },
  {
    id: "n-3",
    kind: "removal",
    title: "Your removal request was resolved",
    body: "Campus Steps is out of the yearbook selection.",
    at: hoursAgo(26),
    read: true,
    photoId: "p-campus-steps",
  },
  {
    id: "n-4",
    kind: "deadline",
    title: "Foundation Day submissions are open",
    body: "Up to 10 photos per student. Club booths count as Candid.",
    at: hoursAgo(72),
    read: true,
  },
  {
    id: "n-5",
    kind: "review",
    title: "3 of your photos were approved",
    body: "They are now with the layout team for the Sports chapter.",
    at: hoursAgo(96),
    read: true,
  },
];

/* --------------------------------- Copy ---------------------------------- */

export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: "What we collect",
    body: "Your school Google account name and email, the photos you upload, and the tags you add (event, category, and optional club). We do not collect your contacts, location, or any other album on your phone.",
  },
  {
    title: "Who can see your photos",
    body: `Only you and the Yearbook Committee of ${SCHOOL_NAME} can see a photo you upload. There is no public feed, and no other student can browse or search your photos.`,
  },
  {
    title: "What gets published",
    body: "Photos the committee approves may be printed in the yearbook and used in the official school social media posts. Your name is credited only if you added a caption that includes it.",
  },
  {
    title: "Your rights (RA 10173)",
    body: "Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to be informed, to object, to access, to rectify, and to erase your personal data. Consent can be withdrawn at any time.",
  },
  {
    title: "Requesting removal",
    body: "Open the photo, tap the menu, and choose Request removal. The committee reviews every request and takes the photo out of the selection. You can also delete your own photo at any time, which removes it immediately.",
  },
  {
    title: "How long we keep photos",
    body: "Submissions are stored until the yearbook is published and archived, about 12 months after the school year ends. After that they are deleted from our storage.",
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: "How many photos can I upload?",
    a: "Up to 20 photos in one batch, and the limit set for each event (usually 8 to 12 photos per student). The Upload screen shows your remaining slots for the event you pick.",
  },
  {
    q: "Why does a photo need to be replaced?",
    a: "The committee may ask for a new photo if the shot is blurry, too dark, a duplicate, or tagged to the wrong event. You will get a notification with the reason, and the photo viewer shows a Replace photo button.",
  },
  {
    q: "What happens when a deadline passes?",
    a: "The event closes automatically at its deadline. You can still browse what you submitted, but new uploads are disabled and the event shows a Closed badge. Ask a committee member if you need an extension.",
  },
  {
    q: "Can other students see my photos?",
    a: "No. Only you and the Yearbook Committee can see your submissions before publication, and there is no public feed inside the app.",
  },
  {
    q: "How do I get my photo removed?",
    a: "Open the photo, tap the overflow menu, and choose Request removal. Pick a reason and optionally add a note. The committee is notified right away and resolves it from the All photos view.",
  },
  {
    q: "Do I need to be in a club?",
    a: "No. Club is an optional tag used to group photos in the yearbook. Leave it as None if the photo is not from a club activity.",
  },
];

export const FIRST_TIME_SETUP_CLUBS_NOTE =
  "Clubs are optional. You can change this later from your profile.";

export const STUDENT_VISIBILITY_NOTE =
  "Only you and the yearbook committee can see your photos.";
