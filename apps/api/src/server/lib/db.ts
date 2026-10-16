/* postgres.js client — pooled connection used only by the API (architecture.md §1).
   `prepare: false` (Supabase pooler), `max: 1` per warm lambda (database.md §6).
   The client is created lazily so importing this module never opens a socket. */

import postgres from "postgres";
import { env } from "./env";

export type Rows = Record<string, unknown>[];

/** Structural database handle: tagged-template queries (parameterized) + unsafe(text). */
export interface Db {
  <T = Rows>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  unsafe(text: string, params?: unknown[]): Promise<Rows>;
}

let client: ReturnType<typeof postgres> | null = null;

export function getDb(): Db {
  if (!client) {
    client = postgres(env().DATABASE_URL, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client as unknown as Db;
}

/** Liveness probe for GET /health (`select 1`); throws when unreachable. */
export async function pingDb(): Promise<void> {
  await getDb().unsafe("select 1");
}
