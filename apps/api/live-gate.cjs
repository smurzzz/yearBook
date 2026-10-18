/* Live API gate — exercises every v1 endpoint against a running dev server with
   real Clerk sessions and the hosted Supabase (DB + Storage). Usage:
     GATE_API=http://localhost:3000/api/v1 node live-gate.cjs
   Start the dev server first (`npm run dev`); it prints the port it picked.
   Secrets are read from .env.local and never printed. Idempotent — safe to re-run. */
const fs = require("fs");
const { randomUUID } = require("crypto");

const API = process.env.GATE_API || "http://localhost:3000/api/v1";
const BAPI = "https://api.clerk.com/v1";
const raw = fs.readFileSync(".env.local", "utf8");
const line = (k) => raw.split(/\r?\n/).find((l) => l.startsWith(k + "="));
const SK = line("CLERK_SECRET_KEY").slice("CLERK_SECRET_KEY=".length);

const STUDENT_ID = "user_3Kn6gBTHn689FLUzV4YacJLLzTv";
const ADMIN_ID = "user_3Kn6gFzHuU7aVRlgJ1SghrKAOOc";

const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${String(detail).slice(0, 180)}`);
};

const req = async (url, opts = {}, bearer) => {
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  if (bearer) headers.authorization = "Bearer " + bearer;
  const res = await fetch(url, { ...opts, headers });
  let body = null;
  const text = await res.text();
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, headers: res.headers };
};
const api = (path, opts, token) => req(API + path, opts, token);
const bapi = (path, opts) => req(BAPI + path, opts, SK);

// --- a tiny real JPEG for the upload flow ---
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
  "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
  "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

const prepUser = async (id, email, first, last) => {
  await bapi(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ email_addresses: [email], first_name: first, last_name: last }) });
  const u = (await bapi(`/users/${id}`)).body;
  const attached = (u.email_addresses || []).some((e) => e.email_address === email);
  const s = (await bapi("/sessions", { method: "POST", body: JSON.stringify({ user_id: id }) })).body;
  if (!s.id) throw new Error("session create failed: " + JSON.stringify(s).slice(0, 120));
  const t = (await bapi(`/sessions/${s.id}/tokens`, { method: "POST", body: "{}" })).body;
  const jwt = t.jwt || t.token;
  if (!jwt) throw new Error("token mint failed: " + JSON.stringify(t).slice(0, 120));
  return { token: jwt, attached };
};

// pooler SQL (direct seeding / role promotion only — schema untouched)
const runSql = async (text, params = []) => {
  const postgres = require("postgres");
  const u = new URL(line("DATABASE_URL").slice("DATABASE_URL=".length));
  const sql = postgres({ host: u.hostname, port: u.port, database: u.pathname.slice(1), username: u.username, password: u.password, ssl: { rejectUnauthorized: false }, connect_timeout: 8, prepare: false, onnotice: () => {} });
  try { return await sql.unsafe(text, params); } finally { await sql.end().catch(() => {}); }
};

(async () => {
  // 0. health (public)
  const h = await api("/health");
  rec("A. GET /health (public)", h.status === 200 && h.body?.data?.ok === true, `status ${h.status}`);

  // 1. unauthenticated
  const un = await api("/me");
  rec("B. GET /me no token -> 401 UNAUTHENTICATED", un.status === 401 && un.body?.error?.code === "UNAUTHENTICATED", `status ${un.status} code ${un.body?.error?.code}`);

  // 2. mint sessions (+ email attach attempt)
  let stu, adm;
  try {
    stu = await prepUser(STUDENT_ID, "gate-student@example.com", "Gate", "Student");
    adm = await prepUser(ADMIN_ID, "gate-admin@example.com", "Gate", "Admin");
    rec("C. Clerk session tokens minted", true, `emails attached: student=${stu.attached} admin=${adm.attached}`);
  } catch (e) {
    rec("C. Clerk session tokens minted", false, e.message);
    process.exit(1);
  }

  // 3. lookups
  const lk = await api("/lookups", {}, stu.token);
  const cats = lk.body?.data?.categories || [];
  const clubs = lk.body?.data?.clubs || [];
  rec("D. GET /lookups", lk.status === 200 && cats.length >= 7 && clubs.length >= 3, `categories ${cats.length}, clubs ${clubs.length}`);
  const sportsCat = cats.find((c) => c.name === "Sports") || cats[0];
  const someClub = clubs[0] || null;

  // 4. student bootstrap: GET (404 on first run; 200 once the row exists)
  const me0 = await api("/me", {}, stu.token);
  rec("E. GET /me pre-setup -> 404 (or existing row on rerun)", me0.status === 404 || me0.status === 200, `status ${me0.status}`);

  let seeded = false;
  const meCreate = await api("/me", { method: "POST", body: JSON.stringify({ full_name: "Gate Student", club_id: someClub?.id ?? null, consent: true, consent_version: "2026-10-v1" }) }, stu.token);
  if (meCreate.status >= 200 && meCreate.status < 300) {
    rec("F. POST /me bootstrap (student)", meCreate.body?.data?.role === "student", `role ${meCreate.body?.data?.role}`);
  } else {
    seeded = true;
    rec("F. POST /me bootstrap (student)", false, `status ${meCreate.status} ${meCreate.body?.error?.code} — falling back to direct users-row seed`);
    await runSql(
      `insert into public.users (id, email, full_name, role, club_id, consent_version, consented_at)
       values ($1,$2,$3,'student',$4,'2026-10-v1', now()) on conflict (id) do nothing`,
      [STUDENT_ID, "gate-student@example.com", "Gate Student", someClub?.id ?? null],
    );
  }

  // admin row: bootstrap as student then promote (ADMIN_EMAILS unset in env)
  const admCreate = await api("/me", { method: "POST", body: JSON.stringify({ full_name: "Gate Admin", club_id: null, consent: true, consent_version: "2026-10-v1" }) }, adm.token);
  if (!(admCreate.status >= 200 && admCreate.status < 300)) {
    seeded = true;
    await runSql(
      `insert into public.users (id, email, full_name, role, club_id, consent_version, consented_at)
       values ($1,$2,$3,'student',null,'2026-10-v1', now()) on conflict (id) do nothing`,
      [ADMIN_ID, "gate-admin@example.com", "Gate Admin"],
    );
  }
  await runSql(`update public.users set role='admin' where id=$1`, [ADMIN_ID]);
  const meA = await api("/me", {}, adm.token);
  rec("G. admin users row active", meA.status === 200 && meA.body?.data?.role === "admin", `role ${meA.body?.data?.role}`);

  // 5. events: admin creates with the new contract; student reads rules
  const evIn = { name: "Gate Test Event", description: "Live gate event — safe to delete.", cover_key: "sports", deadline: new Date(Date.now() + 7 * 864e5).toISOString(), max_photos: 5, is_open: true };
  const ev = await api("/events", { method: "POST", body: JSON.stringify(evIn) }, adm.token);
  const event = ev.body?.data;
  rec("H. POST /events (admin)", ev.status >= 200 && ev.status < 300 && !!event?.id, `status ${ev.status}`);
  rec("I. event rules derived + returned", Array.isArray(event?.rules) && event.rules.length > 0, JSON.stringify(event?.rules || []).slice(0, 140));

  const evList = await api("/events", {}, stu.token);
  const evGet = event ? await api(`/events/${event.id}`, {}, stu.token) : { status: 0, body: null };
  rec("J. GET /events + /events/:id (student)", evList.status === 200 && evGet.status === 200 && Array.isArray(evGet.body?.data?.rules), `list ${evList.status}, detail ${evGet.status}`);

  // 6. upload flow end-to-end with signed storage URLs
  const cid = randomUUID();
  const intentsIn = { event_id: event.id, category_id: sportsCat.id, club_id: null, consent: true, files: [{ client_id: cid, caption: "Gate upload", width: 800, height: 600, original_bytes: JPEG.length, thumb_bytes: JPEG.length }] };
  const intents = await api("/photos/upload-intents", { method: "POST", body: JSON.stringify(intentsIn) }, stu.token);
  const item = intents.body?.data?.items?.[0];
  rec("K. POST /photos/upload-intents", intents.status >= 200 && intents.status < 300 && !!item?.photo_id, `status ${intents.status}`);

  const put = async (target) => {
    const url = target.upload_url + (target.upload_url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(target.token);
    const res = await fetch(url, { method: "PUT", headers: { "content-type": "image/jpeg", authorization: "Bearer " + target.token }, body: JPEG });
    if (!res.ok) {
      const res2 = await fetch(target.upload_url, { method: "PUT", headers: { "content-type": "image/jpeg", authorization: "Bearer " + target.token }, body: JPEG });
      return res2.status;
    }
    return res.status;
  };
  if (item) {
    const po = await put(item.original);
    const pt = await put(item.thumb);
    rec("L. signed PUT original + thumb", po >= 200 && po < 300 && pt >= 200 && pt < 300, `original ${po}, thumb ${pt}`);

    const comp = await api("/photos/complete", { method: "POST", body: JSON.stringify({ photo_ids: [item.photo_id] }) }, stu.token);
    const okc = comp.body?.data?.results?.[0]?.ok === true;
    rec("M. POST /photos/complete", comp.status >= 200 && comp.status < 300 && okc, `ok ${okc} code ${comp.body?.data?.results?.[0]?.code || "-"}`);
  }

  // 7. student tiles + signed read
  const mine = await api("/photos/mine", {}, stu.token);
  const tile = mine.body?.data?.[0];
  rec("N. GET /photos/mine tile", mine.status === 200 && mine.body?.data?.length >= 1 && !!tile?.thumb_url, `tiles ${mine.body?.data?.length}, meta ${JSON.stringify(mine.body?.meta || {}).slice(0, 80)}`);
  if (tile?.thumb_url) {
    const img = await fetch(tile.thumb_url);
    const ct = img.headers.get("content-type") || "";
    rec("O. signed thumb_url fetch (storage)", img.status === 200 && ct.startsWith("image/"), `status ${img.status} type ${ct}`);
  }

  // 8. review workflow: completed upload lands pending -> admin approves
  const queue = await api("/admin/review/queue", {}, adm.token);
  const count = await api("/admin/review/count", {}, adm.token);
  rec("T. completed upload lands in review queue (pending)", queue.status === 200 && queue.body?.data?.length >= 1 && count.body?.data?.pending >= 1, `queue ${queue.body?.data?.length}, pending ${count.body?.data?.pending}`);
  let approveOk = true;
  for (const q of queue.body?.data || []) {
    const a = await api(`/admin/photos/${q.id}/approve`, { method: "POST", body: JSON.stringify({}) }, adm.token);
    if (!(a.status >= 200 && a.status < 300 && a.body?.data?.status === "approved")) approveOk = false;
  }
  rec("T2. POST /admin/photos/:id/approve", approveOk, `approved ${queue.body?.data?.length} photo(s)`);
  const queue2 = await api("/admin/review/queue", {}, adm.token);
  const count2 = await api("/admin/review/count", {}, adm.token);
  rec("T3. queue empty after approval", queue2.body?.data?.length === 0 && count2.body?.data?.pending === 0, `queue ${queue2.body?.data?.length}, pending ${count2.body?.data?.pending}`);

  // 9. admin browse (photos are approved by now)
  const browse = await api("/admin/photos?status=approved", {}, adm.token);
  rec("P. GET /admin/photos (admin)", browse.status === 200 && browse.body?.meta?.total >= 1, `total ${browse.body?.meta?.total} summary ${JSON.stringify(browse.body?.meta?.summary || {})}`);
  const admPhotoId = browse.body?.data?.[0]?.id;
  const admPhoto = admPhotoId ? await api(`/admin/photos/${admPhotoId}`, {}, adm.token) : { status: 0, body: null };
  rec("Q. GET /admin/photos/:id detail", admPhoto.status === 200 && !!admPhoto.body?.data?.original_url, `status ${admPhoto.status}`);
  if (admPhoto.body?.data?.original_url) {
    const img = await fetch(admPhoto.body.data.original_url);
    rec("R. signed original_url fetch", img.status === 200, `status ${img.status}`);
  }
  const usr = await api(`/admin/users/${STUDENT_ID}`, {}, adm.token);
  rec("S. GET /admin/users/:id summary", usr.status === 200 && usr.body?.data?.photo_count >= 1, `photos ${usr.body?.data?.photo_count}`);

  // 10. removal request end-to-end
  const rep = admPhotoId ? await api(`/photos/${admPhotoId}/reports`, { method: "POST", body: JSON.stringify({ reason: "remove_me", notes: "gate run" }) }, stu.token) : { status: 0, body: null };
  rec("U. POST /photos/:id/reports (student)", rep.status >= 200 && rep.status < 300 && rep.body?.data?.status === "open", `status ${rep.status}`);
  const reports = await api("/admin/reports?status=open", {}, adm.token);
  const reportId = (reports.body?.data?.find((r) => r.photo?.id === admPhotoId) || reports.body?.data?.[0])?.id;
  rec("V. GET /admin/reports?status=open", reports.status === 200 && reports.body?.data?.length >= 1, `open ${reports.body?.data?.length}`);
  const resolve = reportId ? await api(`/admin/reports/${reportId}/resolve`, { method: "POST", body: JSON.stringify({ action: "remove", note: "gate run" }) }, adm.token) : { status: 0, body: null };
  rec("W. POST /admin/reports/:id/resolve (remove)", resolve.status >= 200 && resolve.status < 300 && resolve.body?.data?.status === "removed", `status ${resolve.body?.data?.status}`);
  if (admPhotoId) {
    const gone = await api(`/admin/photos/${admPhotoId}`, {}, adm.token);
    rec("X. removed photo no longer listed", gone.status === 404, `status ${gone.status}`);
  }

  // 11. authz matrix
  const s403 = await api("/admin/photos", {}, stu.token);
  rec("Y. student on admin endpoint -> 403", s403.status === 403 && s403.body?.error?.code === "FORBIDDEN", `status ${s403.status}`);
  const a403 = await api("/photos/mine", {}, adm.token);
  rec("Z. admin on student-only endpoint -> 403", a403.status === 403, `status ${a403.status}`);

  // 12. account patch
  const patch = await api("/me", { method: "PATCH", body: JSON.stringify({ notify_deadlines: false }) }, stu.token);
  rec("AA. PATCH /me notify toggle", patch.status === 200 && patch.body?.data?.notify_deadlines === false, `status ${patch.status}`);

  // cleanup: drop orphan photo rows left by earlier failed runs (no objects ever uploaded)
  try {
    const cleaned = await runSql(`delete from public.photos where upload_completed_at is null returning id`);
    console.log(`cleanup: removed ${cleaned.length} incomplete orphan photo row(s)`);
  } catch (e) { console.log("cleanup skipped:", e.message.slice(0, 80)); }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nGATE RESULT: ${passed}/${results.length} passed${seeded ? "  [note: users rows seeded directly — Clerk email identifier still disabled]" : ""}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => { console.error("GATE CRASH:", e.message); process.exit(2); });
