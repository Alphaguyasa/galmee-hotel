-- Website booking requests: a fuller reception Telegram message, and a guest
-- SMS queued when reception confirms the request. Both are written in the
-- hotel's default language with Ethiopian dates. Delivery is the
-- notifications sender's job; these triggers only queue rows.

-- Ethiopian date as "<month> <day>, <year>" (same output as formatEthiopianDate
-- in src/lib/ethiopian-date.ts, without the era suffix).
create function private.ht_eth_date(p_date date, p_lang text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v_jdn int := to_char(p_date, 'J')::int;
  v_r int := mod(v_jdn - 1723856, 1461);
  v_n int := mod(v_r, 365) + 365 * (v_r / 1460);
  v_year int := 4 * ((v_jdn - 1723856) / 1461) + v_r / 365 - v_r / 1460;
  v_month int := v_n / 30 + 1;
  v_day int := mod(v_n, 30) + 1;
  v_names text[];
begin
  v_names := case p_lang
    when 'om' then array['Fulbaana','Onkoloolessa','Sadaasa','Mudde','Amajjii','Guraandhala','Bitootessa','Ebla','Caamsaa','Waxabajjii','Adoolessa','Hagayya','Qaammee']
    when 'en' then array['Meskerem','Tikimt','Hidar','Tahsas','Tir','Yekatit','Megabit','Miyazya','Ginbot','Sene','Hamle','Nehase','Pagume']
    else array['መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት','መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ']
  end;
  return v_names[v_month] || ' ' || v_day || ', ' || v_year;
end $$;
revoke all on function private.ht_eth_date(date, text) from public, anon, authenticated;

-- Reception alert: room type, guest, phone, Ethiopian dates and the guest's own note.
create or replace function private.ht_booking_request_notify() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_chat text;
  v_lang text;
  v_type text;
  v_from text;
  v_to text;
  v_note text := nullif(btrim(coalesce(new.message, '')), '');
  v_body text;
begin
  select reception_telegram into v_chat from ht_sites where tenant_id = new.tenant_id;
  if v_chat is null or btrim(v_chat) = '' then return new; end if;

  select coalesce(default_lang, 'am') into v_lang from tenants where id = new.tenant_id;
  select name into v_type from ht_room_types where tenant_id = new.tenant_id and id = new.room_type_id;
  v_from := private.ht_eth_date(new.check_in, v_lang);
  v_to := private.ht_eth_date(new.check_out, v_lang);

  v_body := case v_lang
    when 'om' then
      'Gaaffii qabannaa haaraa' || coalesce(' (' || v_type || ')', '') || E'\n'
      || new.guest_name || ', ' || new.phone || E'\n'
      || v_from || ' hanga ' || v_to || ', keessummoota ' || new.adults
    when 'en' then
      'New booking request' || coalesce(' (' || v_type || ')', '') || E'\n'
      || new.guest_name || ', ' || new.phone || E'\n'
      || v_from || ' to ' || v_to || ', ' || new.adults || ' guest(s)'
    else
      'አዲስ የቦታ ማስያዝ ጥያቄ' || coalesce(' (' || v_type || ')', '') || E'\n'
      || new.guest_name || '፣ ' || new.phone || E'\n'
      || 'ከ' || v_from || ' እስከ ' || v_to || '፣ ' || new.adults || ' እንግዳ'
  end;
  if v_note is not null then v_body := v_body || E'\n' || '"' || v_note || '"'; end if;

  insert into notifications(tenant_id, channel, to_addr, body)
  values (new.tenant_id, 'telegram', v_chat, v_body);
  return new;
end $$;
revoke all on function private.ht_booking_request_notify() from public, anon, authenticated;

-- Guest SMS once a request moves to confirmed. Uses the stay's dates when the
-- confirmation created a stay (reception may have changed them).
create function private.ht_booking_confirmed_notify() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  v_lang text;
  v_hotel text;
  v_in date := new.check_in;
  v_out date := new.check_out;
  v_from text;
  v_to text;
  v_body text;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then return new; end if;

  select coalesce(t.default_lang, 'am'), coalesce(nullif(btrim(s.display_name), ''), t.name)
    into v_lang, v_hotel
    from tenants t left join ht_sites s on s.tenant_id = t.id
   where t.id = new.tenant_id;

  if new.stay_id is not null then
    select check_in, check_out into v_in, v_out from ht_stays
     where id = new.stay_id and tenant_id = new.tenant_id;
  end if;
  v_from := private.ht_eth_date(v_in, v_lang);
  v_to := private.ht_eth_date(v_out, v_lang);

  v_body := case v_lang
    when 'om' then v_hotel || ': qabannaan keessan ' || v_from || ' hanga ' || v_to || ' mirkanaa''eera. Galatoomaa!'
    when 'en' then v_hotel || ': your booking from ' || v_from || ' to ' || v_to || ' is confirmed. Thank you!'
    else v_hotel || '፡ ከ' || v_from || ' እስከ ' || v_to || ' ያስያዙት ክፍል ተረጋግጧል። እናመሰግናለን!'
  end;

  insert into notifications(tenant_id, channel, to_addr, body)
  values (new.tenant_id, 'sms', new.phone, v_body);
  return new;
end $$;
revoke all on function private.ht_booking_confirmed_notify() from public, anon, authenticated;

create trigger ht_booking_requests_confirmed after update of status on public.ht_booking_requests
  for each row execute function private.ht_booking_confirmed_notify();
