-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It creates the table for stories and a private bucket for photos.

create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  author_name text not null,
  event_date  date not null,
  -- Up to a few photos per story, in the order they were chosen.
  photo_ids   uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  -- Set when a story is taken down. The row is kept, so a story removed by
  -- mistake can be put back by clearing this column.
  deleted_at  timestamptz
);

-- For databases created before stories could be removed.
alter table public.articles add column if not exists deleted_at timestamptz;

-- For databases created when a story could hold only one photo. The old
-- photo_id column is left alone so nothing is lost.
alter table public.articles
  add column if not exists photo_ids uuid[] not null default '{}';

-- Only runs on a database that still has the old single-photo column; a
-- brand new one skips it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'articles'
       and column_name = 'photo_id'
  ) then
    update public.articles
       set photo_ids = array[photo_id]
     where photo_id is not null
       and cardinality(photo_ids) = 0;
  end if;
end $$;

-- The newsletter is always read newest-first, and never shows removed stories.
create index if not exists articles_by_date
  on public.articles (event_date desc, created_at desc);

-- Lock the table down. No policies are defined on purpose: the only thing
-- allowed to touch it is the server, using the service role key, which
-- bypasses row level security. Nothing in a browser can reach this data.
alter table public.articles enable row level security;

-- A private bucket for story photos. The website streams them through its
-- own /api/photo route so the family login still applies.
insert into storage.buckets (id, name, public)
values ('article-photos', 'article-photos', false)
on conflict (id) do nothing;
