/* T-211 mock side of the contract gate — the same shared zod schemas that
   parse REAL route responses (apps/api contract.test.ts) parse the DEMO
   adapter's responses here. The demo data therefore cannot drift from
   technical/api.md, and the flag swap (mock ↔ HTTP) stays honest.

   The adapter is constructed over a fresh fixture state, exactly as the
   prototype provider wires it (store.tsx). */

import { beforeEach, describe, expect, it } from "vitest";
import {
  AdminPhotoDTOSchema,
  AdminReportDTOSchema,
  AdminTileDTOSchema,
  EventDTOSchema,
  NotificationDTOSchema,
  RefSchema,
  StudentPhotoDTOSchema,
  TileDTOSchema,
  UserDTOSchema,
} from "@yearbookhub/shared";
import { createMockApiClient } from "./mock";
import { toAdminPhotoFromTile, toMyPhoto } from "./dto";
import { createInitialState } from "../prototype/reducer";
import { resetRegistry, STUDENT_ID } from "../prototype/data";
import { myPhotos } from "../prototype/selectors";
import type { PrototypeState } from "../prototype/types";

const client = () => createMockApiClient(() => state);
let state: PrototypeState;

beforeEach(() => {
  resetRegistry();
  state = createInitialState();
});

describe("demo adapter — mock side of the contract (T-211)", () => {
  it("GET /me → UserDTOSchema", async () => {
    expect(UserDTOSchema.safeParse(await client().getMe()).success).toBe(true);
  });

  it("GET /events → EventDTOSchema[]; rules are always present and non-empty", async () => {
    const res = await client().listEvents();
    expect(EventDTOSchema.array().safeParse(res.data).success).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    for (const event of res.data) expect(event.rules.length).toBeGreaterThan(0);
    expect(res.meta).toEqual({
      total: res.data.length,
      accepting: state.events.filter((e) => e.open).length,
    });
  });

  it("GET /lookups → Ref categories + clubs", async () => {
    const res = await client().lookups();
    expect(RefSchema.array().safeParse(res.categories).success).toBe(true);
    expect(RefSchema.array().safeParse(res.clubs).success).toBe(true);
  });

  it("GET /photos/mine → TileDTOSchema[] — richer tiles, and never a status", async () => {
    const res = await client().myPhotos();
    expect(TileDTOSchema.array().safeParse(res.data).success).toBe(true);
    expect(res.data.length).toBeGreaterThan(0);
    for (const tile of res.data) {
      expect(tile).not.toHaveProperty("status"); // TC-AUTHZ-04
      expect(tile.event.name.length).toBeGreaterThan(0);
      expect(tile.batch_id.length).toBeGreaterThan(0);
    }
    expect(res.meta?.photos).toBe(res.data.length);
    expect(RefSchema.array().safeParse(res.meta?.event_chips).success).toBe(true);
  });

  it("GET /photos/:id → StudentPhotoDTOSchema, including batch_id + reject state", async () => {
    const mine = myPhotos(state);
    const plain = await client().getMyPhoto(mine[0].id);
    const parsed = StudentPhotoDTOSchema.safeParse(plain);
    expect(parsed.success ? null : parsed.error.issues).toBe(null);
    expect(plain.batch_id).toBe(mine[0].batchId ?? plain.id);

    const rejected = state.photos.find(
      (p) => p.uploaderId === STUDENT_ID && p.status === "rejected",
    );
    if (rejected) {
      const dto = await client().getMyPhoto(rejected.id);
      expect(dto.needs_replacement).toBe(true);
      expect(dto.rejection).not.toBeNull();
    }
  });

  it("GET /admin/review/queue → AdminPhotoDTOSchema[] with meta.total_pending", async () => {
    const res = await client().reviewQueue();
    expect(AdminPhotoDTOSchema.array().safeParse(res.data).success).toBe(true);
    expect(res.meta).toEqual({
      total_pending: state.photos.filter((p) => p.status === "pending").length,
    });
  });

  it("GET /admin/photos → AdminTileDTOSchema[] with the summary the Filter sheet reads", async () => {
    const res = await client().adminPhotos();
    expect(AdminTileDTOSchema.array().safeParse(res.data).success).toBe(true);
    expect(res.meta?.total).toBe(state.photos.length);
    expect(res.meta?.summary).toEqual({
      pending: state.photos.filter((p) => p.status === "pending").length,
      approved: state.photos.filter((p) => p.status === "approved").length,
      rejected: state.photos.filter((p) => p.status === "rejected").length,
    });
  });

  it("GET /admin/reports → AdminReportDTOSchema[] with a richer photo tile", async () => {
    const res = await client().adminReports();
    expect(AdminReportDTOSchema.array().safeParse(res.data).success).toBe(true);
    if (res.data.length) {
      const report = res.data[0];
      expect(TileDTOSchema.safeParse(report.photo).success).toBe(true);
      expect(report.photo?.event.name.length).toBeGreaterThan(0);
    }
  });

  it("GET /notifications → NotificationDTOSchema[] with meta.unread", async () => {
    const res = await client().notifications();
    expect(NotificationDTOSchema.array().safeParse(res.data).success).toBe(true);
    expect(res.meta?.unread).toBe(state.notifications.filter((n) => !n.read).length);
  });

  it("mutations resolve with contract-valid DTOs (the reducer applies the rules)", async () => {
    const pending = state.photos.find((p) => p.status === "pending")!;
    const api = client();
    expect(AdminPhotoDTOSchema.safeParse(await api.approvePhoto(pending.id)).success).toBe(true);
    expect(AdminPhotoDTOSchema.safeParse(await api.resetPhoto(pending.id)).success).toBe(true);
    await api.markAllNotificationsRead();
    await api.deleteEvent(state.events[0].id);
  });
});

describe("tile → view model roundtrip (the mapping layer the HTTP build uses)", () => {
  it("an admin tile fills every facet the client-side filters read", () => {
    const fixture = state.photos.find((p) => p.status === "rejected");
    expect(fixture).toBeDefined();
    const photo = toAdminPhotoFromTile({
      id: fixture!.id,
      thumb_url: "https://mock.yearbook.local/photos/x.jpg",
      width: 1080,
      height: 1080,
      batch_size: 1,
      batch_id: fixture!.batchId ?? fixture!.id,
      event: { id: fixture!.eventId, name: "Science Fair" },
      created_at: fixture!.uploadedAt,
      status: fixture!.status,
      reported: Boolean(fixture!.removalRequest),
      caption: fixture!.caption,
      category: { id: fixture!.category, name: fixture!.category },
      club: fixture!.club ? { id: fixture!.club, name: fixture!.club } : null,
      uploader: {
        id: fixture!.uploaderId,
        full_name: "Fixture Person",
        email: "fixture@student.stmichaels.edu.ph",
        avatar_url: null,
        club: null,
      },
    });
    expect(photo).toMatchObject({
      id: fixture!.id,
      eventId: fixture!.eventId,
      category: fixture!.category,
      uploaderId: fixture!.uploaderId,
      status: fixture!.status,
      batchId: fixture!.batchId ?? fixture!.id,
    });
  });

  it("a student tile keeps the event ref and batch grouping, without status UI", () => {
    const mine = myPhotos(state)[0];
    const photo = toMyPhoto(
      {
        id: mine.id,
        thumb_url: "https://mock.yearbook.local/photos/x.jpg",
        width: 1080,
        height: 1080,
        batch_size: 1,
        batch_id: mine.batchId ?? mine.id,
        event: { id: mine.eventId, name: "Intramurals 2026" },
        created_at: mine.uploadedAt,
      },
      STUDENT_ID,
    );
    expect(photo).toMatchObject({
      id: mine.id,
      eventId: mine.eventId,
      uploaderId: STUDENT_ID,
      batchId: mine.batchId ?? mine.id,
    });
  });
});
