-- Booking request messages: reception Telegram on insert, guest SMS on confirm.
-- Runs in the demo tenant and always rolls back (ends with RAISE).
-- Expect: tg=1 with room type, Ethiopian dates and the trimmed note;
--         sms=1 even though the request is confirmed twice;
--         sms2=1 using the linked stay's dates, not the requested ones.
do $$
declare t uuid; rt uuid; req uuid; req2 uuid; st record; n_tg int; n_sms int; b_tg text; b_sms text; b_sms2 text; n_sms2 int;
begin
  select id into t from tenants where name = 'Galmee Hotel Demo';
  select id into rt from ht_room_types where tenant_id = t limit 1;
  select id, check_in, check_out into st from ht_stays where tenant_id = t order by created_at limit 1;
  insert into ht_sites(tenant_id, slug, display_name, reception_telegram)
    values (t, 'zz-test-' || substr(md5(random()::text), 1, 6), 'Test Lodge', '12345')
    on conflict (tenant_id) do update set reception_telegram = '12345';
  update tenants set default_lang = 'en' where id = t;

  insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, room_type_id, adults, message)
    values (t, 'Test Guest', '+251911000000', '2026-11-20', '2026-11-22', rt, 2, '  late arrival  ') returning id into req;
  select count(*), max(body) into n_tg, b_tg from notifications
   where tenant_id = t and channel = 'telegram' and to_addr = '12345' and created_at = now();

  update ht_booking_requests set status = 'confirmed' where id = req;
  update ht_booking_requests set status = 'confirmed' where id = req;
  select count(*), max(body) into n_sms, b_sms from notifications
   where tenant_id = t and channel = 'sms' and to_addr = '+251911000000' and created_at = now();

  insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
    values (t, 'Other Guest', '+251911000001', '2026-12-01', '2026-12-02', 1) returning id into req2;
  update ht_booking_requests set status = 'declined' where id = req2;
  update ht_booking_requests set status = 'new' where id = req2;
  update ht_booking_requests set status = 'confirmed', stay_id = st.id where id = req2;
  select count(*), max(body) into n_sms2, b_sms2 from notifications
   where tenant_id = t and channel = 'sms' and to_addr = '+251911000001' and created_at = now();

  raise exception 'RESULT tg=% [%] | sms=% [%] | sms2=% [%] stay %..%',
    n_tg, b_tg, n_sms, b_sms, n_sms2, b_sms2, st.check_in, st.check_out;
end $$;

-- Ethiopian dates: expect Meskerem 1, 2019 | ኅዳር 8, 2019 | Qaammee 6, 2019 (leap year)
select private.ht_eth_date('2026-09-11', 'en'), private.ht_eth_date('2026-11-17', 'am'), private.ht_eth_date('2027-09-11', 'om');
