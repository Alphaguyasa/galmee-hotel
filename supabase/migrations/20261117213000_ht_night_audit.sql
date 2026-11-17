-- Night audit: reception closes each hotel day once. Closing stores a snapshot
-- of the night (rooms, in house, arrivals, departures, income, extras) and flags
-- what needs attention: reservations that never arrived, guests past their
-- check-out date, and in-house guests who owe money. The hotel date then moves
-- to the next day. Closed nights cannot be changed.

create table public.ht_night_audits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  business_date date not null,
  report jsonb not null,
  closed_by uuid default auth.uid(),
  closed_at timestamptz not null default now(),
  unique (tenant_id, business_date),
  unique (tenant_id, id)
);

alter table public.ht_night_audits enable row level security;
revoke all on public.ht_night_audits from anon;
revoke insert, update, delete, truncate on public.ht_night_audits from authenticated;
create policy ht_night_audits_sel on public.ht_night_audits for select to authenticated
  using (tenant_id = (select private.current_tenant()));

-- The hotel day waiting to be closed: the day after the last closed one, or for
-- a hotel that never closed a day, today (before 06:00 it is still last night).
create function private.ht_business_date(p_tenant uuid) returns date
language sql stable set search_path = public, private as $$
  select coalesce(
    (select max(business_date) + 1 from ht_night_audits where tenant_id = p_tenant),
    ((now() - interval '6 hours') at time zone 'Africa/Addis_Ababa')::date)
$$;

-- The night report for one tenant and day. Lists hold at most 50 rows each.
create function private.ht_night_report(p_tenant uuid, p_day date) returns jsonb
language sql stable set search_path = public, private as $$
  with s as (
    select st.*, r.number as room, c.name as guest
      from ht_stays st
      join ht_rooms r on r.tenant_id = st.tenant_id and r.id = st.room_id
      join customers c on c.id = st.customer_id
     where st.tenant_id = p_tenant
  ),
  owed as (
    select s.id, s.room, s.guest,
           round(greatest(1, p_day + 1 - s.check_in) * s.nightly_rate, 2)
           + coalesce((select sum(amount) from ht_stay_charges x where x.tenant_id = p_tenant and x.stay_id = s.id), 0)
           - coalesce((select sum(amount) from ht_stay_payments x where x.tenant_id = p_tenant and x.stay_id = s.id), 0) as balance
      from s where s.status = 'in_house'
  )
  select jsonb_build_object(
    'business_date', p_day,
    'rooms', (select count(*) from ht_rooms where tenant_id = p_tenant and in_service),
    'in_house', (select count(*) from s where status = 'in_house'),
    'arrivals', (select count(*) from s where status in ('in_house','checked_out')
                  and (checked_in_at at time zone 'Africa/Addis_Ababa')::date = p_day),
    'departures', (select count(*) from s where status = 'checked_out'
                  and (checked_out_at at time zone 'Africa/Addis_Ababa')::date = p_day),
    'income', (select coalesce(sum(amount), 0) from ht_stay_payments where tenant_id = p_tenant
                  and (created_at at time zone 'Africa/Addis_Ababa')::date = p_day),
    'extras', (select coalesce(sum(amount), 0) from ht_stay_charges where tenant_id = p_tenant
                  and (created_at at time zone 'Africa/Addis_Ababa')::date = p_day),
    'no_shows', coalesce((select jsonb_agg(jsonb_build_object('stay', id, 'room', room, 'guest', guest, 'date', check_in) order by check_in, room)
                  from (select * from s where status = 'reserved' and check_in <= p_day order by check_in, room limit 50) q), '[]'::jsonb),
    'overstays', coalesce((select jsonb_agg(jsonb_build_object('stay', id, 'room', room, 'guest', guest, 'date', check_out) order by check_out, room)
                  from (select * from s where status = 'in_house' and check_out <= p_day order by check_out, room limit 50) q), '[]'::jsonb),
    'owing', coalesce((select jsonb_agg(jsonb_build_object('stay', id, 'room', room, 'guest', guest, 'balance', balance) order by balance desc)
                  from (select * from owed where balance > 0 order by balance desc limit 50) q), '[]'::jsonb)
  )
$$;

-- What closing now would record, without closing.
create function private.ht_night_audit_preview() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant();
begin
  return private.ht_night_report(v_tenant, private.ht_business_date(v_tenant));
end $$;

-- Closes the hotel day. A day cannot be closed before it starts, and two
-- people closing at once get one audit (the second gets 'already_closed').
create function private.ht_close_night() returns uuid
language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v_day date; v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('ht_night_audits:' || v_tenant::text, 0));
  v_day := private.ht_business_date(v_tenant);
  if v_day > private.ht_today() then raise exception 'already_closed' using errcode = 'P0001'; end if;
  insert into ht_night_audits(tenant_id, business_date, report)
  values (v_tenant, v_day, private.ht_night_report(v_tenant, v_day)) returning id into v_id;
  return v_id;
end $$;

revoke all on function private.ht_business_date(uuid), private.ht_night_report(uuid, date) from public, anon, authenticated;
revoke all on function private.ht_night_audit_preview(), private.ht_close_night() from public, anon;
grant execute on function private.ht_night_audit_preview(), private.ht_close_night() to authenticated;

create function public.ht_night_audit_preview() returns jsonb
language sql stable security invoker set search_path = public, private as $$ select private.ht_night_audit_preview() $$;
create function public.ht_close_night() returns uuid
language sql security invoker set search_path = public, private as $$ select private.ht_close_night() $$;
revoke all on function public.ht_night_audit_preview(), public.ht_close_night() from public, anon;
grant execute on function public.ht_night_audit_preview(), public.ht_close_night() to authenticated;
