# User Flows

Each flow lists UI steps and the API calls. Use these as prototype/E2E scripts.

## F1 First use

1. Sign In: tick consent → **Continue with Google**.
2. Clerk SSO → session. `GET /me` → 404.
3. First-Time Setup sheet: confirm name, optional club → **Get started** → `POST /me` → 201.
4. Student → Home (empty states). Tap bell → Notification Permission sheet → **Allow** → OS prompt → `PUT /me/push-token`.
   Alt: non-school email → 403 → "Please use your school Google account."

## F2 Upload photos

1. Home → Upload tab (or event card → Event Detail → **Upload to this event**).
2. Choose **Gallery**, select 3 photos (or **Camera**). Tap a thumbnail to add a caption.
3. Select event, category, optional club; tick consent; **Submit 3 photos**.
4. Upload Progress sheet: Compressing → `POST /photos/upload-intents` → Uploading (PUT ×2 each) → `POST /photos/complete`. One row fails (airplane mode) → **Retry** → Done.
5. Success: **View my photos** → My Photos shows 3 new tiles (no status).

## F3 Rejection recovery

1. Admin rejects a photo (reason "Too dark").
2. Student receives push "Photo needs replacing" (and notification row).
3. Tap push → `/photo/{id}` → card "Needs a new photo: Too dark" → **Replace photo**.
4. Pick new photo → `POST /photos/:id/replace` → upload → `complete` → old photo deleted. My Photos shows the new one.

## F4 Admin review

1. Admin signs in → Review tab (badge shows pending).
2. Photo card: pinch to zoom; **Approve** → toast "Photo approved · Undo" → next photo.
3. **Reject** → Reject Reason sheet → pick **Too dark** → **Confirm reject** → toast Undo.
4. Wait 5 s (or leave the screen) → commits `POST /admin/photos/:id/reject`.
5. Queue empties → "All caught up!" → **Browse all photos**.

## F5 Event management

1. Admin → Events → **+ New event** → fill name, description, pick cover, deadline, max photos, Open → **Create event** → `POST /events`.
2. Student pull-to-refresh Home → new card with countdown.
3. Admin edits deadline to the past → event shows Closed; student's Upload to this event is disabled.
4. Admin deletes an event → dialog "N photos…" → `DELETE /events/:id`.

## F6 Removal request

1. Student opens an approved photo → ⋮ → **Request removal** → choose reason → **Submit** → `POST /photos/:id/reports`.
2. Admin → All photos → filter **Reported only** → open photo → Removal request block.
3. **Remove photo** → confirm → `POST /admin/reports/:id/resolve {action:'remove'}`.
4. Student receives "Removal request update" notification.

## F7 Deadline reached

1. Student opens a closed event → Event Detail shows "This event closed on {date}." and the Upload button is disabled.
2. A forged upload request returns `409 EVENT_CLOSED` (server enforcement).

## F8 Account actions

Profile → **Log out** → dialog → Sign In. Profile → **Delete account** → dialog → account and photos removed.

## Prototype checklist

All 8 flows clickable end to end in the design file; each sheet and state from `specification.md` appears at least once.
