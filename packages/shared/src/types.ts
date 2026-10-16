import { z } from "zod";
import {
  PHOTO_STATUS,
  REJECTION_REASONS,
  REPORT_REASONS,
  EVENT_COVERS,
  NOTIFICATION_TYPES,
} from "./constants";

export type Id = string;
export type ISO = string;

const RefSchema = z.object({ id: z.string(), name: z.string() });
export type Ref = z.infer<typeof RefSchema>;

export type UserDTO = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "student" | "admin";
  club: Ref | null;
  notify_deadlines: boolean;
  notify_reviews: boolean;
  consented_at: ISO;
};

export type EventDTO = {
  id: Id;
  name: string;
  description: string;
  cover_key: (typeof EVENT_COVERS)[number];
  deadline: ISO;
  max_photos: number;
  is_open: boolean;
  status: "open" | "closed";
  my_photo_count?: number;
  photo_count?: number;
  created_at: ISO;
};

export type RejectionReason = (typeof REJECTION_REASONS)[number];
export type PhotoStatus = (typeof PHOTO_STATUS)[number];

export type StudentPhotoDTO = {
  id: Id;
  event: Ref;
  category: Ref;
  club: Ref | null;
  caption: string;
  created_at: ISO;
  width: number;
  height: number;
  batch_size: number;
  thumb_url: string;
  original_url: string;
  needs_replacement: boolean;
  rejection: {
    reason: RejectionReason;
    label: string;
    note: string | null;
  } | null;
};

export type TileDTO = {
  id: Id;
  thumb_url: string;
  width: number;
  height: number;
  batch_size: number;
};

export type AdminTileDTO = TileDTO & {
  status: PhotoStatus;
  reported: boolean;
};

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportDTO = {
  id: Id;
  photo_id: Id | null;
  reporter: { id: string; full_name: string };
  reason: ReportReason;
  reason_label: string;
  notes: string | null;
  status: "open" | "removed" | "dismissed";
  created_at: ISO;
  resolved_at: ISO | null;
};

/** Admin removal-request list item: ReportDTO + the photo tile (api.md §3
 *  GET /admin/reports). `photo` is null once the photo is gone. */
export type AdminReportDTO = ReportDTO & { photo: TileDTO | null };

export type AdminPhotoDTO = {
  id: Id;
  status: PhotoStatus;
  uploader: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    club: Ref | null;
  };
  event: Ref;
  category: Ref;
  club: Ref | null;
  caption: string;
  created_at: ISO;
  reviewed_at: ISO | null;
  reviewed_by: { id: string; full_name: string } | null;
  rejection: {
    reason: RejectionReason;
    label: string;
    note: string | null;
  } | null;
  consent_confirmed_at: ISO;
  width: number;
  height: number;
  batch_size: number;
  thumb_url: string;
  original_url: string;
  open_report: ReportDTO | null;
};

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationDTO = {
  id: Id;
  type: NotificationType;
  title: string;
  body: string;
  data: { photo_id?: Id; event_id?: Id; report_id?: Id };
  read: boolean;
  created_at: ISO;
};

export type Page<T> = {
  data: T[];
  next_cursor: string | null;
  meta?: any;
};
