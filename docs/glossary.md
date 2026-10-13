# Glossary

| Term                     | Definition                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin                    | Yearbook committee member. Reviews photos, manages events, resolves reports.                                                                    |
| Student                  | Any non-admin user. Uploads photos and sees only their own.                                                                                     |
| Event                    | A photo-collection period with a name, description, cover preset, deadline, per-student photo limit, and open toggle (e.g. "Intramurals 2026"). |
| Effective status (event) | `open` if `is_open` and `now < deadline`; otherwise `closed`.                                                                                   |
| Category                 | Seeded tag: Sports, Academics, Candid, Graduation, Clubs, Culture, Other.                                                                       |
| Club                     | Seeded optional tag: Drama Club, Robotics Club, Photography Club. Not a role.                                                                   |
| Photo                    | One uploaded image: original (≤ 1920 px) + thumbnail (480 px) + metadata.                                                                       |
| Batch                    | Photos submitted together in one Submit action (`batch_id`).                                                                                    |
| Upload intent            | API call that validates rules, creates incomplete photo rows, and returns signed upload URLs.                                                   |
| Complete                 | API call confirming files are in storage; makes the photo visible.                                                                              |
| Incomplete upload        | Photo row with `upload_completed_at is null`; invisible; purged after 24 h.                                                                     |
| Status                   | Admin-facing photo state: `pending`, `approved`, `rejected`. Never shown to students.                                                           |
| Rejection reason         | Preset (Blurry, Too dark, Inappropriate, Duplicate, Wrong event, Low resolution, Other) plus optional note.                                     |
| Needs replacement        | Student-facing flag meaning the photo was rejected; shows the reason and a Replace button.                                                      |
| Replace                  | New upload linked to a rejected photo; the old one is deleted when the new one completes.                                                       |
| Removal request (report) | Student request to delete their own photo; resolved by an admin (remove or dismiss).                                                            |
| Reported                 | Photo with an open removal request.                                                                                                             |
| Review queue             | Pending photos, oldest first.                                                                                                                   |
| Undo window              | 5 s after approve/reject during which the decision can be reverted before commit.                                                               |
| Consent                  | Checkbox at sign-in (privacy notice) and at each upload (permission to share photos).                                                           |
| Signed URL               | Temporary URL for reading (1 h) or uploading a private storage object.                                                                          |
| Sheet                    | Bottom sheet overlay used instead of a full screen.                                                                                             |
| Clerk                    | Authentication provider (Google SSO).                                                                                                           |
| Supabase                 | Hosted Postgres + Storage.                                                                                                                      |
| EAS                      | Expo Application Services (builds the APK).                                                                                                     |
| Dev build                | Expo development client; required for push and native modules.                                                                                  |
| RA 10173                 | Philippine Data Privacy Act of 2012.                                                                                                            |
| DPO                      | Data Protection Officer (school contact for privacy).                                                                                           |
| DTO                      | Data transfer object: the JSON shape returned by the API.                                                                                       |
