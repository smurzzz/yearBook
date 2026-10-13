# Error Handling

## 1. Envelope

```json
{
  "error": {
    "code": "EVENT_CLOSED",
    "message": "This event is closed.",
    "details": {}
  }
}
```

`message` is user-safe English. `details` carries machine data (e.g. `{ "max": 10, "existing": 8, "remaining": 2 }`). Never include stack traces, SQL, or secrets.

## 2. Error codes

| Code                       | HTTP | When                               | Client UI state                                |
| -------------------------- | ---- | ---------------------------------- | ---------------------------------------------- |
| `UNAUTHENTICATED`          | 401  | Missing/invalid token              | Retry once with fresh token → Session expired  |
| `FORBIDDEN`                | 403  | Wrong role                         | Permission denied                              |
| `EMAIL_DOMAIN_NOT_ALLOWED` | 403  | Domain not allowed                 | "Please use your school Google account."       |
| `USER_NOT_FOUND`           | 404  | No `users` row yet                 | First-Time Setup sheet                         |
| `NOT_FOUND`                | 404  | Missing or not visible             | "This item is no longer available."            |
| `CONSENT_REQUIRED`         | 422  | `consent !== true`                 | Inline: tick the consent box                   |
| `VALIDATION_ERROR`         | 422  | zod failure                        | Field errors from `details.fields`             |
| `BATCH_TOO_LARGE`          | 422  | > 20 files                         | Inline under picker                            |
| `EVENT_CLOSED`             | 409  | Deadline passed or `is_open=false` | Deadline passed state                          |
| `PHOTO_LIMIT_REACHED`      | 409  | BR-02                              | Inline message with `remaining`                |
| `PHOTO_LOCKED`             | 409  | Edit/delete approved photo         | Toast "Approved photos can't be changed."      |
| `NOT_REPLACEABLE`          | 409  | Replace non-rejected photo         | Toast                                          |
| `REPORT_EXISTS`            | 409  | Open report exists                 | "You already requested removal of this photo." |
| `REPORT_ALREADY_RESOLVED`  | 409  | Resolve twice                      | Refresh list                                   |
| `ALREADY_COMPLETE`         | 409  | upload-url on completed photo      | Ignore, mark Done                              |
| `UPLOAD_NOT_FOUND`         | 409  | `complete` but file missing        | Row Failed → Retry                             |
| `PAYLOAD_TOO_LARGE`        | 413  | File over limit                    | Row Failed "Photo too large"                   |
| `RATE_LIMITED`             | 429  | Provider/API throttle              | Toast, retry after delay                       |
| `STORAGE_QUOTA_EXCEEDED`   | 507  | BR-09                              | Storage full state                             |
| `MAINTENANCE_MODE`         | 503  | `MAINTENANCE_MODE=true`            | Maintenance state                              |
| `SERVICE_UNAVAILABLE`      | 503  | DB/provider down                   | Error + Try again                              |
| `INTERNAL`                 | 500  | Unexpected                         | Error + Try again                              |

## 3. Server rules

- Throw `AppError(code, status, message, details?)` in services; `withRoute` maps it. Unknown errors → `INTERNAL` (log full error server-side with request id, return generic message).
- Use DB constraint violations as backstops: map unique violation on `reports_one_open_per_reporter` → `REPORT_EXISTS`; on `(uploader_id, client_id)` → return existing (idempotent).
- Multi-step deletes: storage first; on storage error abort with `SERVICE_UNAVAILABLE` and keep rows (retry-safe).
- External calls (Clerk, Storage, Expo Push) have timeouts (8 s) and are wrapped; push failures never fail the request.

## 4. Client rules

- `src/api/client.ts` converts responses to `ApiError { code, status, message, details }`.
- **Retries:** GET only, 2 retries, exponential backoff (500 ms, 1.5 s) on network errors and 502/503/504. Mutations are not retried automatically, except upload PUTs (manual Retry + auto on reconnect) and idempotent intents (same `client_id`).
- Query errors render the inline error block; mutation errors render a toast with `message`.
- Global handlers: 401 → session flow; 503 `MAINTENANCE_MODE` → maintenance screen; network failure → offline banner.
- A React error boundary at the root shows "Something went wrong. Restart the app." with a **Reload** button.

## 5. Logging

JSON line per request: `{ ts, requestId, route, method, status, ms, userHash, code? }`. `userHash` = first 8 chars of SHA-256(userId). Never log bodies, emails, captions, tokens, or URLs.
