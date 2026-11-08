-- One-click demo data for the "Galmee Hotel Demo" tenant: a 20-room guesthouse, 3 room types,
-- two weeks of past stays plus the coming week. All names are fictional; phone numbers use the
-- unassigned 0900 000 2xx range.
--
-- The demo tenant must belong to a real auth user, so the owner signs up, names the hotel
-- "Galmee Hotel Demo" and taps "Load demo data" once. Past stays need statuses and dates the
-- normal RPCs refuse on purpose, so the seed runs as a private SECURITY DEFINER function whose
-- guard only accepts the owner of an empty tenant with exactly that name.

create function private.ht_seed_demo(p_tenant uuid) returns int
language plpgsql security definer set search_path = public, private as $$
declare
  v_today date := private.ht_today();
  v_types uuid[] := '{}';
  v_guests uuid[] := '{}';
  v_names text[] := array['Hawi Tolosa','Lensa Gemechu','Dawit Mekonen Alemu','Sifan Bekele Dida','Tigist Worku Haile','Bontu Kebede Jima',
    'Yonas Tadesse Bira','Meron Abebe Lema','Chala Fufa Roba','Hana Girma Taye','Obsa Regassa Duga','Selam Yohannes Beyene',
    'Gadisa Negera Wako','Rahel Mulugeta Ayele','Kena Temesgen Ofa','Eden Assefa Kifle','Lemi Shiferaw Guta','Mahlet Daniel Tefera',
    'Amanuel Desta Hailu','Ifa Dinsa Urgessa','Bethel Solomon Zewde','Tolera Hirko Bula','Nardos Fikre Gebre','Abdi Kedir Sheko'];
  v_rate numeric[] := array[1200, 1500, 2400];
  v_room record;
  v_stay uuid; v_booking uuid; v_pay uuid; v_guest uuid;
  v_day date; v_in date; v_out date; v_nights int; v_status text; v_room_total numeric; v_charges numeric; v_deposit numeric;
  v_i int := 0; v_r int := 0; v_id uuid; v_type int;
begin
  insert into ht_room_types(tenant_id, name, description, capacity, sort_order) values
    (p_tenant, 'Standard', 'One double bed, private shower', 2, 1) returning id into v_id;
  v_types := v_types || v_id;
  insert into ht_room_types(tenant_id, name, description, capacity, sort_order) values
    (p_tenant, 'Twin', 'Two single beds, private shower', 2, 2) returning id into v_id;
  v_types := v_types || v_id;
  insert into ht_room_types(tenant_id, name, description, capacity, sort_order) values
    (p_tenant, 'Family', 'Double bed and two singles, sitting area', 4, 3) returning id into v_id;
  v_types := v_types || v_id;
  for v_type in 1..3 loop
    insert into ht_rate_plans(tenant_id, room_type_id, name, nightly_rate, is_default)
    values (p_tenant, v_types[v_type], 'Rack', v_rate[v_type], true);
  end loop;

  -- 101-108 Standard, 201-208 Twin, 301-304 Family.
  for v_i in 1..20 loop
    v_type := case when v_i <= 8 then 1 when v_i <= 16 then 2 else 3 end;
    insert into ht_rooms(tenant_id, room_type_id, number, floor, in_service, notes)
    values (p_tenant, v_types[v_type],
            case v_type when 1 then (100 + v_i)::text when 2 then (192 + v_i)::text else (284 + v_i)::text end,
            v_type::text, v_i <> 14, case when v_i = 14 then 'Plumbing repair' end);
  end loop;

  for v_i in 1..array_length(v_names, 1) loop
    insert into customers(tenant_id, name, phone)
    values (p_tenant, v_names[v_i], '0900000' || (200 + v_i)::text) returning id into v_id;
    v_guests := v_guests || v_id;
  end loop;

  v_i := 0;
  for v_room in
    select r.id, r.room_type_id, r.in_service, p.id as plan, p.nightly_rate
      from ht_rooms r join ht_rate_plans p on p.room_type_id = r.room_type_id and p.is_default
     where r.tenant_id = p_tenant order by r.number
  loop
    v_r := v_r + 1;
    continue when not v_room.in_service;
    v_day := v_today - 14 + (v_r % 3);
    while v_day <= v_today + 7 loop
      v_i := v_i + 1;
      v_nights := 1 + (v_i * 5 + v_r * 3) % 4;
      v_in := v_day; v_out := v_day + v_nights;
      v_status := case when v_out < v_today then 'checked_out' when v_in < v_today then 'in_house' else 'reserved' end;
      v_guest := v_guests[1 + (v_i * 7) % array_length(v_guests, 1)];

      insert into bookings(tenant_id, resource_type, resource_id, customer_id, starts_at, ends_at, status)
      values (p_tenant, 'room', v_room.id, v_guest, private.ht_noon(v_in), private.ht_noon(v_out),
              case v_status when 'checked_out' then 'done' when 'in_house' then 'checked_in' else 'booked' end)
      returning id into v_booking;

      insert into ht_stays(tenant_id, booking_id, room_id, customer_id, rate_plan_id, nightly_rate, check_in, check_out, status,
                           adults, id_type, id_number, nationality, source, checked_in_at, checked_out_at, created_by)
      values (p_tenant, v_booking, v_room.id, v_guest, v_room.plan, v_room.nightly_rate, v_in, v_out, v_status,
              1 + v_i % 2,
              case when v_status <> 'reserved' then 'kebele' end,
              case when v_status <> 'reserved' then 'SH-' || (40000 + v_i)::text end,
              case when v_status <> 'reserved' then 'Ethiopian' end,
              (array['walk_in','phone','website'])[1 + v_i % 3],
              case when v_status <> 'reserved' then private.ht_noon(v_in) + interval '2 hours' end,
              case when v_status = 'checked_out' then private.ht_noon(v_out) - interval '2 hours' end,
              null)
      returning id into v_stay;

      v_charges := 0;
      if v_status <> 'reserved' and v_i % 3 = 0 then
        insert into ht_stay_charges(tenant_id, stay_id, kind, description, amount, created_at)
        values (p_tenant, v_stay, 'food', 'Dinner', 350, private.ht_noon(v_in) + interval '8 hours');
        v_charges := v_charges + 350;
      end if;
      if v_status <> 'reserved' and v_i % 5 = 0 then
        insert into ht_stay_charges(tenant_id, stay_id, kind, description, amount, created_at)
        values (p_tenant, v_stay, 'laundry', 'Shirts and trousers', 150, private.ht_noon(v_in) + interval '20 hours');
        v_charges := v_charges + 150;
      end if;

      v_room_total := v_nights * v_room.nightly_rate;
      v_deposit := case when v_status = 'checked_out' then v_room_total + v_charges
                        when v_status = 'in_house' and v_i % 2 = 0 then v_room.nightly_rate else 0 end;
      if v_deposit > 0 then
        insert into payments(tenant_id, customer_id, amount, method, ref_table, ref_id, created_at)
        values (p_tenant, v_guest, v_deposit, (array['cash','telebirr','cbe_birr']::pay_method[])[1 + v_i % 3], 'ht_stays', v_stay,
                case when v_status = 'checked_out' then private.ht_noon(v_out) - interval '2 hours' else private.ht_noon(v_in) + interval '2 hours' end)
        returning id into v_pay;
        insert into ht_stay_payments(tenant_id, stay_id, payment_id, amount, created_at)
        values (p_tenant, v_stay, v_pay, v_deposit,
                case when v_status = 'checked_out' then private.ht_noon(v_out) - interval '2 hours' else private.ht_noon(v_in) + interval '2 hours' end);
      end if;
      if v_status = 'checked_out' then
        update ht_stays set final_room_total = v_room_total, final_charges_total = v_charges, final_paid_total = v_deposit, final_balance = 0
         where id = v_stay;
      end if;

      v_day := v_out + (v_i * 7 + v_r) % 3;
    end loop;
  end loop;

  -- Rooms whose last guest left yesterday still need cleaning.
  update ht_rooms r set housekeeping = 'dirty'
   where r.tenant_id = p_tenant
     and exists (select 1 from ht_stays s where s.room_id = r.id and s.status = 'checked_out' and s.check_out = v_today - 1);

  insert into ht_sites(tenant_id, slug, display_name, headline, about, address, phone, published)
  values (p_tenant, 'galmee-hotel-demo', 'Galmee Hotel Demo', 'A quiet guesthouse in the heart of town',
          'Twenty clean rooms, hot water, breakfast from 7:00 and secure parking.', 'Shashamane, Kebele 08', '0900000200', true);

  insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, room_type_id, adults, message) values
    (p_tenant, 'Galane Hordofa Dhugaa', '0900000251', v_today + 2, v_today + 4, v_types[1], 2, 'Arriving by evening bus'),
    (p_tenant, 'Samrawit Bogale Tesema', '0900000252', v_today + 3, v_today + 5, v_types[3], 4, null),
    (p_tenant, 'Jiregna Waqo Boru', '0900000253', v_today + 5, v_today + 6, v_types[2], 1, 'Quiet room if possible');

  return (select count(*)::int from ht_stays where tenant_id = p_tenant);
end $$;
revoke all on function private.ht_seed_demo(uuid) from public, anon, authenticated;

create function private.ht_load_demo_data() returns int
language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant();
begin
  if private.current_app_role() <> 'owner' then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from tenants where id = v_tenant and name = 'Galmee Hotel Demo' and vertical = 'hotel') then
    raise exception 'not_demo_tenant';
  end if;
  if exists (select 1 from ht_rooms where tenant_id = v_tenant) then raise exception 'already_loaded'; end if;
  return private.ht_seed_demo(v_tenant);
end $$;
revoke all on function private.ht_load_demo_data() from public, anon;
grant execute on function private.ht_load_demo_data() to authenticated;

create function public.ht_load_demo_data() returns int
language sql security invoker set search_path = public, private as $$ select private.ht_load_demo_data() $$;
revoke all on function public.ht_load_demo_data() from public, anon;
grant execute on function public.ht_load_demo_data() to authenticated;
