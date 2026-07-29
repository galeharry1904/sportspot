-- Run this once in the Supabase SQL editor before deploying sync-football-news.

create table if not exists news (
  id bigint generated always as identity primary key,
  title text not null,
  summary text,
  url text not null unique,
  image_url text,
  source text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table news enable row level security;

drop policy if exists "News is viewable by everyone" on news;
create policy "News is viewable by everyone"
  on news for select
  using (true);

-- select * from news order by published_at desc limit 10;
