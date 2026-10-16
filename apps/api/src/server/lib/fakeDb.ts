/* Test double for the Db handle: records calls and delegates to a scripted
   handler keyed on SQL text. Keeps the gate tests database-free (no Docker). */

import type { Db, Rows } from "./db";

export interface FakeDb extends Db {
  calls: Array<{ sql: string; values: unknown[] }>;
}

export function fakeDb(handler: (sql: string, values: unknown[]) => Rows = () => []): FakeDb {
  const calls: Array<{ sql: string; values: unknown[] }> = [];

  const run = (sql: string, values: unknown[]): Promise<Rows> => {
    calls.push({ sql, values });
    return Promise.resolve(handler(sql, values));
  };

  const db = ((strings: TemplateStringsArray | string[], ...values: unknown[]) =>
    run(Array.isArray(strings) ? strings.join("?") : String(strings), values)) as unknown as Db;

  (db as { unsafe: (text: string, params?: unknown[]) => Promise<Rows> }).unsafe = (text, params = []) =>
    run(text, params);

  return Object.assign(db, { calls }) as FakeDb;
}
