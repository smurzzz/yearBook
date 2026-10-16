# Database (Supabase Postgres)

- Engine: Postgres (Supabase). Accessed **only by the API** via `DATABASE_URL` (pooled, port 6543, `prepare: false`).
- Migrations: `supabase/migrations/*.sql` (timestamp-prefixed). Schema changes only through migrations.
- All tables have RLS **enabled with no policies** (deny-all for PostgREST roles). The API connects as a privileged role.
- Timestamps are `timestamptz` (UTC).

## 1. Migration `0001_init.sql`

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- Lookups (seeded)
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

-- Users (id = Clerk user id)
create table public.users (
  id text primary key,
  email text not null unique check (email = lower(email)),
  full_name text not null check (char_length(full_name) between 1 and 80),
  avatar_url text,
  role text not null default 'student' check (role in ('student','admin')),
  club_id uuid references public.clubs(id) on delete set null,
  consented_at timestamptz not null,
  consent_version text not null,
  notify_deadlines boolean not null default true,
  notify_reviews boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated before update on public.users
  for each row execute function public.set_updated_at();
create index users_role_idx on public.users(role);
create index users_name_trgm on public.users using gin (full_name gin_trgm_ops);

-- Emails that become admin on first sign-in
create table public.admin_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null check (char_length(description) between 1 and 600),
  cover_key text not null default 'sports' check (cover_key in ('sports','festival','graduation','science')),
  deadline timestamptz not null,
  max_photos int not null default 10 check (max_photos between 1 and 50),
  is_open boolean not null default true,
  rules text[] not null default '{}',             -- submission rules for the detail sheet (server-managed)
  created_by text references public.users(id) on delete set null,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_at();
create index events_deadline_idx on public.events(deadline);

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  uploader_id text not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  club_id uuid references public.clubs(id) on delete set null,
  client_id uuid not null,                       -- idempotency key from the app
  batch_id uuid not null,                        -- photos submitted together
  caption text not null default '' check (char_length(caption) <= 200),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text check (rejection_reason in
    ('blurry','too_dark','inappropriate','duplicate','wrong_event','low_resolution','other')),
  rejection_note text check (char_length(rejection_note) <= 300),
  reviewed_by text references public.users(id) on delete set null,
  reviewed_at timestamptz,
  consent_confirmed_at timestamptz not null,
  original_path text not null,
  thumb_path text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  original_bytes int not null check (original_bytes > 0 and original_bytes <= 5242880),
  thumb_bytes int not null check (thumb_bytes > 0 and thumb_bytes <= 307200),
  replaces_photo_id uuid references public.photos(id) on delete set null,
  upload_completed_at timestamptz,               -- null = incomplete (invisible)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (uploader_id, client_id),
  constraint rejected_has_reason check (
    (status = 'rejected' and rejection_reason is not null)
    or (status <> 'rejected' and rejection_reason is null and rejection_note is null)),
  constraint other_needs_note check (
    rejection_reason is distinct from 'other' or char_length(coalesce(trim(rejection_note), '')) > 0)
);
create trigger photos_updated before update on public.photos
  for each row execute function public.set_updated_at();
create index photos_uploader_idx on public.photos(uploader_id, created_at desc, id desc)
  where upload_completed_at is not null;
create index photos_queue_idx on public.photos(created_at, id)
  where status = 'pending' and upload_completed_at is not null;
create index photos_event_idx on public.photos(event_id) where upload_completed_at is not null;
create index photos_status_idx on public.photos(status);
create index photos_category_idx on public.photos(category_id);
create index photos_club_idx on public.photos(club_id);
create index photos_batch_idx on public.photos(batch_id);
create index photos_incomplete_idx on public.photos(created_at) where upload_completed_at is null;
create index photos_caption_trgm on public.photos using gin (caption gin_trgm_ops);

-- Removal requests (reports)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references public.photos(id) on delete set null,
  reporter_id text not null references public.users(id) on delete cascade,
  reason text not null check (reason in ('remove_me','inappropriate','wrong_tag','copyright','other')),
  notes text check (char_length(notes) <= 300),
  status text not null default 'open' check (status in ('open','removed','dismissed')),
  resolution_note text,
  resolved_by text references public.users(id) on delete set null,
  resolved_at timestamptz,
  photo_snapshot jsonb not null default '{}'::jsonb,   -- {event_name, caption, uploader_name}
  created_at timestamptz not null default now()
);
create unique index reports_one_open_per_reporter
  on public.reports(photo_id, reporter_id) where status = 'open';
create index reports_status_idx on public.reports(status, created_at desc);
create index reports_photo_idx on public.reports(photo_id);

-- In-app notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  type text not null check (type in ('photo_needs_replacement','deadline_reminder','report_resolved')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,      -- {photo_id?, event_id?, report_id?}
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- Push tokens
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  expo_token text not null unique,
  platform text not null check (platform in ('android','ios')),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens(user_id);

-- RLS: enable everywhere, define NO policies (deny-all for anon/authenticated)
alter table public.clubs enable row level security;
alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.admin_emails enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

-- Private storage bucket (JPEG only, 5 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yearbook-photos', 'yearbook-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
-- No storage.objects policies: only the service role (API) can touch objects.
```

## 2. Seed `supabase/seed.sql`

```sql
insert into public.categories (name, sort_order) values
  ('Sports',1),('Academics',2),('Candid',3),('Graduation',4),('Clubs',5),('Culture',6),('Other',7)
on conflict (name) do nothing;
insert into public.clubs (name, sort_order) values
  ('Drama Club',1),('Robotics Club',2),('Photography Club',3)
on conflict (name) do nothing;
-- insert into public.admin_emails (email) values ('committee.head@school.edu');   -- fill with real admins (lowercase)
```

## 3. Query patterns (reference)

```sql
-- Effective event status
select e.*, (e.is_open and now() < e.deadline) as is_effectively_open from events e;

-- Per-student photos in an event (BR-02), excluding the photo being replaced and stale incomplete rows
select count(*) from photos
where uploader_id = $1 and event_id = $2
  and (upload_completed_at is not null or created_at > now() - interval '24 hours')
  and id is distinct from $3;   -- $3 = replaced photo id or null

-- Storage usage (BR-09)
select coalesce(sum(original_bytes + thumb_bytes), 0)::bigint as bytes from photos;

-- batch_size for the stack badge (P2)
select p.*, count(*) over (partition by p.batch_id) as batch_size from photos p where upload_completed_at is not null;

-- Admin summary counts over the same filtered set (build WHERE once; reuse in two queries)
select status, count(*) from photos p join users u on u.id = p.uploader_id
where upload_completed_at is not null /* + filters */ group by status;

-- Search (caption or uploader name), case-insensitive
... and (p.caption ilike '%' || $q || '%' or u.full_name ilike '%' || $q || '%')   -- escape % and _ in $q

-- Reported filter
... and exists (select 1 from reports r where r.photo_id = p.id and r.status = 'open')

-- Pending count for tab badge
select count(*) from photos where status = 'pending' and upload_completed_at is not null;

-- Keyset pagination (created_at desc, id desc)
... and (p.created_at, p.id) < ($cursorCreatedAt, $cursorId) order by p.created_at desc, p.id desc limit $n
```

Escape `%`, `_`, `\` in user search text before `ilike`. Always parameterize.

## 4. Cascade & delete rules

| Action       | Effect                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Delete user  | Deletes their photos, reports they filed, notifications, push tokens (API deletes storage files first) |
| Delete event | Deletes its photos (API deletes files first)                                                           |
| Delete photo | Reports keep `photo_id = null` and a `photo_snapshot`; replaced-by links set null                      |
| Delete club  | `users.club_id` and `photos.club_id` set null (not exposed in app)                                     |

## 5. Data retention & purge

Retain until yearbook publication + 90 days (OQ-4), then run the purge runbook in `deployment/backup-recovery.md` §5.

## 6. Connection settings (API)

`postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 })`. Create the client once per module (reused across warm invocations).
