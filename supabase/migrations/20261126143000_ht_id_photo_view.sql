-- Owners and managers open a guest's ID photo. The call returns the storage path (the app
-- then asks Storage for a 60-second signed URL, which the bucket policy allows only for
-- owner/manager) and logs who looked at which stay's photo in ht_register_prints.
create function private.ht_id_photo_view(p_stay uuid)
returns text language plpgsql security definer set search_path = public, private as $$
declare v_tenant uuid := private.ht_require_tenant(); v_path text;
begin
  if private.current_app_role() not in ('owner', 'manager') then
    raise exception 'not_allowed';
  end if;
  select id_photo_path into v_path from ht_stays where id = p_stay and tenant_id = v_tenant;
  if not found then raise exception 'stay_not_found'; end if;
  if v_path is null then raise exception 'no_photo'; end if;
  insert into ht_register_prints (tenant_id, kind, stay_id, printed_by)
  values (v_tenant, 'id_photo', p_stay, auth.uid());
  return v_path;
end $$;

create function public.ht_id_photo_view(p_stay uuid)
returns text language sql security invoker set search_path = public, private as $$
  select private.ht_id_photo_view(p_stay)
$$;

revoke all on function private.ht_id_photo_view(uuid) from public, anon;
grant execute on function private.ht_id_photo_view(uuid) to authenticated;
revoke all on function public.ht_id_photo_view(uuid) from public, anon;
grant execute on function public.ht_id_photo_view(uuid) to authenticated;
