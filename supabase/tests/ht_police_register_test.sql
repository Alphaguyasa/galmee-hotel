-- Guest register fields, ID photo bucket and the guest ID RPCs. Two throwaway hotels;
-- always rolls back (ends with RAISE).
-- Expect: need_num=id_number_required long=too_long upd=denied checkin=in_house fields=ok
--         late=too_late fix_ok=ok bad_path=invalid_photo_path b_stay=stay_not_found
--         staff_prints=0 prints_ins=denied staff_list=0 owner_list=1 b_list=0 anon=denied
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uo uuid := gen_random_uuid();
  ta uuid; tb uuid; rta uuid; r1 uuid; r2 uuid; s1 uuid; s2 uuid;
  td date := (now() at time zone 'Africa/Addis_Ababa')::date;
  need_num text := 'none'; long_v text := 'none'; upd text := 'allowed'; st text; fields text;
  late text := 'none'; fix_ok text := 'none'; bad_path text := 'none'; b_stay text := 'none';
  staff_prints int; prints_ins text := 'allowed'; staff_list int; owner_list int; b_list int; anon_r text := 'allowed';
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','ht-pr-a@test.invalid'),
    (uo,'authenticated','authenticated','ht-pr-o@test.invalid'),
    (ub,'authenticated','authenticated','ht-pr-b@test.invalid');
  insert into public.tenants(name, vertical) values ('HT PR A','hotel') returning id into ta;
  insert into public.tenants(name, vertical) values ('HT PR B','hotel') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'A desk','staff'), (uo, ta, 'A owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.ht_room_types(tenant_id,name) values (ta,'Std') returning id into rta;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (ta,rta,'Rack',1000,true);
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101') returning id into r1;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'102') returning id into r2;

  -- Photos as the storage API would store them (one in A's folder, one in B's).
  insert into storage.objects(bucket_id, name, owner) values
    ('ht-guest-ids', ta::text || '/x-a1.jpg', ua), ('ht-guest-ids', tb::text || '/x-b1.jpg', ub);

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  s1 := public.ht_create_stay(r1, td, td+2, p_guest_name=>'Guest One', p_guest_phone=>'0911000201');
  s2 := public.ht_create_stay(r2, td, td+1, p_guest_name=>'Guest Two', p_guest_phone=>'0911000202', p_check_in_now=>true);

  begin perform public.ht_set_guest_id(s1, p_id_type=>'kebele', p_id_number=>'  ');
  exception when others then need_num := sqlerrm; end;
  begin perform public.ht_set_guest_id(s1, p_purpose=>repeat('x', 81));
  exception when others then long_v := sqlerrm; end;
  begin update public.ht_stays set coming_from = 'Hawassa' where id = s1;
  exception when insufficient_privilege then upd := 'denied'; end;

  -- Desk sheet: details + check-in in one call.
  perform public.ht_set_guest_id(s1, 'kebele', ' SH-12345 ', 'Ethiopian', 'Hawassa', 'Addis Ababa', 'Business',
    ta::text || '/' || s1::text || '-a1b2.jpg', true);
  select status, case when id_number = 'SH-12345' and coming_from = 'Hawassa' and going_to = 'Addis Ababa'
              and purpose = 'Business' and id_photo_path like ta::text || '/%' then 'ok' else 'bad' end
    into st, fields from public.ht_stays where id = s1;

  begin perform public.ht_set_guest_id(s1, p_photo_path=>tb::text || '/' || s1::text || '-zz.jpg');
  exception when others then bad_path := sqlerrm; end;

  -- Checked out 2 days ago: frozen. Checked out an hour ago: still correctable.
  perform set_config('role','postgres', true);
  update public.ht_stays set status = 'checked_out', checked_out_at = now() - interval '2 days' where id = s2;
  perform set_config('role','authenticated', true);
  begin perform public.ht_set_guest_id(s2, 'passport', 'P123');
  exception when others then late := sqlerrm; end;
  perform set_config('role','postgres', true);
  update public.ht_stays set checked_out_at = now() - interval '1 hour' where id = s2;
  perform set_config('role','authenticated', true);
  perform public.ht_set_guest_id(s2, 'passport', 'P123');
  select case when id_number = 'P123' then 'ok' else 'bad' end into fix_ok from public.ht_stays where id = s2;

  select count(*) into staff_prints from public.ht_register_prints;
  begin insert into public.ht_register_prints(kind, register_date) values ('register', td);
  exception when insufficient_privilege then prints_ins := 'denied'; end;
  select count(*) into staff_list from storage.objects where bucket_id = 'ht-guest-ids';

  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role','authenticated')::text, true);
  select count(*) into owner_list from storage.objects where bucket_id = 'ht-guest-ids';

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  begin perform public.ht_set_guest_id(s1, 'passport', 'X1');
  exception when others then b_stay := sqlerrm; end;
  select count(*) into b_list from storage.objects where bucket_id = 'ht-guest-ids' and name like ta::text || '/%';

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform public.ht_set_guest_id(s1, 'passport', 'X1');
  exception when insufficient_privilege then anon_r := 'denied'; end;

  raise exception 'RESULT need_num=% long=% upd=% checkin=% fields=% late=% fix_ok=% bad_path=% b_stay=% staff_prints=% prints_ins=% staff_list=% owner_list=% b_list=% anon=%',
    need_num, long_v, upd, st, fields, late, fix_ok, bad_path, b_stay, staff_prints, prints_ins, staff_list, owner_list, b_list, anon_r;
end $$;
