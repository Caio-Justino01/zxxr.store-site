begin;
-- Preserve historical test orders, but keep them out of the live order list,
-- payment metrics and production exports, which all use this authorized RPC.
create or replace function public.list_orders(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare is_team boolean=false;
begin
 perform private.actor();
 if p_filters->>'admin'='true' then perform private.require_staff(); is_team=true; end if;
 return coalesce((select jsonb_agg(private.public_order(o,is_team) order by o.created_at desc) from public.orders o
 where (is_team or o.customer_id=auth.uid())
 and o.test_mode=(select test_mode from public.store_settings where id)
 and (coalesce(p_filters->>'stage','')='' or o.stage=p_filters->>'stage')
 and (coalesce(p_filters->>'assignee','')='' or o.assignee_id::text=p_filters->>'assignee')
 and (coalesce(p_filters->>'from','')='' or (o.created_at at time zone 'America/Sao_Paulo')::date>=(p_filters->>'from')::date)
 and (coalesce(p_filters->>'to','')='' or (o.created_at at time zone 'America/Sao_Paulo')::date<=(p_filters->>'to')::date)
 and (coalesce(p_filters->>'q','')='' or position(lower(p_filters->>'q') in lower(o.reference||' '||(o.customer->>'name')||' '||(o.customer->>'email')))>0)), '[]'::jsonb);
end $$;
commit;
