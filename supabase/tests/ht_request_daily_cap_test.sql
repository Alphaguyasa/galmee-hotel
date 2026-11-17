-- Website booking request limits: 3 per phone and 40 per hotel per hour,
-- 150 per hotel per day. Runs in the demo tenant and always rolls back
-- (ends with RAISE). Older rows are moved back in time with UPDATE, since
-- the insert guard always stamps created_at = now().
-- Expect: phone=ok hour=ok day=ok, day_total=150.
do $$
declare
  t uuid; n int := 0; v_hour int; v_day int;
  phone_ok text := 'FAIL'; hour_ok text := 'FAIL'; day_ok text := 'FAIL';
begin
  select id into t from tenants where name = 'Galmee Hotel Demo';

  -- Start from an empty hour so the counts below are exact.
  update ht_booking_requests set created_at = now() - interval '2 hours'
   where tenant_id = t and created_at > now() - interval '1 hour';

  -- Phone: 3 from the same number pass, the 4th is refused.
  for i in 1..3 loop
    insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
      values (t, 'Cap Test', '+251900000000', current_date + 1, current_date + 2, 1);
  end loop;
  begin
    insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
      values (t, 'Cap Test', '+251900000000', current_date + 1, current_date + 2, 1);
  exception when others then
    if sqlerrm = 'rate_limited' then phone_ok := 'ok'; end if;
  end;

  -- Hotel hour: fill to 40 with different numbers, the 41st is refused.
  select count(*) into v_hour from ht_booking_requests
   where tenant_id = t and created_at > now() - interval '1 hour';
  while v_hour < 40 loop
    n := n + 1;
    insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
      values (t, 'Cap Test', '+2519' || lpad(n::text, 8, '0'), current_date + 1, current_date + 2, 1);
    v_hour := v_hour + 1;
  end loop;
  begin
    insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
      values (t, 'Cap Test', '+251988888888', current_date + 1, current_date + 2, 1);
  exception when others then
    if sqlerrm = 'rate_limited' then hour_ok := 'ok'; end if;
  end;

  -- Hotel day: move each full hour back, keep filling to 150, the 151st is refused.
  select count(*) into v_day from ht_booking_requests
   where tenant_id = t and created_at > now() - interval '1 day';
  while v_day < 150 loop
    update ht_booking_requests set created_at = now() - interval '2 hours'
     where tenant_id = t and created_at > now() - interval '1 hour';
    for i in 1..least(39, 150 - v_day) loop
      n := n + 1;
      insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
        values (t, 'Cap Test', '+2519' || lpad(n::text, 8, '0'), current_date + 1, current_date + 2, 1);
      v_day := v_day + 1;
    end loop;
  end loop;
  select count(*) into v_hour from ht_booking_requests
   where tenant_id = t and created_at > now() - interval '1 hour';
  begin
    insert into ht_booking_requests(tenant_id, guest_name, phone, check_in, check_out, adults)
      values (t, 'Cap Test', '+251977777777', current_date + 1, current_date + 2, 1);
  exception when others then
    if sqlerrm = 'rate_limited' and v_hour < 40 then day_ok := 'ok'; end if;
  end;
  select count(*) into v_day from ht_booking_requests
   where tenant_id = t and created_at > now() - interval '1 day';

  raise exception 'RESULT phone=% hour=% day=% day_total=% hour_at_check=%',
    phone_ok, hour_ok, day_ok, v_day, v_hour;
end $$;
