-- Run this in the Supabase SQL editor once. Adds a facilities checklist
-- venues can publicise (beer garden, pool table, dog friendly, etc.) —
-- stored as an array of facility ids matching lib/facilities.js, rather
-- than the hardcoded placeholder list the fan map used to show for every
-- pub regardless of what that venue actually offers.

alter table pubs
  add column if not exists facilities text[] not null default '{}';

-- select id, name, facilities from pubs order by created_at desc;
