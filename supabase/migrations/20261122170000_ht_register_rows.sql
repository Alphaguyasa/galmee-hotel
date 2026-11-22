-- The police guest register for one night: every guest who was in the hotel that night
-- (checked in on or before the date, not checked out before the next day), in ledger
-- order, plus the audit row written when the register is printed.

create function public.ht_register_rows(p_date date)
returns table (
  stay_id uuid, room_number text, guest_name text, nationality text,
  id_type text, id_number text, coming_from text, going_to text, purpose text,
  checked_in_at timestamptz, expected_departure date, checked_out_at timestamptz
)
language sql stable security invoker set search_path = public, private as $$
  select s.id, r.number, c.name, s.nationality, s.id_type, s.id_number,
         s.coming_from, s.going_to, s.purpose, s.checked_in_at, s.check_out, s.checked_out_at
    from ht_stays s
    join ht_rooms r on r.tenant_id = s.tenant_id and r.id = s.room_id
    join customers c on c.id = s.customer_id
   where s.tenant_id = (select private.current_tenant())
     and s.checked_in_at is not null
     and s.status in ('in_house', 'checked_out')
     and (s.checked_in_at at time zone 'Africa/Addis_Ababa')::date <= p_date
     and (s.checked_out_at is null or (s.checked_out_at at time zone 'Africa/Addis_Ababa')::date > p_date)
   order by r.number, s.checked_in_at
   limit 500
$$;

create function private.ht_log_register_print(p_date date)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v_id uuid;
begin
  if p_date is null or p_date > private.ht_today() + 1 or p_date < private.ht_today() - 3660 then
    raise exception 'bad_dates';
  end if;
  insert into ht_register_prints (tenant_id, kind, register_date, printed_by)
  values (v_tenant, 'register', p_date, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create function public.ht_log_register_print(p_date date)
returns uuid language sql security invoker set search_path = public, private as $$
  select private.ht_log_register_print(p_date)
$$;

revoke all on function public.ht_register_rows(date) from public, anon;
grant execute on function public.ht_register_rows(date) to authenticated;
revoke all on function private.ht_log_register_print(date) from public, anon;
grant execute on function private.ht_log_register_print(date) to authenticated;
revoke all on function public.ht_log_register_print(date) from public, anon;
grant execute on function public.ht_log_register_print(date) to authenticated;
