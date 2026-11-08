-- Queues a Telegram message to reception for each website booking request.
-- Delivery is handled by the notifications sender Edge Function.
create function private.ht_booking_request_notify() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_chat text;
begin
  select reception_telegram into v_chat from ht_sites where tenant_id = new.tenant_id;
  if v_chat is not null and btrim(v_chat) <> '' then
    insert into notifications(tenant_id, channel, to_addr, body)
    values (new.tenant_id, 'telegram', v_chat,
            format('New booking request: %s, %s, %s to %s, %s guest(s)', new.guest_name, new.phone, new.check_in, new.check_out, new.adults));
  end if;
  return new;
end $$;
revoke all on function private.ht_booking_request_notify() from public, anon, authenticated;
create trigger ht_booking_requests_notify after insert on public.ht_booking_requests
  for each row execute function private.ht_booking_request_notify();
