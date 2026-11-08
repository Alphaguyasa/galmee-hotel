-- Galmee Hotel server logic. Writes to stays, charges and payments run as private
-- SECURITY DEFINER functions with explicit tenant and role checks; each is exposed
-- through a thin SECURITY INVOKER wrapper in public.

create function private.ht_today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Africa/Addis_Ababa')::date $$;
revoke all on function private.ht_today() from public, anon;
grant execute on function private.ht_today() to authenticated;

create function private.ht_noon(p_day date) returns timestamptz
language sql immutable set search_path = '' as $$ select (p_day + time '12:00') at time zone 'Africa/Addis_Ababa' $$;
revoke all on function private.ht_noon(date) from public, anon;
grant execute on function private.ht_noon(date) to authenticated;

create function private.ht_require_tenant() returns uuid
language plpgsql stable set search_path = public, private as $$
declare v uuid := private.current_tenant();
begin
  if v is null then raise exception 'not_a_member' using errcode = '42501'; end if;
  return v;
end $$;
revoke all on function private.ht_require_tenant() from public, anon;
grant execute on function private.ht_require_tenant() to authenticated;

-- New stay (reservation or walk-in). Core bookings' exclusion constraint blocks double booking.
create function private.ht_create_stay(
  p_room uuid, p_customer uuid, p_guest_name text, p_guest_phone text, p_check_in date, p_check_out date,
  p_rate_plan uuid, p_nightly_rate numeric, p_adults int, p_children int, p_id_type text, p_id_number text,
  p_nationality text, p_source text, p_notes text, p_check_in_now boolean, p_client_ref uuid, p_request uuid
) returns uuid language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.ht_require_tenant();
  v_role user_role := private.current_app_role();
  v_room ht_rooms%rowtype;
  v_rate numeric(12,2);
  v_plan uuid := p_rate_plan;
  v_customer uuid := p_customer;
  v_booking uuid;
  v_stay uuid;
  v_status text := case when p_check_in_now then 'in_house' else 'reserved' end;
begin
  if p_check_out <= p_check_in then raise exception 'bad_dates'; end if;
  if p_check_out > p_check_in + 366 then raise exception 'bad_dates'; end if;
  if p_check_in_now and p_check_in <> private.ht_today() then raise exception 'check_in_today_only'; end if;
  if p_client_ref is not null then
    select id into v_stay from ht_stays where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_stay; end if;
  end if;

  select * into v_room from ht_rooms where id = p_room and tenant_id = v_tenant for share;
  if not found then raise exception 'room_not_found'; end if;
  if not v_room.in_service then raise exception 'room_out_of_service'; end if;

  if v_plan is not null then
    select nightly_rate into v_rate from ht_rate_plans
     where id = v_plan and tenant_id = v_tenant and room_type_id = v_room.room_type_id and active;
    if not found then raise exception 'rate_not_found'; end if;
  else
    select id, nightly_rate into v_plan, v_rate from ht_rate_plans
     where tenant_id = v_tenant and room_type_id = v_room.room_type_id and is_default and active limit 1;
  end if;
  if p_nightly_rate is not null and p_nightly_rate is distinct from v_rate then
    if v_role not in ('owner','manager') then raise exception 'rate_override_not_allowed'; end if;
    if p_nightly_rate < 0 then raise exception 'bad_rate'; end if;
    v_rate := p_nightly_rate;
  end if;
  if v_rate is null then raise exception 'rate_not_found'; end if;

  if v_customer is null then
    if coalesce(btrim(p_guest_name), '') = '' then raise exception 'guest_required'; end if;
    if p_guest_phone is not null then
      select id into v_customer from customers where tenant_id = v_tenant and phone = p_guest_phone order by created_at limit 1;
    end if;
    if v_customer is null then
      insert into customers(tenant_id, name, phone) values (v_tenant, btrim(p_guest_name), p_guest_phone) returning id into v_customer;
    end if;
  elsif not exists (select 1 from customers where id = v_customer and tenant_id = v_tenant) then
    raise exception 'guest_not_found';
  end if;

  begin
    insert into bookings(tenant_id, resource_type, resource_id, customer_id, starts_at, ends_at, status)
    values (v_tenant, 'room', p_room, v_customer, private.ht_noon(p_check_in), private.ht_noon(p_check_out),
            case when p_check_in_now then 'checked_in' else 'booked' end)
    returning id into v_booking;
  exception when exclusion_violation then
    raise exception 'room_taken';
  end;

  insert into ht_stays(tenant_id, booking_id, room_id, customer_id, rate_plan_id, nightly_rate, check_in, check_out, status,
                       adults, children, id_type, id_number, nationality, source, notes, checked_in_at, client_ref, created_by)
  values (v_tenant, v_booking, p_room, v_customer, v_plan, v_rate, p_check_in, p_check_out, v_status,
          coalesce(p_adults,1), coalesce(p_children,0), p_id_type, p_id_number, p_nationality, coalesce(p_source,'walk_in'), p_notes,
          case when p_check_in_now then now() end, p_client_ref, auth.uid())
  returning id into v_stay;

  if p_request is not null then
    update ht_booking_requests set status = 'confirmed', stay_id = v_stay, handled_by = auth.uid()
     where id = p_request and tenant_id = v_tenant and status = 'new';
    if not found then raise exception 'request_not_found'; end if;
  end if;
  return v_stay;
end $$;

create function private.ht_check_in(p_stay uuid, p_id_type text, p_id_number text, p_nationality text)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype;
begin
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status = 'in_house' then return; end if;
  if v.status <> 'reserved' then raise exception 'bad_status'; end if;
  if v.check_in > private.ht_today() then raise exception 'too_early'; end if;
  update ht_stays set status = 'in_house', checked_in_at = now(),
         id_type = coalesce(p_id_type, id_type), id_number = coalesce(p_id_number, id_number),
         nationality = coalesce(p_nationality, nationality)
   where id = p_stay;
  update bookings set status = 'checked_in' where id = v.booking_id and tenant_id = v_tenant;
end $$;

create function private.ht_cancel_stay(p_stay uuid, p_no_show boolean)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype;
begin
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status in ('cancelled','no_show') then return; end if;
  if v.status <> 'reserved' then raise exception 'bad_status'; end if;
  update ht_stays set status = case when p_no_show then 'no_show' else 'cancelled' end where id = p_stay;
  -- 'cancelled' frees the room in the core exclusion constraint.
  update bookings set status = 'cancelled' where id = v.booking_id and tenant_id = v_tenant;
end $$;

create function private.ht_add_charge(p_stay uuid, p_kind text, p_description text, p_amount numeric, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v_status text; v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;
  if p_client_ref is not null then
    select id into v_id from ht_stay_charges where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  select status into v_status from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v_status <> 'in_house' then raise exception 'bad_status'; end if;
  insert into ht_stay_charges(tenant_id, stay_id, kind, description, amount, client_ref, created_by)
  values (v_tenant, p_stay, p_kind, p_description, p_amount, p_client_ref, auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- Corrections are new reversing rows, never edits. Owner or manager only.
create function private.ht_reverse_charge(p_charge uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); c ht_stay_charges%rowtype; v_status text; v_id uuid;
begin
  if private.current_app_role() not in ('owner','manager') then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into c from ht_stay_charges where id = p_charge and tenant_id = v_tenant;
  if not found then raise exception 'charge_not_found'; end if;
  if c.reverses_id is not null or c.amount < 0 then raise exception 'bad_charge'; end if;
  select status into v_status from ht_stays where id = c.stay_id and tenant_id = v_tenant for update;
  if v_status <> 'in_house' then raise exception 'bad_status'; end if;
  begin
    insert into ht_stay_charges(tenant_id, stay_id, kind, description, amount, reverses_id, created_by)
    values (v_tenant, c.stay_id, c.kind, c.description, -c.amount, c.id, auth.uid()) returning id into v_id;
  exception when unique_violation then raise exception 'already_reversed'; end;
  return v_id;
end $$;

-- Deposit or part payment on an open stay. Idempotent on client_ref.
create function private.ht_pay_stay(p_stay uuid, p_amount numeric, p_method pay_method, p_reference text, p_client_ref uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype; v_pay uuid; v_id uuid;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;
  if p_client_ref is not null then
    select id into v_id from ht_stay_payments where tenant_id = v_tenant and client_ref = p_client_ref;
    if found then return v_id; end if;
  end if;
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status not in ('reserved','in_house') then raise exception 'bad_status'; end if;
  insert into payments(tenant_id, customer_id, amount, method, reference, ref_table, ref_id)
  values (v_tenant, v.customer_id, p_amount, coalesce(p_method,'cash'), p_reference, 'ht_stays', p_stay) returning id into v_pay;
  insert into ht_stay_payments(tenant_id, stay_id, payment_id, amount, client_ref)
  values (v_tenant, p_stay, v_pay, p_amount, p_client_ref) returning id into v_id;
  return v_id;
end $$;

-- Totals one stay. Nights count to today for early leavers and overstayers (minimum one).
create function private.ht_stay_totals(p_stay uuid)
returns table (nights int, room_total numeric, charges_total numeric, paid_total numeric, balance numeric)
language plpgsql stable security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype; v_nights int; v_room numeric; v_charges numeric; v_paid numeric;
begin
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant;
  if not found then raise exception 'stay_not_found'; end if;
  v_nights := case
    when v.status = 'checked_out' then greatest(1, (v.checked_out_at at time zone 'Africa/Addis_Ababa')::date - v.check_in)
    when v.status = 'in_house' then greatest(1, private.ht_today() - v.check_in)
    else v.check_out - v.check_in end;
  v_room := coalesce(v.final_room_total, round(v_nights * v.nightly_rate, 2));
  select coalesce(sum(amount),0) into v_charges from ht_stay_charges where tenant_id = v_tenant and stay_id = p_stay;
  select coalesce(sum(amount),0) into v_paid from ht_stay_payments where tenant_id = v_tenant and stay_id = p_stay;
  return query select v_nights, v_room, v_charges, v_paid, v_room + v_charges - v_paid;
end $$;

-- Settles and closes a stay. Reception must settle in full; owners and managers may post the rest to credit.
create function private.ht_check_out(p_stay uuid, p_amount numeric, p_method pay_method, p_reference text, p_leave_balance boolean)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  v_tenant uuid := private.ht_require_tenant();
  v ht_stays%rowtype;
  t record;
  v_pay uuid;
  v_paid numeric;
  v_balance numeric;
  v_end date;
begin
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status = 'checked_out' then
    return jsonb_build_object('room_total', v.final_room_total, 'charges_total', v.final_charges_total,
                              'paid_total', v.final_paid_total, 'balance', v.final_balance);
  end if;
  if v.status <> 'in_house' then raise exception 'bad_status'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'bad_amount'; end if;

  select * into t from private.ht_stay_totals(p_stay);
  if coalesce(p_amount,0) > greatest(t.balance, 0) then raise exception 'overpayment'; end if;

  if coalesce(p_amount,0) > 0 then
    insert into payments(tenant_id, customer_id, amount, method, reference, ref_table, ref_id)
    values (v_tenant, v.customer_id, p_amount, coalesce(p_method,'cash'), p_reference, 'ht_stays', p_stay) returning id into v_pay;
    insert into ht_stay_payments(tenant_id, stay_id, payment_id, amount) values (v_tenant, p_stay, v_pay, p_amount);
  end if;
  v_paid := t.paid_total + coalesce(p_amount,0);
  v_balance := t.room_total + t.charges_total - v_paid;

  if v_balance > 0 then
    if not coalesce(p_leave_balance,false) then raise exception 'balance_due'; end if;
    if private.current_app_role() not in ('owner','manager') then raise exception 'not_allowed' using errcode = '42501'; end if;
    insert into credit_ledger(tenant_id, customer_id, type, amount, ref_table, ref_id)
    values (v_tenant, v.customer_id, 'debt', v_balance, 'ht_stays', p_stay);
  end if;

  v_end := v.check_in + t.nights;
  begin
    update bookings set status = 'done', ends_at = private.ht_noon(v_end) where id = v.booking_id and tenant_id = v_tenant;
  exception when exclusion_violation then raise exception 'room_taken'; end;

  update ht_stays set status = 'checked_out', checked_out_at = now(), check_out = v_end,
         final_room_total = t.room_total, final_charges_total = t.charges_total, final_paid_total = v_paid, final_balance = v_balance
   where id = p_stay;
  update ht_rooms set housekeeping = 'dirty' where id = v.room_id and tenant_id = v_tenant;

  return jsonb_build_object('room_total', t.room_total, 'charges_total', t.charges_total, 'paid_total', v_paid, 'balance', v_balance);
end $$;

create function private.ht_set_housekeeping(p_room uuid, p_state text)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant();
begin
  if p_state not in ('clean','dirty') then raise exception 'bad_state'; end if;
  update ht_rooms set housekeeping = p_state where id = p_room and tenant_id = v_tenant;
  if not found then raise exception 'room_not_found'; end if;
end $$;

create function private.ht_decline_request(p_request uuid)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant();
begin
  update ht_booking_requests set status = 'declined', handled_by = auth.uid()
   where id = p_request and tenant_id = v_tenant and status = 'new';
  if not found then raise exception 'request_not_found'; end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'ht_create_stay(uuid,uuid,text,text,date,date,uuid,numeric,int,int,text,text,text,text,text,boolean,uuid,uuid)',
    'ht_check_in(uuid,text,text,text)', 'ht_cancel_stay(uuid,boolean)',
    'ht_add_charge(uuid,text,text,numeric,uuid)', 'ht_reverse_charge(uuid)',
    'ht_pay_stay(uuid,numeric,pay_method,text,uuid)', 'ht_stay_totals(uuid)',
    'ht_check_out(uuid,numeric,pay_method,text,boolean)', 'ht_set_housekeeping(uuid,text)', 'ht_decline_request(uuid)'
  ] loop
    execute format('revoke all on function private.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
  end loop;
end $$;

-- Public wrappers
create function public.ht_create_stay(
  p_room uuid, p_check_in date, p_check_out date, p_customer uuid default null, p_guest_name text default null, p_guest_phone text default null,
  p_rate_plan uuid default null, p_nightly_rate numeric default null, p_adults int default 1, p_children int default 0, p_id_type text default null,
  p_id_number text default null, p_nationality text default null, p_source text default 'walk_in', p_notes text default null,
  p_check_in_now boolean default false, p_client_ref uuid default null, p_request uuid default null
) returns uuid language sql security invoker set search_path = public, private as
$$ select private.ht_create_stay(p_room, p_customer, p_guest_name, p_guest_phone, p_check_in, p_check_out, p_rate_plan, p_nightly_rate, p_adults, p_children, p_id_type, p_id_number, p_nationality, p_source, p_notes, p_check_in_now, p_client_ref, p_request) $$;

create function public.ht_check_in(p_stay uuid, p_id_type text default null, p_id_number text default null, p_nationality text default null)
returns void language sql security invoker set search_path = public, private as $$ select private.ht_check_in(p_stay, p_id_type, p_id_number, p_nationality) $$;
create function public.ht_cancel_stay(p_stay uuid, p_no_show boolean default false)
returns void language sql security invoker set search_path = public, private as $$ select private.ht_cancel_stay(p_stay, p_no_show) $$;
create function public.ht_add_charge(p_stay uuid, p_kind text, p_amount numeric, p_description text default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.ht_add_charge(p_stay, p_kind, p_description, p_amount, p_client_ref) $$;
create function public.ht_reverse_charge(p_charge uuid)
returns uuid language sql security invoker set search_path = public, private as $$ select private.ht_reverse_charge(p_charge) $$;
create function public.ht_pay_stay(p_stay uuid, p_amount numeric, p_method pay_method default 'cash', p_reference text default null, p_client_ref uuid default null)
returns uuid language sql security invoker set search_path = public, private as $$ select private.ht_pay_stay(p_stay, p_amount, p_method, p_reference, p_client_ref) $$;
create function public.ht_stay_totals(p_stay uuid)
returns table (nights int, room_total numeric, charges_total numeric, paid_total numeric, balance numeric)
language sql stable security invoker set search_path = public, private as $$ select * from private.ht_stay_totals(p_stay) $$;
create function public.ht_check_out(p_stay uuid, p_amount numeric default 0, p_method pay_method default 'cash', p_reference text default null, p_leave_balance boolean default false)
returns jsonb language sql security invoker set search_path = public, private as $$ select private.ht_check_out(p_stay, p_amount, p_method, p_reference, p_leave_balance) $$;
create function public.ht_set_housekeeping(p_room uuid, p_state text)
returns void language sql security invoker set search_path = public, private as $$ select private.ht_set_housekeeping(p_room, p_state) $$;
create function public.ht_decline_request(p_request uuid)
returns void language sql security invoker set search_path = public, private as $$ select private.ht_decline_request(p_request) $$;

-- Daily occupancy and income for the report screen.
create function public.ht_daily_report(p_from date, p_to date)
returns table (day date, rooms int, occupied int, arrivals int, departures int, income numeric)
language sql stable security invoker set search_path = public, private as $$
  with days as (select d::date as day from generate_series(p_from, least(p_to, p_from + 366), interval '1 day') d),
  rooms as (select count(*)::int n from ht_rooms where in_service)
  select d.day,
    (select n from rooms),
    (select count(*)::int from ht_stays s where s.status in ('in_house','checked_out') and s.check_in <= d.day and s.check_out > d.day),
    (select count(*)::int from ht_stays s where s.status in ('in_house','checked_out','reserved') and s.check_in = d.day),
    (select count(*)::int from ht_stays s where s.status in ('in_house','checked_out','reserved') and s.check_out = d.day),
    (select coalesce(sum(p.amount),0) from ht_stay_payments p where (p.created_at at time zone 'Africa/Addis_Ababa')::date = d.day)
  from days d order by d.day
$$;

revoke all on function public.ht_create_stay(uuid,date,date,uuid,text,text,uuid,numeric,int,int,text,text,text,text,text,boolean,uuid,uuid),
  public.ht_check_in(uuid,text,text,text), public.ht_cancel_stay(uuid,boolean), public.ht_add_charge(uuid,text,numeric,text,uuid),
  public.ht_reverse_charge(uuid), public.ht_pay_stay(uuid,numeric,pay_method,text,uuid), public.ht_stay_totals(uuid),
  public.ht_check_out(uuid,numeric,pay_method,text,boolean), public.ht_set_housekeeping(uuid,text), public.ht_decline_request(uuid),
  public.ht_daily_report(date,date) from public, anon;
grant execute on function public.ht_create_stay(uuid,date,date,uuid,text,text,uuid,numeric,int,int,text,text,text,text,text,boolean,uuid,uuid),
  public.ht_check_in(uuid,text,text,text), public.ht_cancel_stay(uuid,boolean), public.ht_add_charge(uuid,text,numeric,text,uuid),
  public.ht_reverse_charge(uuid), public.ht_pay_stay(uuid,numeric,pay_method,text,uuid), public.ht_stay_totals(uuid),
  public.ht_check_out(uuid,numeric,pay_method,text,boolean), public.ht_set_housekeeping(uuid,text), public.ht_decline_request(uuid),
  public.ht_daily_report(date,date) to authenticated;
