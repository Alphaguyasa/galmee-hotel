-- ID photo view: owner/manager only, logged, tenant-scoped. Two throwaway hotels;
-- always rolls back (ends with RAISE).
-- Expect: staff=not_allowed owner_path=ok logged=1 no_photo=no_photo b_owner=stay_not_found
--         staff_obj_select=0 anon=denied
do $$
declare ua uuid := gen_random_uuid(); uo uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; rta uuid; r1 uuid; r2 uuid; s1 uuid; s2 uuid; p text;
  staff_r text := 'allowed'; owner_path text := 'bad'; logged int; no_photo text := 'none';
  b_owner text := 'none'; staff_obj int; anon_r text := 'allowed';
  t date := (now() at time zone 'Africa/Addis_Ababa')::date;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','ht-pv-a@test.invalid'),
    (uo,'authenticated','authenticated','ht-pv-o@test.invalid'),
    (ub,'authenticated','authenticated','ht-pv-b@test.invalid');
  insert into public.tenants(name, vertical) values ('HT PV A','hotel') returning id into ta;
  insert into public.tenants(name, vertical) values ('HT PV B','hotel') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values
    (ua, ta, 'desk','staff'), (uo, ta, 'owner','owner'), (ub, tb, 'B owner','owner');
  insert into public.ht_room_types(tenant_id,name) values (ta,'Std') returning id into rta;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (ta,rta,'Rack',1000,true);
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101') returning id into r1;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'102') returning id into r2;

  -- Reception checks a guest in with a photo path, another without.
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  s1 := public.ht_create_stay(r1, t, t+1, p_guest_name=>'With Photo', p_guest_phone=>'0911000401');
  s2 := public.ht_create_stay(r2, t, t+1, p_guest_name=>'No Photo', p_guest_phone=>'0911000402');
  p := ta::text || '/' || s1::text || '-abc123.jpg';
  perform public.ht_set_guest_id(s1, 'kebele', 'AB1234', 'Ethiopian', 'Hawassa', 'Addis Ababa', 'Work', p, true);
  perform public.ht_set_guest_id(s2, 'kebele', 'AB5678', 'Ethiopian', null, null, null, null, true);

  begin perform public.ht_id_photo_view(s1); exception when others then staff_r := sqlerrm; end;
  select count(*) into staff_obj from storage.objects where bucket_id = 'ht-guest-ids';

  perform set_config('request.jwt.claims', json_build_object('sub', uo, 'role','authenticated')::text, true);
  if public.ht_id_photo_view(s1) = p then owner_path := 'ok'; end if;
  select count(*) into logged from public.ht_register_prints where kind = 'id_photo' and stay_id = s1;
  begin perform public.ht_id_photo_view(s2); exception when others then no_photo := sqlerrm; end;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  begin perform public.ht_id_photo_view(s1); exception when others then b_owner := sqlerrm; end;

  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('role','anon', true);
  begin perform public.ht_id_photo_view(s1); exception when insufficient_privilege then anon_r := 'denied'; when others then anon_r := sqlerrm; end;

  perform set_config('role','postgres', true);
  raise exception 'RESULTS: staff=% owner_path=% logged=% no_photo=% b_owner=% staff_obj_select=% anon=%',
    staff_r, owner_path, logged, no_photo, b_owner, staff_obj, anon_r;
end $$;
