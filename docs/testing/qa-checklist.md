# QA Checklist (Release)

Tick every box on the release build (APK) on two Android devices. Initial/date at the bottom.

## A. Build & install

- [ ] APK installs from the EAS link; app name/icon/splash correct
- [ ] Cold start ≤ 3 s; no crash on first launch
- [ ] App works over mobile data and Wi-Fi

## B. Accounts & roles

- [ ] Consent gate works; Google sign-in works with school account
- [ ] Non-school account is blocked with the correct message
- [ ] First-Time Setup appears once; admin lands on Review; student on Home
- [ ] Student cannot reach admin screens (deep link test)
- [ ] Log out and delete account work

## C. Student

- [ ] Home: events, countdown chips (amber < 72 h, Closed), recent uploads, bell dot
- [ ] Upload: camera + gallery, 20-photo cap, captions, tags, consent gating
- [ ] Progress sheet: statuses, retry, offline retry, success state
- [ ] My Photos: no status anywhere; chips filter; stats right
- [ ] Viewer: swipe, zoom, edit, delete (not for approved), request removal
- [ ] Rejected photo: quiet card + Replace works
- [ ] Closed event blocks uploads; limit message correct

## D. Admin

- [ ] Review: zoom, swipe, approve, reject (reasons + Other note), undo, commit on leave
- [ ] "All caught up!" empty state
- [ ] All photos: search, every filter, summary counts, status icons, Reported badge
- [ ] Photo Detail: current-status button disabled; removal request actions
- [ ] Events: create, edit, close, delete (count shown), empty state
- [ ] Uploader photos sheet

## E. Notifications

- [ ] Permission sheet; push on reject; push on report outcome
- [ ] Deadline reminder via manual cron call
- [ ] Toggles respected; tap routes correctly

## F. UI quality

- [ ] White text on all primary buttons; one primary color
- [ ] No overlapping badges; chip rows show fade; sheets scroll above footers
- [ ] Light and dark mode on all screens
- [ ] TalkBack labels; font scale 130 %
- [ ] Skeletons, empty states, error states reachable

## G. Security & privacy

- [ ] Storage bucket private; signed URLs expire
- [ ] No secrets in app bundle; logs free of PII
- [ ] RLS enabled on all tables; Supabase Data API disabled (if used)
- [ ] Privacy Notice text approved by adviser/DPO (OQ-3)
- [ ] `npm audit --omit=dev` clean of high/critical

## H. Release ops

- [ ] Production env vars verified; migrations applied; cron secret set
- [ ] Demo data loaded; backup taken (`deployment/backup-recovery.md`)
- [ ] Supabase project active (not paused); Vercel deployment healthy
- [ ] Docs updated (user guide, final diagrams)

Signed off by: ____________ Date: ________ Build: ________
