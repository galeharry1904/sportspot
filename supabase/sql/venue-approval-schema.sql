-- Run this in the Supabase SQL editor once. Adds the manual-approval
-- workflow for new venue applications: an admins table, the fields
-- collected at signup, a status column, and triggers that enforce the
-- approval boundary server-side (not just in the UI) so a pub owner can't
-- self-approve by editing the request payload.

-- ─── Admins ──────────────────────────────────────────────────────────────
-- Deliberately minimal — no signup flow. Add yourself once with:
--   insert into admins (user_id) values ('<your auth.users.id>');
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

-- security definer so it can read `admins` even though that table has no
-- public select policy of its own — callers only ever get a boolean back,
-- never row contents, so this doesn't leak who else is an admin.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
grant execute on function is_admin() to authenticated, anon;

-- ─── New pub fields ──────────────────────────────────────────────────────
alter table pubs
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists submitter_name text,
  add column if not exists submitter_position text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

-- Venues that existed before this workflow shipped were already operating
-- — grandfather them in as approved rather than locking managers out.
update pubs set status = 'approved' where status = 'pending';

-- ─── Enforce the approval boundary server-side ──────────────────────────
-- RLS alone isn't enough here: the existing UPDATE policy lets an owner
-- edit their own pub's name/address/etc, and there's no clean way in RLS
-- to allow "update this row" but forbid "change this one column" without
-- comparing old vs new — which is exactly what a trigger is for. This
-- also forces status back to 'pending' on INSERT even if a crafted
-- request tries to send status: 'approved' directly.
create or replace function protect_pub_status_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not is_admin() and auth.role() <> 'service_role' then
      new.status := 'pending';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      if not is_admin() and auth.role() <> 'service_role' then
        raise exception 'Only admins can change a venue''s approval status';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_pub_status on pubs;
create trigger guard_pub_status
  before insert or update on pubs
  for each row execute function protect_pub_status_column();

-- ─── Keep pending/rejected venues out of public reads ───────────────────
-- Restrictive policies AND together with whatever permissive SELECT
-- policy already exists (the one that lets the fan map read all pubs) —
-- this narrows that down to "approved, or it's your own venue, or you're
-- an admin" without needing to know or touch that existing policy.
drop policy if exists "pubs_select_restrict_to_approved_or_owner_or_admin" on pubs;
create policy "pubs_select_restrict_to_approved_or_owner_or_admin"
  on pubs as restrictive for select to public
  using (
    status = 'approved' or owner_id = auth.uid() or is_admin()
  );

-- ─── Let admins actually update venues they don't own ───────────────────
-- The trigger above stops non-admins changing `status`, but that alone
-- doesn't grant admins UPDATE access to rows they don't own — the
-- existing "owners can edit their own venue" policy only covers the
-- owner's own row, so an admin rejecting someone else's application would
-- otherwise match zero rows and silently do nothing.
drop policy if exists "pubs_update_admin" on pubs;
create policy "pubs_update_admin"
  on pubs for update to authenticated
  using (is_admin())
  with check (is_admin());

-- ─── Stats for the admin panel ──────────────────────────────────────────
-- auth.users isn't queryable by anon/authenticated roles directly, so this
-- needs security definer too. Checks is_admin() itself rather than relying
-- solely on the /admin page's own check, since any authenticated user
-- could otherwise call this RPC directly.
create or replace function admin_stats()
returns table (total_users bigint, pending_count bigint, approved_count bigint, rejected_count bigint)
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
      (select count(*) from auth.users) as total_users,
      (select count(*) from pubs where status = 'pending') as pending_count,
      (select count(*) from pubs where status = 'approved') as approved_count,
      (select count(*) from pubs where status = 'rejected') as rejected_count;
end;
$$;
grant execute on function admin_stats() to authenticated;

-- ─── Growth over time, for the admin panel's charts ─────────────────────
-- One row per calendar day from the earliest signup (user or vendor)
-- through today, with a running cumulative total for each — exactly what
-- a growth chart plots on a shared x-axis, without needing two separate
-- queries with different date ranges reconciled client-side.
create or replace function admin_growth_stats()
returns table (day date, total_users bigint, total_vendors bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_day date;
  users_running bigint := 0;
  vendors_running bigint := 0;
  u_count bigint;
  v_count bigint;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select min(created_at)::date into cur_day from auth.users;

  while cur_day <= current_date loop
    select count(*) into u_count from auth.users where created_at::date = cur_day;
    select count(*) into v_count from pubs where created_at::date = cur_day;

    users_running := users_running + coalesce(u_count, 0);
    vendors_running := vendors_running + coalesce(v_count, 0);

    day := cur_day;
    total_users := users_running;
    total_vendors := vendors_running;
    return next;

    cur_day := cur_day + 1;
  end loop;

  return;
end;
$$;
grant execute on function admin_growth_stats() to authenticated;

-- ─── User list, for the admin panel's "Total Users" drill-down ─────────
-- Vendor drill-downs (Total Vendors / Pending / Approved / Rejected) query
-- `pubs` directly from the client — admins already have full SELECT access
-- there via is_admin() in the restrictive policy above. Users need this
-- RPC instead since auth.users isn't reachable from the client at all.
create or replace function admin_list_users()
returns table (id uuid, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select au.id, au.email::text, au.created_at
    from auth.users au
    order by au.created_at desc;
end;
$$;
grant execute on function admin_list_users() to authenticated;

-- select * from admins;
-- select id, name, status, submitter_name, submitter_position, phone, contact_email, created_at from pubs order by created_at desc;
