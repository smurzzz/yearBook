/* Events service — business rules for the catalog (features/events-and-deadlines.md).
   Framework-free: takes an optional Db (+ storage fn) so tests inject fakes. */

import type { EventDTO } from "@yearbookhub/shared";
import { getDb, type Db } from "@/server/lib/db";
import { AppError, notFound } from "@/server/lib/errors";
import { deleteObjects } from "@/server/lib/storage";
import {
  deleteEventRow,
  insertEvent,
  selectEventById,
  selectEvents,
  selectPhotoPaths,
  updateEvent,
} from "@/server/sql/events";

export type Role = "student" | "admin";

export interface EventRow {
  id: string;
  name: string;
  description: string;
  cover_key: string;
  deadline: string;
  max_photos: number;
  is_open: boolean;
  created_at: string;
  photo_count: number;
  my_photo_count: number;
}

/** Effective status (data-model.md §6): open only if is_open AND now < deadline.
    Boundary: at the exact deadline second the event is closed (now >= deadline). */
export const effectiveStatus = (isOpen: boolean, deadline: string): "open" | "closed" =>
  isOpen && Date.parse(deadline) > Date.now() ? "open" : "closed";

/** Student sees my_photo_count, admin sees photo_count (api.md §3 GET /events). */
export const toEventDto = (row: EventRow, role: Role): EventDTO => ({
  id: row.id,
  name: row.name,
  description: row.description,
  cover_key: row.cover_key as EventDTO["cover_key"],
  deadline: row.deadline,
  max_photos: Number(row.max_photos),
  is_open: Boolean(row.is_open),
  status: effectiveStatus(row.is_open, row.deadline),
  ...(role === "admin"
    ? { photo_count: Number(row.photo_count) }
    : { my_photo_count: Number(row.my_photo_count) }),
  created_at: row.created_at,
});

export interface EventListResult {
  events: EventDTO[];
  meta?: { total: number; accepting: number };
}

/** Full catalog. meta.total/accepting only for the admin header (api.md §3). */
export async function listEvents(
  role: Role,
  viewerId: string,
  q: string | null,
  db: Db = getDb(),
): Promise<EventListResult> {
  const rows = (await selectEvents(db, viewerId, q)) as unknown as EventRow[];
  const events = rows.map((row) => toEventDto(row, role));
  if (role !== "admin") return { events };
  return {
    events,
    meta: {
      total: events.length,
      accepting: events.filter((e) => e.status === "open").length,
    },
  };
}

export async function getEvent(
  id: string,
  viewerId: string,
  db: Db = getDb(),
): Promise<EventRow | null> {
  const rows = (await selectEventById(db, id, viewerId)) as unknown as EventRow[];
  return rows[0] ?? null;
}

export interface EventInput {
  name: string;
  description: string;
  cover_key: string;
  deadline: string;
  max_photos: number;
  is_open: boolean;
}

/** POST /events — deadline must be in the future on create (api.md §3, TC-EVT-02). */
export async function createEvent(
  input: EventInput,
  adminId: string,
  db: Db = getDb(),
): Promise<EventDTO> {
  if (Date.parse(input.deadline) <= Date.now()) {
    throw new AppError("VALIDATION_ERROR", 422, "Check the highlighted fields.", {
      fields: { deadline: "Deadline must be in the future." },
    });
  }
  const inserted = await insertEvent(db, {
    name: input.name,
    description: input.description,
    coverKey: input.cover_key,
    deadline: input.deadline,
    maxPhotos: input.max_photos,
    isOpen: input.is_open,
    createdBy: adminId,
  });
  if (inserted.length === 0) throw new AppError("INTERNAL", 500, "Something went wrong. Please try again.");
  const id = String((inserted[0] as { id: unknown }).id);
  const row = await getEvent(id, adminId, db);
  if (!row) throw new AppError("INTERNAL", 500, "Something went wrong. Please try again.");
  return toEventDto(row, "admin");
}

/** PATCH /events/:id — any subset; past deadlines allowed (closes the event). */
export async function updateEventById(
  id: string,
  patch: Partial<EventInput>,
  db: Db = getDb(),
): Promise<EventDTO> {
  const sets: Record<string, unknown> = {};
  if (patch.name !== undefined) sets.name = patch.name;
  if (patch.description !== undefined) sets.description = patch.description;
  if (patch.cover_key !== undefined) sets.cover_key = patch.cover_key;
  if (patch.deadline !== undefined) sets.deadline = patch.deadline;
  if (patch.max_photos !== undefined) sets.max_photos = patch.max_photos;
  if (patch.is_open !== undefined) sets.is_open = patch.is_open;

  if (Object.keys(sets).length > 0) {
    const updated = await updateEvent(db, id, sets);
    if (updated.length === 0) throw notFound();
  }
  const row = await getEvent(id, id, db);
  if (!row) throw notFound();
  return toEventDto(row, "admin");
}

export interface DeleteDeps {
  db?: Db;
  deleteObjects?: (paths: string[]) => Promise<void>;
}

/** DELETE /events/:id — storage first; on storage error keep rows (error-handling §3). */
export async function deleteEvent(id: string, deps: DeleteDeps = {}): Promise<void> {
  const db = deps.db ?? getDb();
  const removeObjects = deps.deleteObjects ?? deleteObjects;

  const existing = await getEvent(id, id, db);
  if (!existing) throw notFound();

  const pathRows = (await selectPhotoPaths(db, id)) as unknown as Array<{
    original_path: string;
    thumb_path: string;
  }>;
  const paths = pathRows.flatMap((p) => [p.original_path, p.thumb_path]);

  if (paths.length > 0) {
    try {
      await removeObjects(paths);
    } catch {
      // Storage-first: abort before touching rows so the delete stays retry-safe.
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        503,
        "We couldn't delete the photos. Please try again.",
      );
    }
  }
  await deleteEventRow(db, id); // photos cascade with the event
}
