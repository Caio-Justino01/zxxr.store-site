begin;

-- Scope the singleton update so PostgreSQL safeupdate can keep protecting
-- unfiltered writes. Existing owner/MFA checks and grants are unchanged.
create or replace function public.settings_update(p_open boolean, p_boleto boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_owner();
  update public.store_settings
    set open = p_open, boleto = p_boleto
    where id = true;
  if not found then
    raise exception 'not_found';
  end if;
  insert into public.store_audit(actor_id, action, target, detail)
    values(auth.uid(), 'settings', 'store',
      jsonb_build_object('open', p_open, 'boleto', p_boleto));
end;
$$;

commit;
