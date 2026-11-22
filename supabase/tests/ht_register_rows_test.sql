-- Police register rows for a night, and the print audit. Two throwaway hotels;
-- always rolls back (ends with RAISE). D = yesterday (Addis), T = today.
-- Expect: d_rooms=101 t_rooms=101b,103 b_rows=0 print_by=desk staff_sees=0 owner_sees=1
--         bad_date=bad_dates anon=denied
do $$
declare ua uuid := gen_random_uuid(); uo uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; rta uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid;
  t date := (now() at time zone 'Africa/Addis_Ababa')::date; d date;
  d_rooms text; t_rooms text; b_rows int; print_by text; staff_sees int; owner_sees int;
  bad_date text := 'none'; anon_r text := 'allowed';
begin
  d := t - 1;
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','ht-rr-a@test.invalid'),
    (uo,'authenticated','authenticated','ht-rr-o@test.invalid'),
    (ub,'authenticated','authenticated','ht-rr-b@test.invalid');
  insert into public.tenants(name, vertical) values ('HT RR A','hotel') returning id into ta;
  insert into public.tenants(name, vertical) values ('HT RR B','hotel') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'desk','staff'), (uo, ta, 'owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.ht_room_types(tenant_id,name) values (ta,'Std') returning id into rta;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (ta,rta,'Rack',1000,true);
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101') returning id into r1;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'102') returning id into r2;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'103') returning id into r3;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101b') returning id into r4;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  s1 := public.ht_create_stay(r1, t, t+1, p_guest_name=>'Night Before', p_guest_phone=>'0911000301', p_check_in_now=>true);
  s2 := public.ht_create_stay(r2, t, t+1, p_guest_name=>'Left Early', p_guest_phone=>'0911000302', p_check_in_now=>true);
  s3 := public.ht_create_stay(r3, t, t+2, p_guest_name=>'In Tonight', p_guest_phone=>'0911000303', p_check_in_now=>true);
  s4 := public.ht_create_stay(r4, t, t+1, p_guest_name=>'Not Arrived', p_guest_phone=>'0911000304');

  -- Boundary fixtures (Addis time = UTC+3).
  perform set_config('role','postgres', true);
  -- in at 22:00 on D, out at 09:00 on T: on D's register, not T's.
  update public.ht_stays set status = 'checked_out', check_in = d, check_out = t,
         checked_in_at = (d + time '22:00') at time zone 'Africa/Addis_Ababa',
         checked_out_at = (t + time '09:00') at time zone 'Africa/Addis_Ababa' where id = s1;
  -- in on D-1, out at 08:00 on D: on neither.
  update public.ht_stays set status = 'checked_out', check_in = d - 1, check_out = d,
         checked_in_at = (d - 1 + time '15:00') at time zone 'Africa/Addis_Ababa',
         checked_out_at = (d + time '08:00') at time zone 'Africa/Addis_Ababa' where id = s2;
  -- 101b: reserved, never checked in; turn it into a real in-house stay from T for the T list.
  perform set_config('role','authenticated', true);
  perform public.ht_check_in(s4, 'kebele', 'K-1', null);

  select string_agg(room_number, ',' order by room_number) into d_rooms from public.ht_register_rows(d);
  select string_agg(room_number, ',' order by room_number) into t_rooms from public.ht_register_rows(t);

  perform public.ht_log_register_print(t);
  begin perform public.ht_log_register_print(t + 30);
  exception when others then bad_date := sqlerrm; end;
  select count(*) into staff_sees from public.ht_register_prints;

  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role','authenticated')::text, true);
  select count(*) into owner_sees from public.ht_register_prints;
  select case when printed_by = ua then 'desk' else 'other' end into print_by
    from public.ht_register_prints where kind = 'register' and register_date = t;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into b_rows from public.ht_register_rows(t);

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.ht_register_rows(t);
  exception when insufficient_privilege then anon_r := 'denied'; end;

  raise exception 'RESULT d_rooms=% t_rooms=% b_rows=% print_by=% staff_sees=% owner_sees=% bad_date=% anon=%',
    d_rooms, t_rooms, b_rows, print_by, staff_sees, owner_sees, bad_date, anon_r;
end $$;
