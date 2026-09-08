-- Day planner: fans build a simple itinerary of where they'll be and when,
-- then get pub suggestions for a fixture based on whichever stop is
-- closest in time to kickoff. Structured-form v1 — no AI parsing yet, just
-- a pin-drop + time per stop.

create table if not exists itinerary_stops (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null default current_date,
  label text not null,
  latitude double precision not null,
  longitude double precision not null,
  stop_time time not null,
  created_at timestamptz not null default now()
);

alter table itinerary_stops enable row level security;

-- Itinerary data is personal planning info, not something any other fan,
-- venue, or admin needs to see — owner-only, full stop.
drop policy if exists "itinerary_stops_owner_all" on itinerary_stops;
create policy "itinerary_stops_owner_all"
  on itinerary_stops for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- select * from itinerary_stops where user_id = auth.uid() order by stop_time;
