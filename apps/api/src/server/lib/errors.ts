/* Error envelope per docs/technical/error-handling.md: services throw AppError,
   withRoute maps it; unknown errors collapse to INTERNAL with a generic message. */

export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "EMAIL_DOMAIN_NOT_ALLOWED",
  "USER_NOT_FOUND",
  "NOT_FOUND",
  "CONSENT_REQUIRED",
  "VALIDATION_ERROR",
  "BATCH_TOO_LARGE",
  "EVENT_CLOSED",
  "PHOTO_LIMIT_REACHED",
  "PHOTO_LOCKED",
  "NOT_REPLACEABLE",
  "REPORT_EXISTS",
  "REPORT_ALREADY_RESOLVED",
  "ALREADY_COMPLETE",
  "UPLOAD_NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "STORAGE_QUOTA_EXCEEDED",
  "MAINTENANCE_MODE",
  "SERVICE_UNAVAILABLE",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details ?? {};
  }
}

export const isAppError = (err: unknown): err is AppError => err instanceof AppError;

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; details: Record<string, unknown> };
}

/** Maps any thrown value to the wire envelope + HTTP status. */
export const toErrorEnvelope = (err: unknown): { status: number; body: ErrorEnvelope } => {
  if (isAppError(err)) {
    return { status: err.status, body: { error: { code: err.code, message: err.message, details: err.details } } };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
        details: {},
      },
    },
  };
};

/* Common constructors (message copy matches the app's UI states). */
export const unauthenticated = () => new AppError("UNAUTHENTICATED", 401, "Sign in required");
export const forbidden = (message = "You don't have access to this area.") =>
  new AppError("FORBIDDEN", 403, message);
export const notFound = (message = "This item is no longer available.") =>
  new AppError("NOT_FOUND", 404, message);
