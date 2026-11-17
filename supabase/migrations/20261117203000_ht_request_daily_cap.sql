-- Website booking requests: add a daily cap of 150 per hotel on top of the
-- hourly limits (3 per phone, 40 per hotel). Inserts for one hotel are
-- serialized with a transaction lock so parallel requests cannot slip past
-- the counts.
create index if not exists ht_booking_requests_created_idx
  on public.ht_booking_requests (tenant_id, created_at desc);

create or replace function private.ht_booking_request_guard() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_phone int; v_hour int; v_day int;
begin
  new.status := 'new'; new.stay_id := null; new.handled_by := null; new.created_at := now();
  perform pg_advisory_xact_lock(hashtextextended('ht_booking_requests:' || new.tenant_id::text, 0));
  select count(*) filter (where phone = new.phone and created_at > now() - interval '1 hour'),
         count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into v_phone, v_hour, v_day
    from public.ht_booking_requests
   where tenant_id = new.tenant_id and created_at > now() - interval '1 day';
  if v_phone >= 3 or v_hour >= 40 or v_day >= 150 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.ht_booking_request_guard() from public, anon, authenticated;
