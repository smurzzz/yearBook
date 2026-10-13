# Authorization

Source table: `security/permissions-matrix.md`. Enforced **only on the server** (DD-003). The client hides UI by role for UX, never for security.

## 1. Layers

1. **Authentication** — Clerk token valid (`401`).
2. **Role gate** — `withRoute({ role: 'admin' })` on every `/admin/*`, event mutations (`POST/PATCH/DELETE /events`) → `403 FORBIDDEN`.
3. **Ownership** — student photo routes always include `uploader_id = ctx.userId` in the SQL `WHERE`; non-owned → `404`.
4. **State rules** — locked photos, event open, limits, duplicates (`409`/`422`).
5. **Data minimization** — separate DTOs: student DTO has no `status`/uploader info; admin DTOs include them.

## 2. Pattern

```ts
export const GET = withRoute({ role: 'student' }, async (req, ctx) => {
  const photos = await photosService.listMine(ctx, parseQuery(req)); // SQL: where uploader_id = ${ctx.userId}
  return ok(photos);
});
export const GET = withRoute({ role: 'admin' }, async (req, ctx) => { ... });
```

`withRoute` order: maintenance check → authenticate → load user → role gate → parse/validate → handler → error mapping → log.

## 3. Rules by resource

| Resource      | Student                                                                                   | Admin                                         |
| ------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Own profile   | read/update                                                                               | read/update                                   |
| Other users   | none                                                                                      | read summary via uploader routes              |
| Events        | read all                                                                                  | create/update/delete                          |
| Own photos    | create (intent/complete), read, edit & delete while pending/rejected, replace if rejected | —                                             |
| Any photo     | none                                                                                      | read, approve/reject/reset, edit tags, delete |
| Reports       | create for own photo; none else                                                           | list, resolve                                 |
| Notifications | own                                                                                       | own                                           |
| Push tokens   | own                                                                                       | own                                           |
| Admin routes  | `403`                                                                                     | allowed                                       |

## 4. Admin provisioning

- `admin_emails` (lowercase) matched at first sign-in; or `update users set role = 'admin' where email = '...'`.
- No API can promote a user. There is no in-app role UI (roadmap).
- Maintain ≥ 1 admin at all times; document the SQL in `deployment/troubleshooting.md`.

## 5. Mobile route guards

- `(auth)` group when signed out; `(student)` only if `me.role === 'student'`; `(admin)` only if `me.role === 'admin'`.
- Wrong role → Permission denied state; never render admin screens for students even if deep-linked.

## 6. Testing authz

Every endpoint has tests for: unauthenticated (401), wrong role (403), foreign resource (404), happy path. See `testing/test-cases.md` (TC-AUTHZ-*).
