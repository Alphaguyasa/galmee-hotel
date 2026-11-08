-- Cross-tenant RLS and workflow test for Galmee Hotel. Run with Supabase `execute_sql`.
-- Everything rolls back: the final RAISE carries the result line.
do $$
declare ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  ta uuid; tb uuid; rta uuid; rtb uuid; pa uuid; pb uuid; ra uuid; ra2 uuid; rb uuid; sa uuid; sb uuid; ca uuid; cb uuid; n int; r text := ''; ok boolean; tot record; j jsonb; td date := (now() at time zone 'Africa/Addis_Ababa')::date; err text;
begin
  insert into auth.users(id, aud, role, email) values
    (ua,'authenticated','authenticated','ht-a@test.invalid'),(ub,'authenticated','authenticated','ht-b@test.invalid'),(uc,'authenticated','authenticated','ht-c@test.invalid');
  insert into public.tenants(name, vertical) values ('HT A','hotel') returning id into ta;
  insert into public.tenants(name, vertical) values ('HT B','hotel') returning id into tb;
  insert into public.profiles(user_id, tenant_id, full_name, role) values (ua, ta, 'A owner','owner'), (ub, tb, 'B owner','owner'), (uc, ta, 'A desk','staff');
  insert into public.ht_room_types(tenant_id,name) values (ta,'Std') returning id into rta;
  insert into public.ht_room_types(tenant_id,name) values (tb,'Std') returning id into rtb;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (ta,rta,'Rack',1000,true) returning id into pa;
  insert into public.ht_rate_plans(tenant_id,room_type_id,name,nightly_rate,is_default) values (tb,rtb,'Rack',900,true) returning id into pb;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'101') returning id into ra;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (ta,rta,'102') returning id into ra2;
  insert into public.ht_rooms(tenant_id,room_type_id,number) values (tb,rtb,'201') returning id into rb;
  insert into public.ht_sites(tenant_id,slug,display_name,published,reception_telegram) values (tb,'ht-b-test','HT B',true,'123');

  -- tenant B owner creates a stay
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role','authenticated')::text, true);
  perform set_config('role','authenticated', true);
  sb := public.ht_create_stay(rb, td, td+2, p_guest_name=>'Guest B', p_guest_phone=>'0911000002', p_check_in_now=>true);
  select customer_id into cb from public.ht_stays where id=sb;

  -- tenant A staff: normal desk work
  perform set_config('request.jwt.claims', json_build_object('sub', uc, 'role','authenticated')::text, true);
  sa := public.ht_create_stay(ra, td, td+2, p_guest_name=>'Guest A', p_guest_phone=>'0911000001', p_check_in_now=>true, p_client_ref=>'11111111-1111-1111-1111-111111111111');
  r := r || 'idempotent=' || (public.ht_create_stay(ra, td, td+2, p_guest_name=>'Guest A', p_check_in_now=>true, p_client_ref=>'11111111-1111-1111-1111-111111111111') = sa) || ' (expect true); ';
  begin perform public.ht_create_stay(ra, td+1, td+3, p_guest_name=>'Dup'); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'double booking allowed=' || ok || ' err=' || coalesce(err,'') || ' (expect false, room_taken); ';
  perform public.ht_create_stay(ra, td+2, td+4, p_guest_name=>'Next guest');
  r := r || 'back-to-back ok; ';
  begin perform public.ht_create_stay(ra2, td, td+1, p_guest_name=>'X', p_nightly_rate=>1); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'staff rate override=' || ok || ' err=' || err || ' (expect false); ';
  perform public.ht_add_charge(sa,'food',250);
  perform public.ht_pay_stay(sa,100,'cash');
  select * into tot from public.ht_stay_totals(sa);
  r := r || 'totals nights=' || tot.nights || ' room=' || tot.room_total || ' charges=' || tot.charges_total || ' paid=' || tot.paid_total || ' bal=' || tot.balance || ' (expect 1,1000,250,100,1150); ';
  begin perform public.ht_check_out(sa, 100); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'staff part checkout=' || ok || ' err=' || err || ' (expect false, balance_due); ';
  j := public.ht_check_out(sa, 1150, 'telebirr');
  r := r || 'checkout bal=' || (j->>'balance') || ' (expect 0); ';
  select count(*) into n from public.ht_rooms where id=ra and housekeeping='dirty';
  r := r || 'room dirty=' || n || ' (expect 1); ';
  select count(*) into n from public.ht_stay_charges;      r := r || 'staff sees charges=' || n || ' (expect 1); ';
  begin insert into public.ht_stay_charges(tenant_id,stay_id,kind,amount) values (ta,sa,'food',1); ok := true; exception when others then ok := false; end;
  r := r || 'staff direct charge insert=' || ok || ' (expect false); ';
  begin update public.ht_stays set nightly_rate=1 where id=sa; get diagnostics n = row_count; exception when others then n := -1; end; r := r || 'staff direct stay update rows=' || n || ' (expect 0 or -1 denied); ';
  begin update public.ht_rooms set in_service=false; get diagnostics n = row_count; exception when others then n := -1; end; r := r || 'staff room update rows=' || n || ' (expect 0 or -1); ';

  -- tenant A owner vs tenant B data
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role','authenticated')::text, true);
  select count(*) into n from public.ht_stays;             r := r || 'A sees stays=' || n || ' (expect 2); ';
  select count(*) into n from public.ht_stays where id=sb; r := r || 'A sees B stay=' || n || ' (expect 0); ';
  select count(*) into n from public.ht_sites;             r := r || 'A sees sites=' || n || ' (expect 0); ';
  select count(*) into n from public.ht_rooms where id=rb; r := r || 'A sees B room=' || n || ' (expect 0); ';
  begin update public.ht_rooms set number='x' where id=rb; get diagnostics n = row_count; exception when others then n := -1; end; r := r || 'A updates B room rows=' || n || ' (expect 0 or -1); ';
  begin insert into public.ht_rooms(tenant_id,room_type_id,number) values (tb,rtb,'evil'); ok := true; exception when others then ok := false; end;
  r := r || 'A insert room into B=' || ok || ' (expect false); ';
  begin insert into public.ht_rooms(room_type_id,number) values (rtb,'evil2'); ok := true; exception when others then ok := false; end;
  r := r || 'A room with B type=' || ok || ' (expect false); ';
  begin perform public.ht_add_charge(sb,'food',5); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A charge B stay=' || ok || ' err=' || err || ' (expect false); ';
  begin perform public.ht_check_out(sb, 0); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A checkout B stay=' || ok || ' (expect false); ';
  begin perform public.ht_create_stay(rb, td+10, td+11, p_guest_name=>'evil'); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'A book B room=' || ok || ' err=' || err || ' (expect false); ';
  begin perform * from public.ht_stay_totals(sb); ok := true; exception when others then ok := false; end;
  r := r || 'A totals B stay=' || ok || ' (expect false); ';

  -- anon
  perform set_config('role','anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into n from public.ht_stays; exception when others then n := -1; end;
  r := r || 'anon stays=' || n || ' (expect 0 or -1); ';
  select count(*) into n from public.ht_sites where slug='ht-b-test'; r := r || 'anon sees published site=' || n || ' (expect 1); ';
  begin select count(*) into n from public.ht_room_types where tenant_id=ta; exception when others then n := -1; end; r := r || 'anon sees unpublished types=' || n || ' (expect 0 or -1); ';
  begin select reception_telegram into err from public.ht_sites limit 1; ok := true; exception when others then ok := false; end;
  r := r || 'anon reads telegram col=' || ok || ' (expect false); ';
  insert into public.ht_booking_requests(tenant_id,guest_name,phone,check_in,check_out) values (tb,'Web Guest','0911000009',td+1,td+2);
  r := r || 'anon request ok; ';
  begin select count(*) into n from public.ht_booking_requests; exception when others then n := -1; end;
  r := r || 'anon reads requests=' || n || ' (expect -1); ';
  begin insert into public.ht_booking_requests(tenant_id,guest_name,phone,check_in,check_out) values (ta,'Web Guest','0911000009',td+1,td+2); ok := true; exception when others then ok := false; end;
  r := r || 'anon request to unpublished=' || ok || ' (expect false); ';
  begin insert into public.ht_booking_requests(tenant_id,guest_name,phone,check_in,check_out,status) values (tb,'Web','0911000010',td+1,td+2,'confirmed'); ok := true; exception when others then ok := false; end;
  r := r || 'anon sets status=' || ok || ' (expect false); ';
  insert into public.ht_booking_requests(tenant_id,guest_name,phone,check_in,check_out) values (tb,'Web Guest','0911000009',td+1,td+2),(tb,'Web Guest','0911000009',td+1,td+2);
  begin insert into public.ht_booking_requests(tenant_id,guest_name,phone,check_in,check_out) values (tb,'Web Guest','0911000009',td+1,td+2); ok := true; exception when others then ok := false; err := sqlerrm; end;
  r := r || 'anon 4th request=' || ok || ' err=' || err || ' (expect false, rate_limited); ';
  begin perform public.ht_create_stay(rb, td+20, td+21, p_guest_name=>'evil'); ok := true; exception when others then ok := false; end;
  r := r || 'anon rpc=' || ok || ' (expect false); ';

  raise exception 'RLS_TEST_RESULTS (rolled back): %', r;
end $$;
