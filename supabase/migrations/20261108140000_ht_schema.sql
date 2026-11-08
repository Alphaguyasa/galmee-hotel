-- Galmee Hotel schema: rooms, rates, stays, charges, public website, booking requests.
-- Stays and charges are written only through RPCs (see ht_rpcs migration).

create table public.ht_room_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 400),
  capacity int not null default 2 check (capacity between 1 and 20),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, id)
);

create table public.ht_rate_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  room_type_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  nightly_rate numeric(12,2) not null check (nightly_rate >= 0),
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, room_type_id, name),
  foreign key (tenant_id, room_type_id) references public.ht_room_types(tenant_id, id) on delete cascade
);
create unique index ht_rate_plans_one_default on public.ht_rate_plans (room_type_id) where is_default;
create index ht_rate_plans_room_type_idx on public.ht_rate_plans (room_type_id);

create table public.ht_rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  room_type_id uuid not null,
  number text not null check (char_length(number) between 1 and 12),
  floor text check (char_length(floor) <= 20),
  in_service boolean not null default true,
  housekeeping text not null default 'clean' check (housekeeping in ('clean','dirty')),
  notes text check (char_length(notes) <= 400),
  created_at timestamptz not null default now(),
  unique (tenant_id, number),
  unique (tenant_id, id),
  foreign key (tenant_id, room_type_id) references public.ht_room_types(tenant_id, id)
);
create index ht_rooms_type_idx on public.ht_rooms (tenant_id, room_type_id);

create table public.ht_sites (
  tenant_id uuid primary key default private.current_tenant() references public.tenants(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  headline text check (char_length(headline) <= 160),
  about text check (char_length(about) <= 1200),
  address text check (char_length(address) <= 240),
  phone text check (char_length(phone) <= 20),
  published boolean not null default false,
  reception_telegram text check (char_length(reception_telegram) <= 40),
  created_at timestamptz not null default now()
);

create table public.ht_stays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id),
  room_id uuid not null,
  customer_id uuid not null references public.customers(id),
  rate_plan_id uuid,
  nightly_rate numeric(12,2) not null check (nightly_rate >= 0),
  check_in date not null,
  check_out date not null,
  status text not null default 'reserved' check (status in ('reserved','in_house','checked_out','cancelled','no_show')),
  adults int not null default 1 check (adults between 1 and 20),
  children int not null default 0 check (children between 0 and 20),
  id_type text check (id_type in ('kebele','national','passport','driving','other')),
  id_number text check (char_length(id_number) <= 40),
  nationality text check (char_length(nationality) <= 60),
  source text not null default 'walk_in' check (source in ('walk_in','phone','website','other')),
  notes text check (char_length(notes) <= 400),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  final_room_total numeric(12,2),
  final_charges_total numeric(12,2),
  final_paid_total numeric(12,2),
  final_balance numeric(12,2),
  client_ref uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (check_out > check_in),
  unique (tenant_id, id),
  unique (tenant_id, client_ref),
  foreign key (tenant_id, room_id) references public.ht_rooms(tenant_id, id),
  foreign key (tenant_id, rate_plan_id) references public.ht_rate_plans(tenant_id, id)
);
create index ht_stays_room_idx on public.ht_stays (tenant_id, room_id, check_in);
create index ht_stays_status_idx on public.ht_stays (tenant_id, status, check_in);
create index ht_stays_customer_idx on public.ht_stays (customer_id);
create index ht_stays_rate_plan_idx on public.ht_stays (tenant_id, rate_plan_id);

create table public.ht_stay_charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  stay_id uuid not null,
  kind text not null check (kind in ('food','drink','laundry','other')),
  description text check (char_length(description) <= 200),
  amount numeric(12,2) not null check (amount <> 0),
  reverses_id uuid unique references public.ht_stay_charges(id),
  client_ref uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id, client_ref),
  foreign key (tenant_id, stay_id) references public.ht_stays(tenant_id, id)
);
create index ht_stay_charges_stay_idx on public.ht_stay_charges (tenant_id, stay_id);

create table public.ht_stay_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  stay_id uuid not null,
  payment_id uuid not null unique references public.payments(id),
  amount numeric(12,2) not null check (amount > 0),
  client_ref uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, client_ref),
  foreign key (tenant_id, stay_id) references public.ht_stays(tenant_id, id)
);
create index ht_stay_payments_stay_idx on public.ht_stay_payments (tenant_id, stay_id);
create index ht_stay_payments_date_idx on public.ht_stay_payments (tenant_id, created_at);

create table public.ht_booking_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.current_tenant() references public.tenants(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{9,14}$'),
  check_in date not null,
  check_out date not null,
  room_type_id uuid,
  adults int not null default 1 check (adults between 1 and 20),
  message text check (char_length(message) <= 500),
  status text not null default 'new' check (status in ('new','confirmed','declined')),
  stay_id uuid,
  handled_by uuid,
  created_at timestamptz not null default now(),
  check (check_out > check_in),
  foreign key (tenant_id, room_type_id) references public.ht_room_types(tenant_id, id),
  foreign key (tenant_id, stay_id) references public.ht_stays(tenant_id, id)
);
create index ht_booking_requests_status_idx on public.ht_booking_requests (tenant_id, status, created_at desc);
create index ht_booking_requests_phone_idx on public.ht_booking_requests (tenant_id, phone, created_at desc);
create index ht_booking_requests_room_type_idx on public.ht_booking_requests (tenant_id, room_type_id);
create index ht_booking_requests_stay_idx on public.ht_booking_requests (tenant_id, stay_id);

-- RLS
alter table public.ht_room_types enable row level security;
alter table public.ht_rate_plans enable row level security;
alter table public.ht_rooms enable row level security;
alter table public.ht_sites enable row level security;
alter table public.ht_stays enable row level security;
alter table public.ht_stay_charges enable row level security;
alter table public.ht_stay_payments enable row level security;
alter table public.ht_booking_requests enable row level security;

revoke all on public.ht_room_types, public.ht_rate_plans, public.ht_rooms, public.ht_sites,
  public.ht_stays, public.ht_stay_charges, public.ht_stay_payments, public.ht_booking_requests from anon;
revoke insert, update, delete, truncate on public.ht_stays, public.ht_stay_charges, public.ht_stay_payments from authenticated;
revoke insert, update, delete, truncate on public.ht_booking_requests from authenticated;

-- Members read their own tenant.
create policy ht_room_types_sel on public.ht_room_types for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_rate_plans_sel on public.ht_rate_plans for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_rooms_sel on public.ht_rooms for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_sites_sel on public.ht_sites for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_stays_sel on public.ht_stays for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_stay_charges_sel on public.ht_stay_charges for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_stay_payments_sel on public.ht_stay_payments for select to authenticated using (tenant_id = (select private.current_tenant()));
create policy ht_booking_requests_sel on public.ht_booking_requests for select to authenticated using (tenant_id = (select private.current_tenant()));

-- Owners and managers configure rooms, rates and the website.
create policy ht_room_types_ins on public.ht_room_types for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy ht_room_types_upd on public.ht_room_types for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()));
create policy ht_room_types_del on public.ht_room_types for delete to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner');

create policy ht_rate_plans_ins on public.ht_rate_plans for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy ht_rate_plans_upd on public.ht_rate_plans for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()));
create policy ht_rate_plans_del on public.ht_rate_plans for delete to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner');

create policy ht_rooms_ins on public.ht_rooms for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy ht_rooms_upd on public.ht_rooms for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()));
create policy ht_rooms_del on public.ht_rooms for delete to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) = 'owner');

create policy ht_sites_ins on public.ht_sites for insert to authenticated
  with check (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'));
create policy ht_sites_upd on public.ht_sites for update to authenticated
  using (tenant_id = (select private.current_tenant()) and (select private.current_app_role()) in ('owner','manager'))
  with check (tenant_id = (select private.current_tenant()));

-- Public website: anon reads only published sites, and only the public columns.
grant select (tenant_id, slug, display_name, headline, about, address, phone, published) on public.ht_sites to anon;
grant select (id, tenant_id, name, description, capacity, sort_order) on public.ht_room_types to anon;
grant select (id, tenant_id, room_type_id, nightly_rate, is_default, active) on public.ht_rate_plans to anon;
create policy ht_sites_public on public.ht_sites for select to anon using (published);
create policy ht_room_types_public on public.ht_room_types for select to anon
  using (exists (select 1 from public.ht_sites s where s.tenant_id = ht_room_types.tenant_id and s.published));
create policy ht_rate_plans_public on public.ht_rate_plans for select to anon
  using (active and exists (select 1 from public.ht_sites s where s.tenant_id = ht_rate_plans.tenant_id and s.published));

-- Public booking form: anon may insert a request, never read one back.
grant insert (tenant_id, guest_name, phone, check_in, check_out, room_type_id, adults, message) on public.ht_booking_requests to anon;
create policy ht_booking_requests_public_ins on public.ht_booking_requests for insert to anon
  with check (
    status = 'new' and stay_id is null and handled_by is null
    and check_in >= (now() at time zone 'Africa/Addis_Ababa')::date
    and check_out <= check_in + 60
    and exists (select 1 from public.ht_sites s where s.tenant_id = ht_booking_requests.tenant_id and s.published)
  );

-- Rate limit public requests (per phone and per hotel) and stop anon setting workflow columns.
create function private.ht_booking_request_guard() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v_phone int; v_tenant int;
begin
  new.status := 'new'; new.stay_id := null; new.handled_by := null; new.created_at := now();
  select count(*) filter (where phone = new.phone), count(*) into v_phone, v_tenant
    from public.ht_booking_requests
   where tenant_id = new.tenant_id and created_at > now() - interval '1 hour';
  if v_phone >= 3 or v_tenant >= 40 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.ht_booking_request_guard() from public, anon, authenticated;
create trigger ht_booking_requests_guard before insert on public.ht_booking_requests
  for each row execute function private.ht_booking_request_guard();
