export const LIMITS = {
  MAX_PHOTOS_PER_BATCH: 20,
  CAPTION_MAX: 200,
  EVENT_NAME_MIN: 2,
  EVENT_NAME_MAX: 80,
  EVENT_DESC_MAX: 600,
  MAX_PHOTOS_PER_EVENT_DEFAULT: 10,
  MAX_PHOTOS_PER_EVENT_MIN: 1,
  MAX_PHOTOS_PER_EVENT_MAX: 50,
  FULL_NAME_MAX: 80,
  ORIGINAL_MAX_BYTES: 5 * 1024 * 1024,
  THUMB_MAX_BYTES: 300 * 1024,
  ORIGINAL_LONG_EDGE_PX: 1920,
  ORIGINAL_JPEG_QUALITY: 0.8,
  THUMB_LONG_EDGE_PX: 480,
  THUMB_JPEG_QUALITY: 0.6,
  SIGNED_URL_TTL_S: 3600,
  UNDO_WINDOW_MS: 5000,
  PAGE_SIZE_DEFAULT: 30,
  PAGE_SIZE_MAX: 60,
  REMINDER_WINDOW_H: 48,
  COUNTDOWN_WARN_H: 72,
  INCOMPLETE_UPLOAD_TTL_H: 24,
  RECENT_UPLOADS_COUNT: 10,
  HOME_EVENTS_MAX: 10,
} as const;

export const TIMEZONE = "Asia/Manila";
export const CONSENT_VERSION = "2026-10-v1";

export const PHOTO_STATUS = ["pending", "approved", "rejected"] as const;
export const REJECTION_REASONS = [
  "blurry",
  "too_dark",
  "inappropriate",
  "duplicate",
  "wrong_event",
  "low_resolution",
  "other",
] as const;
export const REJECTION_LABELS = {
  blurry: "Blurry",
  too_dark: "Too dark",
  inappropriate: "Inappropriate",
  duplicate: "Duplicate",
  wrong_event: "Wrong event",
  low_resolution: "Low resolution",
  other: "Other",
} as const;
export const REPORT_REASONS = [
  "remove_me",
  "inappropriate",
  "wrong_tag",
  "copyright",
  "other",
] as const;
export const REPORT_LABELS = {
  remove_me: "I'm in this photo and want it removed",
  inappropriate: "Inappropriate content",
  wrong_tag: "Wrong event/tag",
  copyright: "Copyright",
  other: "Other",
} as const;
export const EVENT_COVERS = [
  "sports",
  "festival",
  "graduation",
  "science",
] as const;
export const NOTIFICATION_TYPES = [
  "photo_needs_replacement",
  "deadline_reminder",
  "report_resolved",
] as const;
export const CATEGORIES_SEED = [
  "Sports",
  "Academics",
  "Candid",
  "Graduation",
  "Clubs",
  "Culture",
  "Other",
] as const;
export const CLUBS_SEED = [
  "Drama Club",
  "Robotics Club",
  "Photography Club",
] as const;
