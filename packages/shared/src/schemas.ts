import { z } from "zod";
import {
  PHOTO_STATUS,
  REJECTION_REASONS,
  REPORT_REASONS,
  EVENT_COVERS,
  LIMITS,
  NOTIFICATION_TYPES,
} from "./constants";

export const IdSchema = z.string();
export const IsoSchema = z.string().datetime({ offset: true }).or(z.string());

export const RefSchema = z.object({ id: IdSchema, name: z.string() });

export const UserDTOSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().min(1).max(LIMITS.FULL_NAME_MAX),
  avatar_url: z.string().url().nullable(),
  role: z.enum(["student", "admin"]),
  club: RefSchema.nullable(),
  notify_deadlines: z.boolean(),
  notify_reviews: z.boolean(),
  consented_at: IsoSchema,
});

export const EventDTOSchema = z.object({
  id: IdSchema,
  name: z.string().min(LIMITS.EVENT_NAME_MIN).max(LIMITS.EVENT_NAME_MAX),
  description: z.string().max(LIMITS.EVENT_DESC_MAX),
  cover_key: z.enum(EVENT_COVERS as unknown as [string, ...string[]]),
  deadline: IsoSchema,
  max_photos: z
    .number()
    .int()
    .min(LIMITS.MAX_PHOTOS_PER_EVENT_MIN)
    .max(LIMITS.MAX_PHOTOS_PER_EVENT_MAX),
  is_open: z.boolean(),
  status: z.enum(["open", "closed"]),
  my_photo_count: z.number().int().optional(),
  photo_count: z.number().int().optional(),
  created_at: IsoSchema,
});

export const RejectionSchema = z.object({
  reason: z.enum(REJECTION_REASONS as unknown as [string, ...string[]]),
  label: z.string(),
  note: z.string().nullable(),
});

export const StudentPhotoDTOSchema = z.object({
  id: IdSchema,
  event: RefSchema,
  category: RefSchema,
  club: RefSchema.nullable(),
  caption: z.string().max(LIMITS.CAPTION_MAX),
  created_at: IsoSchema,
  width: z.number().int(),
  height: z.number().int(),
  batch_size: z.number().int(),
  thumb_url: z.string().url(),
  original_url: z.string().url(),
  needs_replacement: z.boolean(),
  rejection: RejectionSchema.nullable(),
});

export const TileDTOSchema = z.object({
  id: IdSchema,
  thumb_url: z.string().url(),
  width: z.number().int(),
  height: z.number().int(),
  batch_size: z.number().int(),
});

export const AdminTileDTOSchema = TileDTOSchema.extend({
  status: z.enum(PHOTO_STATUS as unknown as [string, ...string[]]),
  reported: z.boolean(),
});

export const ReportDTOSchema = z.object({
  id: IdSchema,
  photo_id: IdSchema.nullable(),
  reporter: z.object({ id: z.string(), full_name: z.string() }),
  reason: z.enum(REPORT_REASONS as unknown as [string, ...string[]]),
  reason_label: z.string(),
  notes: z.string().nullable(),
  status: z.enum(["open", "removed", "dismissed"]),
  created_at: IsoSchema,
  resolved_at: IsoSchema.nullable(),
});

export const AdminReportDTOSchema = ReportDTOSchema.extend({
  photo: TileDTOSchema.nullable(),
});

export const AdminPhotoDTOSchema = z.object({
  id: IdSchema,
  status: z.enum(PHOTO_STATUS as unknown as [string, ...string[]]),
  uploader: z.object({
    id: z.string(),
    full_name: z.string(),
    email: z.string().email(),
    avatar_url: z.string().url().nullable(),
    club: RefSchema.nullable(),
  }),
  event: RefSchema,
  category: RefSchema,
  club: RefSchema.nullable(),
  caption: z.string().max(LIMITS.CAPTION_MAX),
  created_at: IsoSchema,
  reviewed_at: IsoSchema.nullable(),
  reviewed_by: z.object({ id: z.string(), full_name: z.string() }).nullable(),
  rejection: RejectionSchema.nullable(),
  consent_confirmed_at: IsoSchema,
  width: z.number().int(),
  height: z.number().int(),
  batch_size: z.number().int(),
  thumb_url: z.string().url(),
  original_url: z.string().url(),
  open_report: ReportDTOSchema.nullable(),
});

export const NotificationDTOSchema = z.object({
  id: IdSchema,
  type: z.enum(NOTIFICATION_TYPES as unknown as [string, ...string[]]),
  title: z.string(),
  body: z.string(),
  data: z.object({
    photo_id: IdSchema.optional(),
    event_id: IdSchema.optional(),
    report_id: IdSchema.optional(),
  }),
  read: z.boolean(),
  created_at: IsoSchema,
});

// request schemas
export const MeCreateSchema = z.object({
  full_name: z.string().min(1).max(LIMITS.FULL_NAME_MAX),
  club_id: z.string().uuid().nullable().optional(),
  consent: z.literal(true),
  NOTIFICATION_TYPES: z.string(),
});

export const MePatchSchema = z.object({
  full_name: z.string().min(1).max(LIMITS.FULL_NAME_MAX).optional(),
  club_id: z.string().uuid().nullable().optional(),
  notify_deadlines: z.boolean().optional(),
  notify_reviews: z.boolean().optional(),
});

export const UploadIntentFileSchema = z.object({
  client_id: z.string().uuid(),
  caption: z.string().max(LIMITS.CAPTION_MAX).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  original_bytes: z.number().int().positive(),
  thumb_bytes: z.number().int().positive(),
});

export const UploadIntentsSchema = z.object({
  event_id: z.string().uuid(),
  category_id: z.string().uuid(),
  club_id: z.string().uuid().nullable().optional(),
  consent: z.literal(true),
  files: z
    .array(UploadIntentFileSchema)
    .min(1)
    .max(LIMITS.MAX_PHOTOS_PER_BATCH),
});
