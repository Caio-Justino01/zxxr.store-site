begin;
create or replace function public.create_order(p_request jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; setting public.store_settings; v public.store_variants; i jsonb; lines jsonb='[]'; qty integer; subtotal integer=0; seen text[]='{}'; email text;
begin
 perform private.actor(); if p_key is null or octet_length(p_request::text)>32768 then raise exception 'invalid_data'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_key::text,0));
 select * into o from public.orders where customer_id=auth.uid() and request_key=p_key;
 if found then if o.request_data<>p_request then raise exception 'idempotency_conflict'; end if; return private.public_order(o); end if;
 if (select count(*) from public.orders where customer_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'rate_limited'; end if;
 select * into setting from public.store_settings for share;
 if not setting.open then raise exception 'closed'; end if;
 perform public.save_profile(p_request->'customer');
 if not private.valid_address(p_request->'address') or coalesce(length(p_request->>'note'),0)>280 or coalesce(p_request->>'paymentPreference','') not in ('pix','credit','boleto') then raise exception 'invalid_data'; end if;
 if p_request->>'paymentPreference'='boleto' and not setting.boleto then raise exception 'invalid_data'; end if;
 if jsonb_typeof(p_request->'items') is distinct from 'array' then raise exception 'invalid_data'; end if;
 if jsonb_array_length(p_request->'items') not between 1 and 20 then raise exception 'invalid_data'; end if;
 for i in select value from jsonb_array_elements(p_request->'items') loop
  if coalesce(i->>'quantity','') !~ '^([1-9]|10)$' or (i->>'productId')||':'||(i->>'size')=any(seen) then raise exception 'invalid_data'; end if;
  seen=array_append(seen,(i->>'productId')||':'||(i->>'size')); qty=(i->>'quantity')::integer;
  select * into v from public.store_variants where product_id=i->>'productId' and size=i->>'size' for share;
  if not found or not v.active then raise exception 'unavailable'; end if;
  if coalesce(i->>'expectedUnitCents','') !~ '^\d+$' or (i->>'expectedUnitCents')::integer<>v.price_cents then raise exception 'price_changed'; end if;
  subtotal=subtotal+qty*v.price_cents;
  lines=lines||jsonb_build_array(jsonb_build_object('productId',v.product_id,'name',v.name,'color',v.color,'size',v.size,'sku',v.sku,'quantity',qty,'unitCents',v.price_cents,'totalCents',qty*v.price_cents));
 end loop;
 select u.email into email from auth.users u where id=auth.uid();
 insert into public.orders(customer_id,customer,address,items,subtotal_cents,payment_preference,note,test_mode,request_key,request_data)
 values(auth.uid(),(p_request->'customer')||jsonb_build_object('email',email),p_request->'address',lines,subtotal,p_request->>'paymentPreference',coalesce(p_request->>'note',''),setting.test_mode,p_key,p_request) returning * into o;
 insert into public.order_events(order_id,actor_id,kind,label,new_stage) values(o.id,auth.uid(),'received','Pedido registrado','received');
 if p_request->>'saveAddress'='true' then perform public.save_address(p_request->'address'); end if;
 return private.public_order(o);
end $$;

create or replace function public.list_orders(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare is_team boolean=false;
begin
 perform private.actor();
 if p_filters->>'admin'='true' then perform private.require_staff(); is_team=true; end if;
 return coalesce((select jsonb_agg(private.public_order(o,is_team) order by o.created_at desc) from public.orders o
 where (is_team or o.customer_id=auth.uid())
 and (coalesce(p_filters->>'stage','')='' or o.stage=p_filters->>'stage')
 and (coalesce(p_filters->>'assignee','')='' or o.assignee_id::text=p_filters->>'assignee')
 and (coalesce(p_filters->>'from','')='' or (o.created_at at time zone 'America/Sao_Paulo')::date>=(p_filters->>'from')::date)
 and (coalesce(p_filters->>'to','')='' or (o.created_at at time zone 'America/Sao_Paulo')::date<=(p_filters->>'to')::date)
 and (coalesce(p_filters->>'q','')='' or position(lower(p_filters->>'q') in lower(o.reference||' '||(o.customer->>'name')||' '||(o.customer->>'email')))>0)), '[]'::jsonb);
end $$;

create or replace function public.order_action(p_id uuid,p_version integer,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text; o public.orders; old_stage text; label text; target uuid; reason text; cents integer; v public.store_variants; i jsonb; lines jsonb='[]'; subtotal integer=0; qty integer; seen text[]='{}';
begin
 r=private.require_staff(); select * into o from public.orders where id=p_id for update; if not found then raise exception 'not_found'; end if;
 if o.version<>p_version then raise exception 'version_conflict'; end if;
 old_stage=o.stage; reason=trim(coalesce(p_data->>'reason',''));
 if length(reason)>2000 or octet_length(p_data::text)>32768 then raise exception 'invalid_data'; end if;
 if p_action in ('release_quote','pay','cancel','refund') and r<>'owner' then raise exception 'forbidden'; end if;
 if o.stage='cancelled' and p_action not in ('refund','note','contact_prepared','contact_done') then raise exception 'invalid_transition'; end if;
 case p_action
 when 'start' then
  if o.stage<>'received' then raise exception 'invalid_transition'; end if; o.stage='in_service'; label='Atendimento iniciado';
 when 'assign' then
  target=nullif(p_data->>'assignee','')::uuid;
  if r<>'owner' and (target is distinct from auth.uid() and (target is not null or o.assignee_id is distinct from auth.uid())) then raise exception 'forbidden'; end if;
  if target is not null and not exists(select 1 from public.staff_access where user_id=target and active) then raise exception 'invalid_data'; end if;
  o.assignee_id=target; label='Responsável atualizado';
 when 'address' then
  if not private.valid_address(p_data->'address') or length(reason)<3 then raise exception 'invalid_data'; end if;
  if o.payment_state<>'pending' and r<>'owner' then raise exception 'forbidden'; end if;
  if o.stage in ('shipped','delivered') then raise exception 'invalid_transition'; end if;
  o.address=p_data->'address'; o.checklist=o.checklist||'{"address_confirmed":false}'::jsonb;
  if o.payment_state='pending' then o.quote_released=false; o.payment_url=null; o.shipping_cents=null; o.total_cents=null; o.stage='in_service'; end if;
  label='Dados de entrega atualizados';
 when 'items' then
  if length(reason)<3 or jsonb_typeof(p_data->'items') is distinct from 'array' then raise exception 'invalid_data'; end if;
  if jsonb_array_length(p_data->'items') not between 1 and 20 then raise exception 'invalid_data'; end if;
  if o.stage in ('production','packing','shipped','delivered') then raise exception 'invalid_transition'; end if;
  if o.payment_state<>'pending' and r<>'owner' then raise exception 'forbidden'; end if;
  for i in select value from jsonb_array_elements(p_data->'items') loop
   if coalesce(i->>'quantity','') !~ '^([1-9]|10)$' or (i->>'productId')||':'||(i->>'size')=any(seen) then raise exception 'invalid_data'; end if;
   seen=array_append(seen,(i->>'productId')||':'||(i->>'size')); qty=(i->>'quantity')::integer;
   select * into v from public.store_variants where product_id=i->>'productId' and size=i->>'size' for share;
   if not found or not v.active then raise exception 'unavailable'; end if;
   -- Keep the original unit value for the same design; size changes never reprice a paid order.
   select (item->>'unitCents')::integer into cents from jsonb_array_elements(o.items) item where item->>'productId'=v.product_id limit 1;
   cents=coalesce(cents,v.price_cents); subtotal=subtotal+qty*cents;
   lines=lines||jsonb_build_array(jsonb_build_object('productId',v.product_id,'name',v.name,'color',v.color,'size',v.size,'sku',v.sku,'quantity',qty,'unitCents',cents,'totalCents',qty*cents));
  end loop;
  if o.payment_state<>'pending' and subtotal<>o.subtotal_cents then raise exception 'invalid_transition'; end if;
  o.items=lines; o.subtotal_cents=subtotal; o.checklist=o.checklist||'{"production_reviewed":false,"package_checked":false}'::jsonb;
  if o.payment_state='pending' then o.quote_released=false; o.payment_url=null; o.shipping_cents=null; o.total_cents=null; o.stage='in_service'; end if;
  label='Seleção alterada a pedido do cliente';
 when 'checklist' then
  if coalesce(p_data->>'key','') not in ('address_confirmed','production_reviewed','package_checked') or jsonb_typeof(p_data->'checked') is distinct from 'boolean' then raise exception 'invalid_data'; end if;
  o.checklist=o.checklist||jsonb_build_object(p_data->>'key',p_data->'checked');
 when 'quote' then
  if o.payment_state<>'pending' or o.stage not in ('received','in_service','awaiting_payment') then raise exception 'invalid_transition'; end if;
  if coalesce(p_data->>'shippingCents','') !~ '^\d{1,7}$' or coalesce(length(trim(p_data->>'deadline')),0) not between 3 and 200 then raise exception 'invalid_data'; end if;
  cents=(p_data->>'shippingCents')::integer; o.shipping_cents=cents; o.total_cents=o.subtotal_cents+cents; o.production_deadline=trim(p_data->>'deadline');
  o.quote_released=false; o.payment_url=null; o.stage='in_service'; label='Condições de entrega em conferência';
 when 'release_quote' then
  if o.payment_state<>'pending' or o.shipping_cents is null or coalesce(length(o.production_deadline),0)<3 or o.stage not in ('in_service','awaiting_payment') or coalesce(o.checklist->>'address_confirmed','false')<>'true' then raise exception 'invalid_transition'; end if;
  if coalesce(p_data->>'paymentUrl','')<>'' and (p_data->>'paymentUrl' !~ '^https://[^[:space:]@]+$' or length(p_data->>'paymentUrl')>1000) then raise exception 'invalid_data'; end if;
  o.payment_url=nullif(p_data->>'paymentUrl',''); o.quote_released=true; o.stage='awaiting_payment'; label='Frete, total e prazo confirmados';
 when 'pay' then
  if o.stage<>'awaiting_payment' or not o.quote_released or o.payment_state<>'pending' then raise exception 'invalid_transition'; end if;
  if length(reason)<3 then raise exception 'invalid_data'; end if;
  o.payment_state='paid'; o.stage='confirmed'; label='Pagamento confirmado pela loja';
 when 'production' then if o.stage<>'confirmed' or o.payment_state<>'paid' or coalesce(o.checklist->>'production_reviewed','false')<>'true' then raise exception 'invalid_transition'; end if; o.stage='production'; label='Produção iniciada';
 when 'packing' then if o.stage<>'production' or o.payment_state<>'paid' then raise exception 'invalid_transition'; end if; o.stage='packing'; label='Peças em preparação para envio';
 when 'ship' then
  if o.stage<>'packing' or o.payment_state<>'paid' then raise exception 'invalid_transition'; end if;
  if coalesce(o.checklist->>'package_checked','false')<>'true' or coalesce(o.checklist->>'address_confirmed','false')<>'true' then raise exception 'invalid_transition'; end if;
  if coalesce(length(trim(p_data->>'trackingCode')),0) not between 3 and 100 or length(reason)<3 then raise exception 'invalid_data'; end if;
  if coalesce(p_data->>'trackingUrl','')<>'' and (p_data->>'trackingUrl' !~ '^https://[^[:space:]@]+$' or length(p_data->>'trackingUrl')>1000) then raise exception 'invalid_data'; end if;
  o.tracking_code=trim(p_data->>'trackingCode'); o.tracking_url=nullif(p_data->>'trackingUrl',''); o.stage='shipped'; label='Pedido enviado';
 when 'deliver' then if o.stage<>'shipped' then raise exception 'invalid_transition'; end if; o.stage='delivered'; label='Entrega confirmada pela loja';
 when 'cancel' then
  if o.stage in ('delivered','cancelled') or length(reason)<3 then raise exception 'invalid_transition'; end if;
  o.stage='cancelled'; if o.payment_state='paid' then o.payment_state='refund_pending'; end if; label='Pedido cancelado pela loja';
 when 'refund' then
  if o.payment_state<>'refund_pending' or length(reason)<3 then raise exception 'invalid_transition'; end if;
  o.payment_state='refunded'; label='Estorno confirmado pela loja';
 when 'note' then
  if coalesce(length(trim(p_data->>'body')),0) not between 1 and 2000 then raise exception 'invalid_data'; end if;
  insert into public.order_notes(order_id,author_id,body) values(o.id,auth.uid(),trim(p_data->>'body'));
 when 'contact_prepared' then insert into public.order_contacts(order_id,author_id,kind) values(o.id,auth.uid(),'prepared');
 when 'contact_done' then insert into public.order_contacts(order_id,author_id,kind) values(o.id,auth.uid(),'declared');
 else raise exception 'invalid_data';
 end case;
 o.version=o.version+1; o.updated_at=now();
 update public.orders set address=o.address,items=o.items,subtotal_cents=o.subtotal_cents,shipping_cents=o.shipping_cents,total_cents=o.total_cents,production_deadline=o.production_deadline,
 quote_released=o.quote_released,payment_url=o.payment_url,payment_state=o.payment_state,stage=o.stage,assignee_id=o.assignee_id,
 tracking_code=o.tracking_code,tracking_url=o.tracking_url,checklist=o.checklist,version=o.version,updated_at=o.updated_at where id=o.id;
 if label is not null then insert into public.order_events(order_id,actor_id,kind,label,old_stage,new_stage) values(o.id,auth.uid(),p_action,label,old_stage,o.stage); end if;
 insert into public.store_audit(actor_id,action,target,detail) values(auth.uid(),p_action,o.id::text,jsonb_build_object('from',old_stage,'to',o.stage,'reason',reason));
 return public.order_detail(o.id,true);
end $$;
commit;
