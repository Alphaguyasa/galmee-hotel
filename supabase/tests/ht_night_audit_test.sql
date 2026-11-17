-- Night audit: preview, close, flags, tenant isolation. Uses two throwaway
-- hotels and always rolls back (ends with RAISE).
-- Expect: closes>=1 last=today again=already_closed noshow=1 over=1 owing=2
--         income=500 extras=200 b_sees=0 b_preview_noshow=0 insert=denied anon=denied
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  ta uuid; tb uuid; rta uuid; rtb uuid; r1 uuid; r2 uuid; r3 uuid; rb uuid;
  s1 uuid; s2 uuid; s3 uuid; td date := (now() at time zone 'Africa/Addis_Ababa')::date;
  closes int := 0; again text := 'none'; rep jsonb; last_day date; b_sees int; b_prev jsonb; ins text := 'allowed'; anon_r text := 'allowed';
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','ht-na-a@test.invalid'),(ub,'authenticated','authenticated','ht-na-b@test.invalid');
  insert into public.tenants(name, vertical) values ('HT NA A','hotel') returning id into ta;
  insert into public.tenants(name, vertical) values ('HT NA B','hotel') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua, ta, 'A desk','staff'), (ub, tb, 'B owner','owner');
  insert into public.ht_room_types(tenant_id,name) values (ta,'Std') returning id into rta;
  insert into public.ht_room_types(tenant_id,name) values (tb,'Std') returning id into rtb;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (ta,rta,'Rack',1000,true), (tb,rtb,'Rack',900,true);
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101') returning id into r1;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'102') returning id into r2;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'103') returning id into r3;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (tb,rtb,'201') returning id into rb;

  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  s1 := public.ht_create_stay(r1, td, td+2, p_guest_name=>'Guest One', p_guest_phone=>'0911000101', p_check_in_now=>true);
  perform public.ht_pay_stay(s1, 500);
  perform public.ht_add_charge(s1, 'food', 200);
  s2 := public.ht_create_stay(r2, td, td+1, p_guest_name=>'Guest Two', p_guest_phone=>'0911000102');
  s3 := public.ht_create_stay(r3, td, td+1, p_guest_name=>'Guest Three', p_guest_phone=>'0911000103', p_check_in_now=>true);

  -- Room 103 should have left today: move its dates back one day.
  perform set_config('role','postgres', true);
  update public.ht_stays set check_in = td - 1, check_out = td where id = s3;
  perform set_config('role','authenticated', true);

  begin
    insert into public.ht_night_audits(tenant_id, business_date, report) values (ta, td + 5, '{}');
  exception when insufficient_privilege then ins := 'denied';
  end;

  -- Close until the hotel date passes today (twice just after midnight).
  loop
    begin
      perform public.ht_close_night();
      closes := closes + 1;
    exception when others then
      again := sqlerrm; exit;
    end;
    exit when closes > 3;
  end loop;
  select report, business_date into rep, last_day from public.ht_night_audits where tenant_id = ta order by business_date desc limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  select count(*) into b_sees from public.ht_night_audits;
  b_prev := public.ht_night_audit_preview();

  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.ht_night_audit_preview();
  exception when insufficient_privilege then anon_r := 'denied';
  end;

  raise exception 'RESULT closes=% last=% again=% noshow=% over=% owing=% income=% extras=% b_sees=% b_preview_noshow=% insert=% anon=%',
    closes, case when last_day = td then 'today' else last_day::text end, again,
    jsonb_array_length(rep->'no_shows'), jsonb_array_length(rep->'overstays'), jsonb_array_length(rep->'owing'),
    rep->>'income', rep->>'extras', b_sees, jsonb_array_length(b_prev->'no_shows'), ins, anon_r;
end $$;
