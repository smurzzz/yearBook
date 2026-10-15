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
