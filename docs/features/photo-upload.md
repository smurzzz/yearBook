# Feature: Photo Upload & Tagging

**Requirements:** FR-UP-01…09 · **Spec:** §6 S3, §8 · **API:** upload-intents, complete, upload-url, replace

## Client modules

- `lib/image.ts`: `compress(uri) → { originalUri, thumbUri, width, height, originalBytes, thumbBytes }` using `expo-image-manipulator` (`resize` to long edge, `SaveFormat.JPEG`, `compress`).
- `store/uploadQueue.ts` (Zustand): items `{ clientId, photoId?, status: waiting|compressing|uploading|done|failed, progress, error?, files, meta }`; actions `enqueue`, `retry(clientId)`, `retryAllFailed`, `clear`.
- `features/upload/useSubmitUpload.ts`: orchestrates steps in spec §8.
- Uploads: `FileSystem.createUploadTask(upload_url, uri, { httpMethod: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, uploadType: BINARY_CONTENT }, onProgress)` (use the library's current API for upload progress in the installed Expo SDK).

## Rules

- Camera and gallery permissions requested on demand; denial shows the permission card.
- Gallery multi-select limited to remaining slots (20 − selected).
- Strip EXIF location: `expo-image-manipulator` output does not retain GPS; do not re-add EXIF. (Privacy.)
- Caption ≤ 200 chars.
- Idempotency: `client_id` generated once per photo and reused on retries.
- Concurrency: compress 2, upload 3.
- Intent failure (e.g. `EVENT_CLOSED`, `PHOTO_LIMIT_REACHED`) fails the whole batch before any upload; show the state and keep the selection so the user can fix it.
- After success: invalidate `my-photos`, `events` (counts), `home` queries; clear the Upload screen.

## Replace flow

Viewer → **Replace photo** → pick one photo (camera/gallery) → compress → `POST /photos/:id/replace` → same upload steps → on `complete` the server deletes the rejected photo. The viewer closes and My Photos refreshes. If the event closed: show Deadline passed state.

## Failure matrix

| Failure                                   | Handling                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Compress error                            | Row Failed ("Couldn't process this photo") + Retry                    |
| Intent 4xx                                | Batch-level error, no rows uploaded                                   |
| PUT network error                         | Row Failed + Retry; auto-retry on reconnect                           |
| Signed URL expired (403/401 from storage) | Call `/photos/:id/upload-url` then retry                              |
| `complete` → `UPLOAD_NOT_FOUND`           | Row Failed → Retry re-uploads                                         |
| App killed mid-upload                     | Incomplete rows are purged by cron after 24 h; user re-selects photos |

## Acceptance

Batch of 20 uploads and appears in My Photos · closing the event mid-flow blocks new intents · idempotent retry creates no duplicates · compressed sizes within limits · airplane-mode test recovers.
