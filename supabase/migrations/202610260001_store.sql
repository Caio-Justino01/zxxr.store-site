begin;
create schema if not exists private;
revoke all on schema private from public;

create table public.store_settings (
 id boolean primary key default true check(id), open boolean not null default false,
 test_mode boolean not null default true, boleto boolean not null default false
);
insert into public.store_settings(id) values(true);
create table public.profiles (
 user_id uuid primary key references auth.users(id), name text not null default '' check(length(name)<=80),
 phone text not null default '' check(length(phone)<=15), updated_at timestamptz not null default now()
);
create table public.staff_access (
 user_id uuid primary key references auth.users(id), role text not null check(role in ('owner','staff')),
 active boolean not null default true, updated_at timestamptz not null default now()
);
create table public.addresses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 data jsonb not null, created_at timestamptz not null default now()
);
create table public.store_variants (
 product_id text not null, size text not null check(size in ('P','M','G','GG')), sku text unique not null,
 name text not null, color text not null, price_cents integer not null check(price_cents>0), active boolean not null default true,
 primary key(product_id,size)
);
insert into public.store_variants(product_id,size,sku,name,color,price_cents)
select p.id,s.size,'ZXXR-D01-'||p.code||'-'||s.size,p.name,p.color,10000
from (values ('boca','BOCA','Boca','Off-white'),('flores','FLOR','Flores','Off-white'),('me-preservando','PRES','Me preservando','Off-white'),('spiritual-gangsta','SPIR','Spiritual Gangsta','Preto estonado'),('zxxr-rosa','ROSA','ZXXR Rosa','Preto estonado')) as p(id,code,name,color)
cross join (values('P'),('M'),('G'),('GG')) as s(size);

create table public.orders (
 id uuid primary key default gen_random_uuid(), order_no bigint generated always as identity unique,
 reference text generated always as ('ZXXR-'||lpad(order_no::text,6,'0')) stored,
 customer_id uuid not null references auth.users(id), customer jsonb not null, address jsonb not null, items jsonb not null,
 subtotal_cents integer not null check(subtotal_cents>0), shipping_cents integer check(shipping_cents>=0), total_cents integer,
 quote_released boolean not null default false, production_deadline text, payment_url text,
 payment_preference text not null check(payment_preference in ('pix','credit','boleto')),
 payment_state text not null default 'pending' check(payment_state in ('pending','paid','refund_pending','refunded')),
 stage text not null default 'received' check(stage in ('received','in_service','awaiting_payment','confirmed','production','packing','shipped','delivered','cancelled')),
 note text not null default '', assignee_id uuid references auth.users(id), tracking_code text, tracking_url text,
 version integer not null default 1, test_mode boolean not null, checklist jsonb not null default '{}',
 request_key uuid not null, request_data jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(customer_id,request_key), check(total_cents is null or total_cents=subtotal_cents+shipping_cents),
 check(not quote_released or (shipping_cents is not null and total_cents is not null and length(production_deadline)>0))
);
create index orders_customer_date on public.orders(customer_id,created_at desc);
create index orders_stage_date on public.orders(stage,created_at desc);
create table public.order_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 actor_id uuid not null references auth.users(id), kind text not null, label text not null,
 old_stage text, new_stage text, created_at timestamptz not null default now()
);
create index order_events_order on public.order_events(order_id,created_at);
create table public.order_notes (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 author_id uuid not null references auth.users(id), body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table public.order_contacts (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 author_id uuid not null references auth.users(id), kind text not null check(kind in ('prepared','declared')),
 created_at timestamptz not null default now()
);
create table public.store_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 action text not null, target text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);

create function private.actor() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'email_required'; end if;
 return auth.uid();
end $$;
create function private.staff_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.staff_access where user_id=auth.uid() and active and auth.jwt()->>'aal'='aal2'
$$;
create function private.require_staff() returns text language plpgsql stable security definer set search_path='' as $$
declare r text;
begin
 perform private.actor();
 select role into r from public.staff_access where user_id=auth.uid() and active;
 if r is null then raise exception 'forbidden'; end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'mfa_required'; end if;
 return r;
end $$;
create function private.require_owner() returns void language plpgsql stable security definer set search_path='' as $$
begin if private.require_staff()<>'owner' then raise exception 'forbidden'; end if; end $$;
create function private.valid_address(a jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(a)='object' and a->>'cep' ~ '^\d{8}$' and length(a->>'recipient') between 2 and 80
 and length(a->>'street') between 2 and 120 and length(a->>'number') between 1 and 20
 and length(a->>'neighborhood') between 2 and 80 and length(a->>'city') between 2 and 80
 and a->>'state' ~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
 and coalesce(length(a->>'complement'),0)<=100 and coalesce(length(a->>'reference'),0)<=160,false)
$$;
create function private.public_order(o public.orders,internal boolean default false) returns jsonb language sql immutable set search_path='' as $$
 select (to_jsonb(o)-'request_key'-'request_data'-'order_no')||case when not internal and not o.quote_released then jsonb_build_object('shipping_cents',null,'total_cents',null,'production_deadline',null,'payment_url',null) else '{}'::jsonb end
$$;

alter table public.store_settings enable row level security;
alter table public.store_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.staff_access enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.order_notes enable row level security;
alter table public.order_contacts enable row level security;
alter table public.store_audit enable row level security;
create policy own_profile on public.profiles for select to authenticated using(user_id=auth.uid());
create policy own_address on public.addresses for select to authenticated using(user_id=auth.uid());
create policy own_orders on public.orders for select to authenticated using(customer_id=auth.uid() or private.staff_role() is not null);
create policy own_events on public.order_events for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or private.staff_role() is not null)));
create policy staff_notes on public.order_notes for select to authenticated using(private.staff_role() is not null);
create policy staff_contacts on public.order_contacts for select to authenticated using(private.staff_role() is not null);

create function public.store_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('open',s.open,'testMode',s.test_mode,'paymentMethods',case when s.boleto then '["pix","credit","boleto"]'::jsonb else '["pix","credit"]'::jsonb end,
 'variants',(select jsonb_agg(to_jsonb(v)-'name'-'color' order by product_id,size) from public.store_variants v)) from public.store_settings s
$$;
create function public.my_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u auth.users; r public.staff_access;
begin
 perform private.actor(); select * into u from auth.users where id=auth.uid(); select * into r from public.staff_access where user_id=u.id;
 return jsonb_build_object('id',u.id,'email',u.email,'role',coalesce(r.role,'customer'),'active',coalesce(r.active,true),'mfa',auth.jwt()->>'aal'='aal2');
end $$;
create function public.my_profile() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.actor();
 return jsonb_build_object('profile',coalesce((select to_jsonb(p)-'user_id' from public.profiles p where user_id=auth.uid()),'{"name":"","phone":""}'::jsonb),
 'addresses',coalesce((select jsonb_agg(data||jsonb_build_object('id',id) order by created_at desc) from public.addresses where user_id=auth.uid()),'[]'::jsonb));
end $$;
create function public.save_profile(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.actor(); if coalesce(length(p_data->>'name'),0) not between 2 and 80 or coalesce(p_data->>'phone','') !~ '^55[1-9]\d\d{8,9}$' then raise exception 'invalid_data'; end if;
 insert into public.profiles(user_id,name,phone) values(auth.uid(),p_data->>'name',p_data->>'phone') on conflict(user_id) do update set name=excluded.name,phone=excluded.phone,updated_at=now();
end $$;
create function public.save_address(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid;
begin
 perform private.actor(); if not private.valid_address(p_data) then raise exception 'invalid_data'; end if;
 if p_data->>'id' is not null then
  update public.addresses set data=p_data-'id' where id=(p_data->>'id')::uuid and user_id=auth.uid() returning id into a;
  if a is null then raise exception 'not_found'; end if;
 else
  if (select count(*) from public.addresses where user_id=auth.uid())>=10 then raise exception 'invalid_data'; end if;
  insert into public.addresses(user_id,data) values(auth.uid(),p_data-'id') returning id into a;
 end if; return a;
end $$;
create function public.create_order(p_request jsonb,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; setting public.store_settings; v public.store_variants; i jsonb; lines jsonb='[]'; qty integer; subtotal integer=0; seen text[]='{}'; email text;
begin
 perform private.actor(); if p_key is null then raise exception 'invalid_data'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_key::text,0));
 select * into o from public.orders where customer_id=auth.uid() and request_key=p_key;
 if found then if o.request_data<>p_request then raise exception 'idempotency_conflict'; end if; return private.public_order(o); end if;
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

create function public.list_orders(p_filters jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare is_team boolean=false;
begin
 perform private.actor();
 if p_filters->>'admin'='true' then perform private.require_staff(); is_team=true; end if;
 return coalesce((select jsonb_agg(private.public_order(o,is_team) order by o.created_at desc) from public.orders o
 where (is_team or o.customer_id=auth.uid())
 and (coalesce(p_filters->>'stage','')='' or o.stage=p_filters->>'stage')
 and (coalesce(p_filters->>'assignee','')='' or o.assignee_id::text=p_filters->>'assignee')
 and (coalesce(p_filters->>'from','')='' or o.created_at::date>=(p_filters->>'from')::date)
 and (coalesce(p_filters->>'to','')='' or o.created_at::date<=(p_filters->>'to')::date)
 and (coalesce(p_filters->>'q','')='' or position(lower(p_filters->>'q') in lower(o.reference||' '||(o.customer->>'name')||' '||(o.customer->>'email')))>0)), '[]'::jsonb);
end $$;
create function public.order_detail(p_id uuid,p_admin boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o public.orders; result jsonb;
begin
 perform private.actor(); if p_admin then perform private.require_staff(); end if;
 select * into o from public.orders where id=p_id and (p_admin or customer_id=auth.uid()); if not found then raise exception 'not_found'; end if;
 result=private.public_order(o,p_admin)||jsonb_build_object('events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'label',label,'created_at',created_at) order by created_at) from public.order_events where order_id=o.id),'[]'::jsonb));
 if p_admin then result=result||jsonb_build_object('notes',coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from public.order_notes n where order_id=o.id),'[]'::jsonb),
 'contacts',coalesce((select jsonb_agg(to_jsonb(c) order by created_at desc) from public.order_contacts c where order_id=o.id),'[]'::jsonb)); end if;
 return result;
end $$;

create function public.order_action(p_id uuid,p_version integer,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r text; o public.orders; old_stage text; label text; target uuid; reason text; cents integer; v public.store_variants; i jsonb; lines jsonb='[]'; subtotal integer=0; qty integer; seen text[]='{}';
begin
 r=private.require_staff(); select * into o from public.orders where id=p_id for update; if not found then raise exception 'not_found'; end if;
 if o.version<>p_version then raise exception 'version_conflict'; end if;
 old_stage=o.stage; reason=trim(coalesce(p_data->>'reason',''));
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

create function public.team_list(p_full boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_staff(); if p_full then perform private.require_owner(); end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'email',case when p_full then u.email else null end,'name',coalesce(nullif(p.name,''),split_part(u.email,'@',1)),'role',a.role,'active',a.active)) from public.staff_access a join auth.users u on u.id=a.user_id left join public.profiles p on p.user_id=a.user_id),'[]'::jsonb);
end $$;
create function public.team_lookup(p_email text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid;
begin perform private.require_owner(); select id into u from auth.users where lower(email)=lower(p_email); return u; end $$;
create function public.team_access(p_email text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 perform private.require_owner(); select id into u from auth.users where lower(email)=lower(p_email); if u is null then raise exception 'not_found'; end if;
 if exists(select 1 from public.staff_access where user_id=u and role='owner') then raise exception 'forbidden'; end if;
 insert into public.staff_access(user_id,role,active) values(u,'staff',p_active) on conflict(user_id) do update set active=excluded.active,updated_at=now();
 insert into public.store_audit(actor_id,action,target) values(auth.uid(),case when p_active then 'staff_enabled' else 'staff_disabled' end,u::text);
end $$;
create function public.settings_update(p_open boolean,p_boleto boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_owner(); update public.store_settings set open=p_open,boleto=p_boleto;
 insert into public.store_audit(actor_id,action,target,detail) values(auth.uid(),'settings','store',jsonb_build_object('open',p_open,'boleto',p_boleto)); end $$;
create function public.variant_update(p_product text,p_price integer,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_owner(); if p_price not between 1 and 10000000 or not exists(select 1 from public.store_variants where product_id=p_product) then raise exception 'invalid_data'; end if;
 update public.store_variants set price_cents=p_price,active=p_active where product_id=p_product;
 insert into public.store_audit(actor_id,action,target,detail) values(auth.uid(),'catalog',p_product,jsonb_build_object('price',p_price,'active',p_active)); end $$;

-- Data API clients only use the checked functions; direct writes are never granted.
revoke all on all tables in schema public from anon,authenticated;
revoke all on all sequences in schema public from anon,authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.store_catalog() to anon,authenticated;
grant execute on function public.my_access(),public.my_profile(),public.save_profile(jsonb),public.save_address(jsonb),public.create_order(jsonb,uuid),public.list_orders(jsonb),public.order_detail(uuid,boolean),public.order_action(uuid,integer,text,jsonb),public.team_list(boolean),public.team_lookup(text),public.team_access(text,boolean),public.settings_update(boolean,boolean),public.variant_update(text,integer,boolean) to authenticated;
commit;
