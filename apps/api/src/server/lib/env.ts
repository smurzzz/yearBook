/* Zod-validated environment (T-013). Fails fast on missing required values.
   Parsed on every call (cheap) so tests and MAINTENANCE_MODE toggles see live values. */

import { z } from "zod";

const boolish = z.preprocess((v) => {
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return v;
}, z.boolean());

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  STORAGE_BUCKET: z.string().default("yearbook-photos"),
  /** Comma list; empty = allow every domain (docs/technical/environment.md). */
  ALLOWED_EMAIL_DOMAINS: z.string().default(""),
  CRON_SECRET: z.string().default(""),
  STORAGE_SOFT_LIMIT_BYTES: z.coerce.number().default(943_718_400),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().default(3600),
  EXPO_ACCESS_TOKEN: z.string().default(""),
  MAINTENANCE_MODE: boolish.default(false),
  APP_TIMEZONE: z.string().default("Asia/Manila"),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = (): Env => EnvSchema.parse(process.env);

/** Allowed email domains as a lowercase list; [] = allow all. */
export const allowedDomains = (): string[] =>
  env()
    .ALLOWED_EMAIL_DOMAINS.split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
