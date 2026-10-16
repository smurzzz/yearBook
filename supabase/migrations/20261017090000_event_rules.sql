-- P6 contract change (docs/technical/api.md §3 GET /events, data-model.md §5):
-- every EventDTO carries `rules: string[]` for the Event Detail sheet.
-- Server-managed: services/events.ts derives the defaults from max_photos
-- whenever the column is empty, so existing rows need no backfill.

alter table public.events
  add column if not exists rules text[] not null default '{}';

comment on column public.events.rules is
  'Submission rules shown in the Event Detail sheet; derived from max_photos when empty.';
