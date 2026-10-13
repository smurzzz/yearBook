# Feature: User Management (profile, roles, account)

**Requirements:** FR-PROF-01…04, FR-AUTH-05, FR-AUTH-08

## Scope

There is **no admin user-management screen** in v1. Users are created on first sign-in; roles are provisioned via `admin_emails` or SQL.

## Profile sheet

| Element                                                                | Student      | Admin                                                                                         |
| ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| Avatar, name, Google email (read-only)                                 | ✔            | ✔                                                                                             |
| Role badge                                                             | "Student"    | "Admin"                                                                                       |
| Club                                                                   | ✔ (editable) | replaced by "Yearbook Committee"                                                              |
| Dark mode toggle (device-local, persisted in SecureStore/AsyncStorage) | ✔            | ✔                                                                                             |
| Deadline reminders / Review results toggles (server)                   | ✔            | ✔ (Review results hidden for admin: they receive no review pushes; Deadline reminders hidden) |
| Privacy Notice, Help                                                   | ✔            | ✔                                                                                             |
| Log out                                                                | ✔            | ✔                                                                                             |
| Delete account                                                         | ✔            | ✘ (admins are removed via SQL to avoid locking out the committee)                             |

## Editing

- Student can edit full name (1–80) and club (optional) → `PATCH /me`. Email and avatar come from Google and are read-only.

## Delete account (student)

1. Confirm dialog (spec §7).
2. API deletes all storage files of the user's photos (BR-08), then user row (cascade: photos, reports filed, notifications, push tokens), then the Clerk user.
3. App clears everything and returns to Sign In.
   Open reports about the deleted user's photos remain with `photo_id = null` and snapshot.

## Admin provisioning runbook

```sql
insert into admin_emails(email) values ('name@school.edu');           -- before first sign-in
update users set role = 'admin' where email = 'name@school.edu';      -- after first sign-in
update users set role = 'student' where email = 'name@school.edu';    -- demote
```

## Acceptance

Profile shows correct role-specific content · name edit persists · delete account removes the user's files (verify in storage) · admin has no Delete account option.
