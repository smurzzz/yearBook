begin;

-- Run the ENTIRE file in one execution (supabase test db, psql -f, or Ctrl+A → Run
-- in the Studio SQL editor). pgTAP keeps its plan in session state, so partial
-- runs (selection or statement-at-a-time) cannot work. No temp tables are used;
-- fixtures and helpers are created from the top of this file.
-- NOTE: data-modifying WITH clauses must be at the TOP LEVEL of a statement —
-- never nested inside is()/throws_ok() arguments.

create extension if not exists pgtap;

select plan(15);

-- ---------------------------------------------------------------------------
-- P3 gate: seed applied by `supabase db reset`
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.categories), 7, 'seed: 7 categories');
select is((select count(*)::int from public.clubs), 3, 'seed: 3 clubs');

-- ---------------------------------------------------------------------------
-- Fixtures (rolled back with the transaction)
-- ---------------------------------------------------------------------------
insert into public.users (id, email, full_name, consented_at, consent_version)
values ('u_alice', 'alice@student.stmichaels.edu.ph', 'Alice Tan', now(), 'v1'),
       ('u_bob', 'bob@student.stmichaels.edu.ph', 'Bob Cruz', now(), 'v1');

insert into public.events (name, description, deadline)
values ('Science Fair', 'Annual science fair submissions.', now() + interval '7 days');

create or replace function public.test_mk_photo(
  p_status text default 'pending',
  p_reason text default null,
  p_note text default null
) returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  insert into public.photos (
    uploader_id, event_id, category_id, client_id, batch_id,
    status, rejection_reason, rejection_note,
    consent_confirmed_at, original_path, thumb_path,
    width, height, original_bytes, thumb_bytes, upload_completed_at
  )
  select 'u_alice', e.id, c.id, gen_random_uuid(), gen_random_uuid(),
         p_status, p_reason, p_note,
         now(), 'orig/' || gen_random_uuid() || '.jpg', 'thumb/' || gen_random_uuid() || '.jpg',
         800, 600, 100000, 20000, now()
  from public.events e
  cross join public.categories c
  order by e.created_at desc, c.sort_order
  limit 1
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- BR-05: rejected needs a reason; "other" needs a note
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.test_mk_photo('rejected')$$,
  '23514', null,
  'rejected photo without a reason is blocked (rejected_has_reason)'
);

select throws_ok(
  $$select public.test_mk_photo('pending', 'blurry')$$,
  '23514', null,
  'non-rejected photo carrying a reason is blocked (rejected_has_reason)'
);

select throws_ok(
  $$select public.test_mk_photo('rejected', 'other', '   ')$$,
  '23514', null,
  'reason "other" with a blank note is blocked (other_needs_note)'
);

select isnt(
  public.test_mk_photo('rejected', 'blurry'),
  null::uuid,
  'rejected photo with a reason inserts'
);

select isnt(
  public.test_mk_photo('rejected', 'other', 'Photo is too small to publish.'),
  null::uuid,
  'reason "other" with a note inserts'
);

-- ---------------------------------------------------------------------------
-- BR-07: one open removal request per photo/reporter
-- Each assertion is self-contained; WITH wraps the statement (top level) and
-- the pgTAP call sits in the select list.
-- ---------------------------------------------------------------------------
with p as (select public.test_mk_photo('pending') as pid),
     ins as (
       insert into public.reports (photo_id, reporter_id, reason)
       select pid, 'u_bob', 'remove_me' from p
       returning 1
     )
select is(
  (select count(*)::int from ins),
  1,
  'first open removal request inserts'
);

select throws_ok(
  $q$
    with p as (select public.test_mk_photo('pending') as pid),
         first_report as (
           insert into public.reports (photo_id, reporter_id, reason)
           select pid, 'u_bob', 'remove_me' from p
           returning 1
         ),
         duplicate as (
           insert into public.reports (photo_id, reporter_id, reason)
           select pid, 'u_bob', 'remove_me' from p
           returning 1
         )
    select count(*) from duplicate
  $q$,
  '23505', null,
  'a second open request from the same reporter is blocked (reports_one_open_per_reporter)'
);

with p as (select public.test_mk_photo('pending') as pid),
     bob as (
       insert into public.reports (photo_id, reporter_id, reason)
       select pid, 'u_bob', 'remove_me' from p
       returning 1
     ),
     alice as (
       insert into public.reports (photo_id, reporter_id, reason)
       select pid, 'u_alice', 'inappropriate' from p
       returning 1
     )
select is(
  (select count(*)::int from alice),
  1,
  'a different reporter may open their own request on the same photo'
);

-- ---------------------------------------------------------------------------
-- Security posture: RLS on everywhere, zero policies, private bucket
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in ('clubs','categories','users','admin_emails','events',
                        'photos','reports','notifications','push_tokens')
      and c.relrowsecurity),
  9,
  'RLS is enabled on all nine tables'
);

select is(
  (select count(*)::int from pg_policies where schemaname = 'public'),
  0,
  'no RLS policies defined — deny-all for PostgREST roles'
);

select ok(
  not (select public from storage.buckets where id = 'yearbook-photos'),
  'yearbook-photos bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'yearbook-photos'),
  5242880::bigint,
  'bucket file size limit is 5 MB'
);

select ok(
  (select allowed_mime_types = array['image/jpeg'] from storage.buckets where id = 'yearbook-photos'),
  'bucket accepts JPEG only'
);

select * from finish();

rollback;
