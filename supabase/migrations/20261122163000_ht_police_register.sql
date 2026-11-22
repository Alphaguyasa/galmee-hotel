-- Guest register for the police: the extra columns the paper ledger asks for, an audit
-- table for register prints and ID photo views, a private bucket for ID photos, and the
-- RPCs that write the guest's ID details (check-in and same-day corrections).

alter table public.ht_stays
  add column coming_from text check (char_length(coming_from) <= 80),
  add column going_to text check (char_length(going_to) <= 80),
  add column purpose text check (char_length(purpose) <= 80),
  add column id_photo_path text check (char_length(id_photo_path) <= 200);

-- Who printed which night's register, and who looked at which guest's ID photo.
create table public.ht_register_prints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('register', 'id_photo')),
  register_date date,
  stay_id uuid,
  printed_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((kind = 'register' and register_date is not null and stay_id is null)
      or (kind = 'id_photo' and stay_id is not null and register_date is null)),
  foreign key (tenant_id, stay_id) references public.ht_stays(tenant_id, id) on delete cascade
);
create index ht_register_prints_tenant_idx on public.ht_register_prints (tenant_id, created_at desc);
create index ht_register_prints_stay_idx on public.ht_register_prints (tenant_id, stay_id);

alter table public.ht_register_prints enable row level security;
revoke insert, update, delete, truncate on public.ht_register_prints from anon, authenticated;
revoke select on public.ht_register_prints from anon;
create policy ht_register_prints_sel on public.ht_register_prints for select to authenticated
  using (tenant_id = (select private.current_tenant())
         and (select private.current_app_role()) in ('owner', 'manager'));

-- ID photos: private, JPEG only, 300 KB max. Path: <tenant>/<stay>-<suffix>.jpg.
-- Any member may upload into their own tenant's folder (reception captures at the desk);
-- only owner/manager may read (signed URLs) or delete. No updates: a retake is a new file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ht-guest-ids', 'ht-guest-ids', false, 307200, array['image/jpeg'])
on conflict (id) do nothing;

create policy ht_guest_ids_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ht-guest-ids'
              and (storage.foldername(name))[1] = (select private.current_tenant())::text);

create policy ht_guest_ids_select on storage.objects for select to authenticated
  using (bucket_id = 'ht-guest-ids'
         and (storage.foldername(name))[1] = (select private.current_tenant())::text
         and (select private.current_app_role()) in ('owner', 'manager'));

create policy ht_guest_ids_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ht-guest-ids'
         and (storage.foldername(name))[1] = (select private.current_tenant())::text
         and (select private.current_app_role()) in ('owner', 'manager'));

-- Shared validation for the guest ID fields. Returns nothing; raises a stable error code.
create function private.ht_check_guest_id(
  p_id_type text, p_id_number text, p_nationality text,
  p_coming_from text, p_going_to text, p_purpose text
) returns void language plpgsql immutable set search_path = public, private as $$
begin
  if p_id_type is not null and p_id_type not in ('kebele','national','passport','driving','other') then
    raise exception 'invalid_id_type';
  end if;
  if p_id_type is not null and nullif(btrim(coalesce(p_id_number, '')), '') is null then
    raise exception 'id_number_required';
  end if;
  if char_length(coalesce(p_id_number, '')) > 40
     or char_length(coalesce(p_nationality, '')) > 60
     or char_length(coalesce(p_coming_from, '')) > 80
     or char_length(coalesce(p_going_to, '')) > 80
     or char_length(coalesce(p_purpose, '')) > 80 then
    raise exception 'too_long';
  end if;
end $$;

-- Check-in keeps its signature and now validates the ID fields the same way.
create or replace function private.ht_check_in(p_stay uuid, p_id_type text, p_id_number text, p_nationality text)
returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype;
begin
  perform private.ht_check_guest_id(p_id_type, p_id_number, p_nationality, null, null, null);
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status = 'in_house' then return; end if;
  if v.status <> 'reserved' then raise exception 'bad_status'; end if;
  if v.check_in > private.ht_today() then raise exception 'too_early'; end if;
  update ht_stays set status = 'in_house', checked_in_at = now(),
         id_type = coalesce(p_id_type, id_type),
         id_number = coalesce(nullif(btrim(p_id_number), ''), id_number),
         nationality = coalesce(nullif(btrim(p_nationality), ''), nationality)
   where id = p_stay;
  update bookings set status = 'checked_in' where id = v.booking_id and tenant_id = v_tenant;
end $$;

-- Set or correct a guest's ID details. Any member, for a reserved or in-house stay, or a
-- stay checked out less than 24 hours ago (the register must stop moving after that).
-- Null or empty text clears a field; a null photo path keeps the current photo.
-- With p_check_in the stay is also checked in, in the same transaction (the desk's
-- check-in sheet saves the register details and checks in with one tap).
create function private.ht_set_guest_id(
  p_stay uuid, p_id_type text, p_id_number text, p_nationality text,
  p_coming_from text, p_going_to text, p_purpose text, p_photo_path text, p_check_in boolean
) returns void language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v ht_stays%rowtype;
begin
  perform private.ht_check_guest_id(p_id_type, p_id_number, p_nationality, p_coming_from, p_going_to, p_purpose);
  select * into v from ht_stays where id = p_stay and tenant_id = v_tenant for update;
  if not found then raise exception 'stay_not_found'; end if;
  if v.status in ('cancelled', 'no_show') then raise exception 'bad_status'; end if;
  if v.status = 'checked_out' and v.checked_out_at < now() - interval '24 hours' then
    raise exception 'too_late';
  end if;
  if p_photo_path is not null
     and p_photo_path !~ ('^' || v_tenant::text || '/' || p_stay::text || '-[a-z0-9]{1,16}\.jpg$') then
    raise exception 'invalid_photo_path';
  end if;
  update ht_stays set
         id_type = p_id_type,
         id_number = nullif(btrim(p_id_number), ''),
         nationality = nullif(btrim(p_nationality), ''),
         coming_from = nullif(btrim(p_coming_from), ''),
         going_to = nullif(btrim(p_going_to), ''),
         purpose = nullif(btrim(p_purpose), ''),
         id_photo_path = coalesce(p_photo_path, id_photo_path)
   where id = p_stay;
  if p_check_in then
    perform private.ht_check_in(p_stay, null, null, null);
  end if;
end $$;

create function public.ht_set_guest_id(
  p_stay uuid, p_id_type text default null, p_id_number text default null, p_nationality text default null,
  p_coming_from text default null, p_going_to text default null, p_purpose text default null,
  p_photo_path text default null, p_check_in boolean default false
) returns void language sql security invoker set search_path = public, private as $$
  select private.ht_set_guest_id(p_stay, p_id_type, p_id_number, p_nationality, p_coming_from, p_going_to, p_purpose, p_photo_path, p_check_in)
$$;

revoke all on function private.ht_check_guest_id(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function private.ht_set_guest_id(uuid, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function private.ht_set_guest_id(uuid, text, text, text, text, text, text, text, boolean) to authenticated;
revoke all on function public.ht_set_guest_id(uuid, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.ht_set_guest_id(uuid, text, text, text, text, text, text, text, boolean) to authenticated;
