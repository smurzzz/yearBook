/* Client-side error model — docs/technical/error-handling.md §1–§4.
   Every transport failure, HTTP error envelope and global state (offline,
   maintenance, session expired) is funnelled through one ApiError so screens
   only ever switch on `code`. */

export interface ApiErrorDetails {
  /** 422 VALIDATION_ERROR → field → message. */
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorDetails;
  readonly requestId?: string;

  constructor(
    code: string,
    status: number,
    message: string,
    details?: ApiErrorDetails,
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export const isApiError = (value: unknown): value is ApiError =>
  value instanceof ApiError ||
  (typeof value === "object" &&
    value !== null &&
    (value as { name?: string }).name === "ApiError" &&
    typeof (value as { code?: unknown }).code === "string");

/** Codes produced by the transport itself (never by the server). */
export const CLIENT_CODES = {
  /** No connection / DNS / socket dropped / timed out. → offline banner. */
  NETWORK: "NETWORK_ERROR",
  /** 200 with a body that is not the documented envelope. */
  BAD_RESPONSE: "BAD_RESPONSE",
  /** Request aborted by the caller (unmount, navigation). */
  ABORTED: "ABORTED",
} as const;

/** Session flow: sign out of Clerk and show the Session expired state. */
export const isSessionExpired = (e: unknown) =>
  isApiError(e) && e.code === "UNAUTHENTICATED";

/** Full-screen maintenance state (503 MAINTENANCE_MODE). */
export const isMaintenance = (e: unknown) =>
  isApiError(e) && e.code === "MAINTENANCE_MODE";

/** Offline banner; the caller may keep showing cached data. */
export const isOffline = (e: unknown) =>
  isApiError(e) && e.code === CLIENT_CODES.NETWORK;

/** Permission denied → full-screen "You don't have access to this area." */
export const isForbidden = (e: unknown) =>
  isApiError(e) && e.status === 403;

/** Spec §10 "Not found". */
export const isNotFound = (e: unknown) => isApiError(e) && e.status === 404;
