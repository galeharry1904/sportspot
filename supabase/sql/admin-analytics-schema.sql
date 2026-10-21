-- Run this in the Supabase SQL editor once. Adds fan-facing analytics RPCs
-- for the admin panel: favourite teams/sports breakdowns, a London-area
-- breakdown of where fans are planning to be, and a most-saved-venues
-- leaderboard — the metrics that actually help pitch SportSpot to pubs.
--
-- Same shape as the existing admin_stats()/admin_growth_stats() in
-- venue-approval-schema.sql: security definer, is_admin()-gated, granted to
-- authenticated only (never anon) since these aggregate personal fan data.

-- ─── Favourite teams, for "which teams should we target pubs near" ────────
create or replace function admin_team_popularity()
returns table (team text, fan_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select t.team, count(*)::bigint as fan_count
    from fan_profiles fp, unnest(fp.favourite_teams) as t(team)
    group by t.team
    order by fan_count desc, t.team asc;
end;
$$;
grant execute on function admin_team_popularity() to authenticated;

-- ─── Favourite sports, same idea but coarser ───────────────────────────────
create or replace function admin_sport_popularity()
returns table (sport text, fan_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select s.sport, count(*)::bigint as fan_count
    from fan_profiles fp, unnest(fp.favourite_sports) as s(sport)
    group by s.sport
    order by fan_count desc, s.sport asc;
end;
$$;
grant execute on function admin_sport_popularity() to authenticated;

-- ─── Where fans are based ───────────────────────────────────────────────────
-- fan_profiles has no postcode/location field of its own, so this is built
-- from two existing real signals instead of asking fans for anything new:
--   - itinerary_stops: explicit "I'll be here" pins from the day planner
--   - saved_pub_ids: pubs a fan has bookmarked, via that pub's lat/lng
-- Both get bucketed to the nearest of ~38 well-known London areas (plain
-- nearest-centroid match — plenty precise for a marketing breakdown, no
-- geocoding API needed). Longitude is scaled by cos(51.5°N) ≈ 0.62 so
-- east-west distance isn't overweighted relative to north-south at this
-- latitude. Returns aggregated counts only, never raw per-fan coordinates —
-- this is a security-definer RPC specifically so individual fan locations
-- in itinerary_stops/fan_profiles (both owner-only RLS) never reach the
-- client directly.
create or replace function admin_fan_locations()
returns table (area text, fan_count bigint, signal_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    with areas(name, lat, lng) as (
      values
        ('Shoreditch', 51.5255, -0.0776), ('Islington', 51.5416, -0.1022),
        ('Camden', 51.5390, -0.1426), ('King''s Cross', 51.5308, -0.1238),
        ('Clerkenwell', 51.5225, -0.1052), ('City of London', 51.5155, -0.0922),
        ('Soho', 51.5136, -0.1365), ('Covent Garden', 51.5117, -0.1240),
        ('Fitzrovia', 51.5190, -0.1390), ('Marylebone', 51.5225, -0.1631),
        ('Mayfair', 51.5100, -0.1499), ('Westminster', 51.4975, -0.1357),
        ('Pimlico', 51.4913, -0.1337), ('Chelsea', 51.4875, -0.1687),
        ('Kensington', 51.5009, -0.1925), ('Notting Hill', 51.5094, -0.1960),
        ('Paddington', 51.5154, -0.1755), ('Fulham', 51.4790, -0.1950),
        ('Hammersmith', 51.4920, -0.2230), ('Clapham', 51.4618, -0.1383),
        ('Brixton', 51.4620, -0.1150), ('Peckham', 51.4730, -0.0690),
        ('Greenwich', 51.4810, -0.0090), ('Hackney', 51.5450, -0.0553),
        ('Dalston', 51.5460, -0.0750), ('Bethnal Green', 51.5270, -0.0555),
        ('Canary Wharf', 51.5054, -0.0235), ('Stratford', 51.5416, -0.0042),
        ('Walthamstow', 51.5886, -0.0196), ('Tottenham', 51.5886, -0.0680),
        ('Wimbledon', 51.4214, -0.2064), ('Richmond', 51.4613, -0.3037),
        ('Ealing', 51.5130, -0.3050), ('Wembley', 51.5528, -0.2818),
        ('Croydon', 51.3714, -0.0977), ('Bromley', 51.4039, 0.0198),
        ('Battersea', 51.4740, -0.1630), ('Southwark', 51.5035, -0.0804)
    ),
    points as (
      select user_id, latitude as lat, longitude as lng
      from itinerary_stops
      union all
      select fp.user_id, p.latitude, p.longitude
      from fan_profiles fp
      cross join lateral unnest(fp.saved_pub_ids) as pub_id
      join pubs p on p.id = pub_id
      where p.latitude is not null and p.longitude is not null
    ),
    nearest as (
      select
        pt.user_id,
        (
          select a.name from areas a
          order by (a.lat - pt.lat) ^ 2 + ((a.lng - pt.lng) * 0.62) ^ 2 asc
          limit 1
        ) as area
      from points pt
    )
    select n.area, count(distinct n.user_id)::bigint as fan_count, count(*)::bigint as signal_count
    from nearest n
    group by n.area
    order by fan_count desc, signal_count desc;
end;
$$;
grant execute on function admin_fan_locations() to authenticated;

-- ─── Most-saved venues ───────────────────────────────────────────────────
-- Direct pitch material for vendors: "N fans have already bookmarked your
-- pub on SportSpot." Only approved venues — a pending/rejected one isn't
-- live for fans to save in the first place.
create or replace function admin_pub_popularity()
returns table (pub_id uuid, pub_name text, save_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select p.id as pub_id, p.name as pub_name, count(*)::bigint as save_count
    from fan_profiles fp
    cross join lateral unnest(fp.saved_pub_ids) as saved_id
    join pubs p on p.id = saved_id
    where p.status = 'approved'
    group by p.id, p.name
    order by save_count desc, p.name asc;
end;
$$;
grant execute on function admin_pub_popularity() to authenticated;

-- ─── Fan-side overview numbers ─────────────────────────────────────────────
-- A second stat-tile row alongside the existing Total Users/Vendors —
-- total_users in admin_stats() is every account (fans + vendors + admin)
-- undifferentiated, this is specifically the fan-activity half of that.
create or replace function admin_fan_stats()
returns table (total_fan_profiles bigint, total_planned_stops bigint, total_saved_pubs bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select
      (select count(*) from fan_profiles) as total_fan_profiles,
      (select count(*) from itinerary_stops) as total_planned_stops,
      (select coalesce(sum(array_length(saved_pub_ids, 1)), 0) from fan_profiles) as total_saved_pubs;
end;
$$;
grant execute on function admin_fan_stats() to authenticated;

-- select * from admin_team_popularity();
-- select * from admin_sport_popularity();
-- select * from admin_fan_locations();
-- select * from admin_pub_popularity();
-- select * from admin_fan_stats();
