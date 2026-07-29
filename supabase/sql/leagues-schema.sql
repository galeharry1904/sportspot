-- Run this once in the Supabase SQL editor before deploying the
-- sync-results-and-standings function or the historical backfill.

-- A fixture becomes a result once it's been played — same row, not a
-- separate table, so there's one source of truth per match.
alter table fixtures
  add column if not exists home_score integer,
  add column if not exists away_score integer,
  add column if not exists status text not null default 'SCHEDULED';

-- One row per team per competition per season.
create table if not exists standings (
  id bigint generated always as identity primary key,
  competition text not null,
  season text not null,
  team text not null,
  position integer not null,
  played integer not null default 0,
  won integer not null default 0,
  drawn integer not null default 0,
  lost integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,
  points integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (competition, season, team)
);

alter table standings enable row level security;

drop policy if exists "Standings are viewable by everyone" on standings;
create policy "Standings are viewable by everyone"
  on standings for select
  using (true);

-- Sanity checks after running:
--   select column_name from information_schema.columns where table_name = 'fixtures';
--   select * from standings limit 5;
