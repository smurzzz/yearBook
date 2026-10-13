# Pages & Routes (expo-router)

6 full screens; everything else is a sheet/overlay/dialog.

## 1. Route tree

```
apps/mobile/app/
  _layout.tsx                  # Clerk, QueryClient, SheetHost, ToastHost, OfflineBanner, auth/role gate
  index.tsx                    # splash/redirect by auth + role
  (auth)/
    _layout.tsx
    sign-in.tsx                # S1 Sign In  (+ First-Time Setup sheet)
  (student)/
    _layout.tsx                # Tabs: home, upload, my-photos (center Upload highlighted)
    home.tsx                   # S2 Home
    upload.tsx                 # S3 Upload   (?eventId=)
    my-photos.tsx              # S4 My Photos
  (admin)/
    _layout.tsx                # Tabs: review, events (+ pending badge)
    review.tsx                 # S5 Admin Review  (segmented: Review | All photos)
    events.tsx                 # S6 Admin Events
  photo/[id].tsx               # Photo Viewer (full-screen modal, student)
  +not-found.tsx               # Not found state
```

## 2. Route guards

| Condition                                              | Result                              |
| ------------------------------------------------------ | ----------------------------------- |
| Not signed in                                          | `(auth)/sign-in`                    |
| Signed in, `GET /me` 404                               | Sign In with First-Time Setup sheet |
| Signed in, role student                                | `(student)/home`                    |
| Signed in, role admin                                  | `(admin)/review`                    |
| Student opens `(admin)/*` or admin opens `(student)/*` | Permission denied state             |
| `GET /me` 401 after refresh                            | Session expired state → Sign In     |
| API 503 `MAINTENANCE_MODE`                             | Maintenance state                   |

## 3. Tabs

- Student: **Home · Upload · My Photos** (Upload is the center, highlighted).
- Admin: **Review (badge = pending) · Events**.
- Profile: sheet from avatar (Home header, My Photos settings icon, admin header avatar).

## 4. Sheets / overlays registry (`SheetHost`)

| Name                                                                                           | Props                | Opened from                          |
| ---------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------ |
| `firstTimeSetup`                                                                               | —                    | Sign In after 404                    |
| `profile`                                                                                      | —                    | Avatars/settings                     |
| `privacyNotice`                                                                                | —                    | Sign In link, Profile                |
| `help`                                                                                         | —                    | Profile                              |
| `notificationPermission`                                                                       | —                    | Bell (first use)                     |
| `notifications`                                                                                | —                    | Bell                                 |
| `eventDetail`                                                                                  | `eventId`            | Home card, push tap                  |
| `uploadProgress`                                                                               | —                    | Submit                               |
| `caption`                                                                                      | `clientId`           | Upload thumbnail                     |
| `editPhoto`                                                                                    | `photoId, role`      | Viewer ⋮ / Admin Detail ⋮            |
| `requestRemoval`                                                                               | `photoId`            | Viewer ⋮                             |
| `adminPhotoDetail`                                                                             | `photoId`            | Tiles in All photos / Uploader sheet |
| `rejectReason`                                                                                 | `photoId, onConfirm` | Reject buttons                       |
| `filter`                                                                                       | `filters, onApply`   | Filter button                        |
| `eventForm`                                                                                    | `eventId?`           | Events                               |
| `uploaderPhotos`                                                                               | `userId`             | "All their photos"                   |
| Dialogs: `logout`, `deleteAccount`, `deletePhoto`, `removePhoto`, `deleteEvent` (see spec §7). |

## 4.1 Deep links / push targets

| Target                    | Route                                                |
| ------------------------- | ---------------------------------------------------- |
| Photo needs replacing     | `/photo/{photoId}`                                   |
| Deadline reminder         | `/(student)/home?eventId={id}` → opens `eventDetail` |
| Report resolved           | opens `notifications` sheet                          |
| Scheme: `yearbookhub://`. |

## 5. Screen → API map

| Screen         | Endpoints                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------- |
| Sign In        | Clerk, `GET/POST /me`                                                                         |
| Home           | `/events`, `/photos/mine?limit=10`, `/notifications` (unread)                                 |
| Upload         | `/lookups`, `/events`, `/photos/upload-intents`, `/photos/complete`                           |
| My Photos      | `/photos/mine`, `/photos/:id`, `PATCH/DELETE /photos/:id`, `/photos/:id/reports`              |
| Admin Review   | `/admin/review/queue`, `/admin/review/count`, approve/reject                                  |
| All photos     | `/admin/photos`, `/admin/photos/:id`, `/admin/users/:id/photos`, `/lookups`, `/admin/reports` |
| Events (admin) | `/events`, `POST/PATCH/DELETE /events`                                                        |
