-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It creates the table for stories and a private bucket for photos.

create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  author_name text not null,
  event_date  date not null,
  photo_id    uuid,
  created_at  timestamptz not null default now()
);

-- The newsletter is always read newest-first.
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
