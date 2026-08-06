-- Run this in the Supabase SQL editor once, after venue-approval-schema.sql
-- has been run and the notify-admin-new-venue function is deployed. Fires
-- immediately on every new venue application (unlike the cron-scheduled
-- jobs elsewhere in supabase/sql/, this needs to happen right away so you
-- see the application promptly, not on the next scheduled tick).

create or replace function notify_admin_new_venue_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://prlrakhymwfuffazjtxm.supabase.co/functions/v1/notify-admin-new-venue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybHJha2h5bXdmdWZmYXpqdHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4MDA4OCwiZXhwIjoyMDg4MDU2MDg4fQ.E3WQtd0G60aBvjBwOjZ6VU5yIAdON5dOu2h__Cve8_k'
    ),
    body := jsonb_build_object('pub_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_pub_application_created on pubs;
create trigger on_pub_application_created
  after insert on pubs
  for each row execute function notify_admin_new_venue_application();

-- select * from cron.job_run_details order by start_time desc limit 5; -- not relevant here (no cron), but net.http_post request status can be checked with:
-- select * from net._http_response order by created desc limit 5;
-- drop trigger if exists on_pub_application_created on pubs; -- to disable
