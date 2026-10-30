begin;
-- Optional first-party measurement. Operational orders and their snapshots stay intact.
create table public.analytics_sessions (
 session_id uuid not null, test_mode boolean not null, visitor_id uuid not null,
 first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
 campaign jsonb not null default '{}', referrer_host text, device text not null default 'desktop',
 primary key(session_id,test_mode)
);
create index analytics_sessions_recent on public.analytics_sessions(test_mode,last_seen);
create table public.analytics_events (
 id uuid primary key, session_id uuid not null, visitor_id uuid not null, test_mode boolean not null,
 kind text not null check(kind in ('page_view','section_view','section_click','product_view','product_click','add_to_cart','remove_from_cart','cart_view','cart_update','begin_checkout','checkout_step','whatsapp_click','heartbeat')),
 page text, section text, product_id text, source text, step smallint, quantity smallint,cart_items jsonb,cart_id uuid,
 occurred_at timestamptz not null default now(), received_at timestamptz not null default now()
);
create index analytics_events_period on public.analytics_events(test_mode,occurred_at);
create index analytics_events_session_rate on public.analytics_events(session_id,received_at);
create index analytics_events_visitor_rate on public.analytics_events(visitor_id,received_at);
create index analytics_cart_snapshot on public.analytics_events(test_mode,visitor_id,received_at desc) where kind='cart_update';
create table public.analytics_order_links (
 order_id uuid primary key references public.orders(id) on delete cascade,
 session_id uuid not null, visitor_id uuid not null, test_mode boolean not null, created_at timestamptz not null default now()
);
create table public.recovery_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default false,
 consent_version text, granted_at timestamptz, updated_at timestamptz not null default now()
);
-- The account version survives closed/expired cycles and invalidates late uploads.
create table public.recovery_accounts (
 user_id uuid not null references auth.users(id) on delete cascade, test_mode boolean not null,
 version integer not null default 0, current_id uuid, blocked_restore boolean not null default false,
 last_order_at timestamptz, primary key(user_id,test_mode)
);
create table public.recovery_carts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 test_mode boolean not null, cart_id uuid not null, stage text not null default 'cart' check(stage in ('cart','checkout')),
 status text not null default 'active' check(status in ('active','empty','converted','revoked','expired')),
 items jsonb not null default '[]', started_at timestamptz not null default now(), last_activity_at timestamptz not null default now(),
 closed_at timestamptz, recovered_at timestamptz, converted_order_id uuid references public.orders(id),
 unique(user_id,test_mode,cart_id)
);
create index recovery_carts_eligible on public.recovery_carts(test_mode,status,last_activity_at);
create table public.recovery_contacts (
 id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.recovery_carts(id) on delete cascade,
 actor_id uuid not null references auth.users(id), action text not null check(action in ('prepared','declared')),
 created_at timestamptz not null default now(), unique(cart_id,action)
);
create table private.analytics_maintenance (id boolean primary key default true check(id),last_run timestamptz);
alter table private.analytics_maintenance enable row level security;
insert into private.analytics_maintenance(id) values(true);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_order_links enable row level security;
alter table public.recovery_preferences enable row level security;
alter table public.recovery_accounts enable row level security;
alter table public.recovery_carts enable row level security;
alter table public.recovery_contacts enable row level security;
revoke all on public.analytics_sessions,public.analytics_events,public.analytics_order_links,public.recovery_preferences,public.recovery_accounts,public.recovery_carts,public.recovery_contacts from public,anon,authenticated;

create function private.analytics_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 update private.analytics_maintenance set last_run=now() where id and (last_run is null or last_run<now()-interval '1 hour');
 if not found then return; end if;
 delete from public.analytics_events where received_at<now()-interval '90 days';
 delete from public.analytics_sessions where last_seen<now()-interval '90 days';
 delete from public.analytics_order_links where created_at<now()-interval '90 days';
 update public.recovery_accounts a set current_id=null,blocked_restore=true,version=version+1
 where exists(select 1 from public.recovery_carts c where c.id=a.current_id and c.last_activity_at<now()-interval '30 days');
 delete from public.recovery_carts where last_activity_at<now()-interval '30 days';
end $$;

create function public.analytics_ingest(p_batch jsonb,p_test_mode boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare s uuid; v uuid; e jsonb; inserted integer=0; n integer; t timestamptz; current_visitor uuid; new_count integer;
begin
 if p_test_mode is distinct from (select test_mode from public.store_settings where id) then raise exception 'forbidden'; end if;
 if octet_length(p_batch::text)>32768 or coalesce(p_batch->'consent'->>'analytics','')<>'true' or coalesce(p_batch->'consent'->>'version','')<>'2026-10-29-v1'
 or jsonb_typeof(p_batch->'events') is distinct from 'array' or jsonb_array_length(p_batch->'events') not between 1 and 20 then raise exception 'invalid_data'; end if;
 s=(p_batch->>'sessionId')::uuid; v=(p_batch->>'visitorId')::uuid;
 if s is null or v is null then raise exception 'invalid_data'; end if;
 -- Rate limits retain neither IPs nor user agents. Edge/WAF limits complement these identity limits.
 perform pg_advisory_xact_lock(hashtextextended('zxxr-analytics-session:'||s::text,0));
 perform pg_advisory_xact_lock(hashtextextended('zxxr-analytics-visitor:'||v::text,0));
 select count(distinct value->>'id') into new_count from jsonb_array_elements(p_batch->'events') where not exists(select 1 from public.analytics_events old where old.id=(value->>'id')::uuid);
 if (select count(*) from public.analytics_events where session_id=s and received_at>now()-interval '1 minute')+new_count>120
 or (select count(*) from public.analytics_events where visitor_id=v and received_at>now()-interval '5 minutes')+new_count>600 then raise exception 'rate_limited'; end if;
 perform private.analytics_cleanup();
 select visitor_id into current_visitor from public.analytics_sessions where session_id=s and test_mode=p_test_mode;
 if found and current_visitor<>v then raise exception 'invalid_data'; end if;
 for e in select value from jsonb_array_elements(p_batch->'events') loop
  if e->>'kind' is not null or coalesce(e->>'type','') not in ('page_view','section_view','section_click','product_view','product_click','add_to_cart','remove_from_cart','cart_view','cart_update','begin_checkout','checkout_step','whatsapp_click','heartbeat') then raise exception 'invalid_data'; end if;
  if e->>'page' is not null and e->>'page' not in ('/','/espera','/espera.html','/sacola','/encomenda','/produto/boca','/produto/flores','/produto/me-preservando','/produto/spiritual-gangsta','/produto/zxxr-rosa') then raise exception 'invalid_data'; end if;
  t=now();
  if e->>'occurredAt' is not null then t=greatest(now()-interval '2 minutes',least(now(),(e->>'occurredAt')::timestamptz)); end if;
  if e->>'type'='cart_update' and (jsonb_typeof(e->'items') is distinct from 'array' or jsonb_array_length(e->'items')>20) then raise exception 'invalid_data'; end if;
  insert into public.analytics_events(id,session_id,visitor_id,test_mode,kind,page,section,product_id,source,step,quantity,cart_items,cart_id,occurred_at)
   values((e->>'id')::uuid,s,v,p_test_mode,e->>'type',e->>'page',e->>'section',e->>'productId',e->>'source',(e->>'step')::smallint,(e->>'quantity')::smallint,case when e->>'type'='cart_update' then e->'items' else null end,(e->>'cartId')::uuid,t)
   on conflict(id) do nothing;
  get diagnostics n=row_count; inserted=inserted+n;
 end loop;
 if inserted>0 then
  insert into public.analytics_sessions(session_id,test_mode,visitor_id,campaign,referrer_host,device)
   values(s,p_test_mode,v,coalesce(p_batch->'campaign','{}'),p_batch->>'referrerHost',coalesce(p_batch->'events'->0->>'device','desktop'))
   on conflict(session_id,test_mode) do update set last_seen=now();
 end if;
 return jsonb_build_object('accepted',inserted);
end $$;

create function public.analytics_link_order(p_order_id uuid,p_session_id uuid,p_visitor_id uuid,p_customer_id uuid,p_test_mode boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_test_mode is distinct from (select test_mode from public.store_settings where id) then return false; end if;
 if not exists(select 1 from public.orders where id=p_order_id and customer_id=p_customer_id and test_mode=p_test_mode)
 or not exists(select 1 from public.analytics_sessions where session_id=p_session_id and visitor_id=p_visitor_id and test_mode=p_test_mode and last_seen>now()-interval '30 minutes') then return false; end if;
 insert into public.analytics_order_links(order_id,session_id,visitor_id,test_mode) values(p_order_id,p_session_id,p_visitor_id,p_test_mode) on conflict(order_id) do nothing;
 return true;
end $$;

create function private.recovery_lock(p_user uuid,p_test boolean) returns void language sql security definer set search_path='' as $$
 select pg_advisory_xact_lock(hashtextextended('zxxr-recovery:'||p_user::text||':'||p_test::text,0))
$$;
create function private.recovery_ensure_account(p_user uuid,p_test boolean) returns void language plpgsql security definer set search_path='' as $$
declare last_order timestamptz;
begin
 select max(created_at) into last_order from public.orders where customer_id=p_user and test_mode=p_test;
 insert into public.recovery_accounts(user_id,test_mode,last_order_at,blocked_restore) values(p_user,p_test,last_order,last_order is not null) on conflict do nothing;
end $$;
create function private.recovery_json(a public.recovery_accounts) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',a.version,'cartId',c.cart_id,'status',coalesce(c.status,'empty'),'stage',coalesce(c.stage,'cart'),
 'items',case when c.status='active' then c.items else '[]'::jsonb end,'lastActivityAt',c.last_activity_at,'lastOrderAt',a.last_order_at)
 from (select 1) singleton left join public.recovery_carts c on c.id=a.current_id
$$;
create function public.recovery_preferences() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid; p public.recovery_preferences; contact boolean;
begin
 u=private.actor(); select * into p from public.recovery_preferences where user_id=u;
 select coalesce(name<>' ' and length(trim(name))>=2 and phone ~ '^55[1-9][0-9]{9,10}$',false) into contact from public.profiles where user_id=u;
 return jsonb_build_object('enabled',coalesce(p.enabled,false),'version',p.consent_version,'updatedAt',p.updated_at,'contactAvailable',coalesce(contact,false));
end $$;
create function public.recovery_preferences_update(p_enabled boolean,p_version text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; mode boolean;
begin
 u=private.actor(); if p_version<>'2026-10-29-v1' or p_enabled is null then raise exception 'invalid_data'; end if;
 select test_mode into mode from public.store_settings where id; perform private.recovery_lock(u,mode);
 insert into public.recovery_preferences(user_id,enabled,consent_version,granted_at) values(u,p_enabled,p_version,case when p_enabled then now() else null end)
 on conflict(user_id) do update set enabled=p_enabled,consent_version=p_version,granted_at=case when p_enabled then now() else recovery_preferences.granted_at end,updated_at=now();
 if not p_enabled then
  update public.recovery_carts set status='revoked',closed_at=now() where user_id=u and status='active';
  update public.recovery_accounts set blocked_restore=true,version=version+1 where user_id=u;
 end if;
 return public.recovery_preferences();
end $$;
create function public.recovery_cart() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; mode boolean; a public.recovery_accounts;
begin
 u=private.actor(); select test_mode into mode from public.store_settings where id;
 perform private.recovery_lock(u,mode); perform private.recovery_ensure_account(u,mode);
 select * into a from public.recovery_accounts where user_id=u and test_mode=mode;
 return private.recovery_json(a);
end $$;
create function public.recovery_cart_update(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; mode boolean; a public.recovery_accounts; c public.recovery_carts; item jsonb; snapshot_items jsonb='[]'; seen text[]='{}'; cid uuid; intent text;
begin
 u=private.actor(); select test_mode into mode from public.store_settings where id;
 perform private.recovery_lock(u,mode); perform private.recovery_ensure_account(u,mode);
 select * into a from public.recovery_accounts where user_id=u and test_mode=mode for update;
 if coalesce(p_data->>'expectedVersion','') !~ '^\d+$' or (p_data->>'expectedVersion')::integer<>a.version then raise exception 'version_conflict'; end if;
 if not exists(select 1 from public.recovery_preferences where user_id=u and enabled and consent_version='2026-10-29-v1') then raise exception 'recovery_consent_required'; end if;
 cid=(p_data->>'cartId')::uuid; intent=p_data->>'intent';
 if cid is null or intent is null or intent not in ('restore','change','checkout','activity') or octet_length(p_data::text)>32768 or jsonb_typeof(p_data->'items') is distinct from 'array' or jsonb_array_length(p_data->'items')>20 then raise exception 'invalid_data'; end if;
 for item in select value from jsonb_array_elements(p_data->'items') loop
  if coalesce(item->>'quantity','') !~ '^([1-9]|10)$' or (item->>'productId')||':'||(item->>'size')=any(seen) then raise exception 'invalid_data'; end if;
  if not exists(select 1 from public.store_variants where product_id=item->>'productId' and size=item->>'size' and active) then raise exception 'unavailable'; end if;
  seen=array_append(seen,(item->>'productId')||':'||(item->>'size'));
  snapshot_items=snapshot_items||jsonb_build_array(jsonb_build_object('productId',item->>'productId','size',item->>'size','quantity',(item->>'quantity')::integer));
 end loop;
 select * into c from public.recovery_carts where id=a.current_id for update;
 if c.id is not null and c.status='active' then
  if c.cart_id<>cid then raise exception 'version_conflict'; end if;
  update public.recovery_carts set items=snapshot_items,stage=case when intent='checkout' then 'checkout' else stage end,last_activity_at=now(),
    status=case when jsonb_array_length(snapshot_items)=0 then 'empty' else 'active' end,closed_at=case when jsonb_array_length(snapshot_items)=0 then now() else null end where id=c.id;
  update public.recovery_accounts set version=version+1,blocked_restore=jsonb_array_length(snapshot_items)=0 where user_id=u and test_mode=mode returning * into a;
 elsif jsonb_array_length(snapshot_items)>0 and ((intent='restore' and not a.blocked_restore) or intent='change') then
  -- A closed cycle id cannot be replayed into a new cycle, including across devices.
  if exists(select 1 from public.recovery_carts where user_id=u and test_mode=mode and cart_id=cid) then raise exception 'version_conflict'; end if;
  insert into public.recovery_carts(user_id,test_mode,cart_id,items,stage) values(u,mode,cid,snapshot_items,'cart') returning * into c;
  update public.recovery_accounts set current_id=c.id,version=version+1,blocked_restore=false where user_id=u and test_mode=mode returning * into a;
 end if;
 return private.recovery_json(a);
end $$;

-- Both hooks execute inside create_order's transaction without altering its signature.
create function private.recovery_order_before() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.recovery_lock(new.customer_id,new.test_mode); return new; end $$;
create function private.recovery_order_after() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- No optional recovery record is created for a shopper who never enabled it.
 update public.recovery_accounts set version=version+1,blocked_restore=true,last_order_at=new.created_at
 where user_id=new.customer_id and test_mode=new.test_mode;
 update public.recovery_carts set status='converted',closed_at=now(),converted_order_id=new.id,
 recovered_at=case when last_activity_at<=now()-interval '24 hours' then now() else null end
 where user_id=new.customer_id and test_mode=new.test_mode and status='active';
 return new;
end $$;
create trigger recovery_order_before before insert on public.orders for each row execute function private.recovery_order_before();
create trigger recovery_order_after after insert on public.orders for each row execute function private.recovery_order_after();

create function private.recovery_eligible(c public.recovery_carts) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(c.status='active' and jsonb_array_length(c.items)>0 and c.last_activity_at<=now()-interval '24 hours' and c.last_activity_at>=now()-interval '30 days'
 and exists(select 1 from public.recovery_preferences p where p.user_id=c.user_id and p.enabled and p.consent_version='2026-10-29-v1')
 and exists(select 1 from public.profiles p where p.user_id=c.user_id and length(trim(p.name))>=2 and p.phone ~ '^55[1-9][0-9]{9,10}$')
 and not exists(select 1 from public.staff_access staff where staff.user_id=c.user_id and staff.active)
 and exists(select 1 from public.recovery_accounts a where a.user_id=c.user_id and a.test_mode=c.test_mode and a.current_id=c.id)
 and not exists(select 1 from public.orders o where o.customer_id=c.user_id and o.test_mode=c.test_mode and o.created_at>=c.started_at),false)
$$;
create function private.recovery_lead(c public.recovery_carts) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'name',p.name,'phone',p.phone,'cartId',c.cart_id,'version',a.version,'stage',c.stage,'items',c.items,
 'lastActivityAt',c.last_activity_at,'abandonedSince',c.last_activity_at+interval '24 hours',
 'preparedAt',(select created_at from public.recovery_contacts where cart_id=c.id and action='prepared'),
 'contactedAt',(select created_at from public.recovery_contacts where cart_id=c.id and action='declared'))
 from public.profiles p join public.recovery_accounts a on a.user_id=p.user_id and a.test_mode=c.test_mode where p.user_id=c.user_id
$$;
create function public.recovery_overview() returns jsonb language plpgsql security definer set search_path='' as $$
declare mode boolean; result jsonb;
begin
 perform private.require_owner(); perform private.analytics_cleanup(); select test_mode into mode from public.store_settings where id;
 select jsonb_build_object('items',coalesce(jsonb_agg(private.recovery_lead(c) order by c.last_activity_at),'[]'),
 'totals',jsonb_build_object('eligible',count(*),'contacted',count(*) filter(where exists(select 1 from public.recovery_contacts x where x.cart_id=c.id and x.action='declared'))),'generatedAt',now())
 into result from public.recovery_carts c where c.test_mode=mode and private.recovery_eligible(c);
 return result;
end $$;
create function public.recovery_contact(p_id uuid,p_version integer,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.recovery_carts; a public.recovery_accounts; mode boolean; actor uuid;
begin
 perform private.require_owner(); actor=auth.uid(); select test_mode into mode from public.store_settings where id;
 select * into c from public.recovery_carts where id=p_id and test_mode=mode;
 if not found then raise exception 'not_found'; end if;
 perform private.recovery_lock(c.user_id,mode);
 select * into c from public.recovery_carts where id=p_id and test_mode=mode for update;
 select * into a from public.recovery_accounts where user_id=c.user_id and test_mode=mode for update;
 if p_version is null or a.version<>p_version then raise exception 'version_conflict'; end if;
 if not private.recovery_eligible(c) then raise exception 'recovery_not_eligible'; end if;
 if p_action not in ('prepare-contact','contacted') or p_action is null then raise exception 'invalid_data'; end if;
 if p_action='contacted' and not exists(select 1 from public.recovery_contacts where cart_id=c.id and action='prepared') then raise exception 'invalid_data'; end if;
 insert into public.recovery_contacts(cart_id,actor_id,action) values(c.id,actor,case when p_action='contacted' then 'declared' else 'prepared' end) on conflict(cart_id,action) do nothing;
 return private.recovery_lead(c);
end $$;

create function public.analytics_overview(p_from date default null,p_to date default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare mode boolean; date_from date=coalesce(p_from,(now() at time zone 'America/Sao_Paulo')::date-6); date_to date=coalesce(p_to,(now() at time zone 'America/Sao_Paulo')::date);
 start_time timestamptz; end_time timestamptz; result jsonb;
begin
 perform private.require_owner(); perform private.analytics_cleanup();
 if date_to<date_from or date_to-date_from>89 or date_to>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'invalid_data'; end if;
 start_time=date_from::timestamp at time zone 'America/Sao_Paulo'; end_time=(date_to+1)::timestamp at time zone 'America/Sao_Paulo';
 select test_mode into mode from public.store_settings where id;
 with e as (select * from public.analytics_events where test_mode=mode and occurred_at>=start_time and occurred_at<end_time),
 s as (select * from public.analytics_sessions where test_mode=mode and session_id in(select session_id from e)),
 o as (select * from public.orders where test_mode=mode and created_at>=start_time and created_at<end_time),
 paid as (select * from public.orders x where x.test_mode=mode and x.payment_state='paid' and exists(select 1 from public.order_events y where y.order_id=x.id and y.kind='pay' and y.created_at>=start_time and y.created_at<end_time)),
 last_cart as (select distinct on(visitor_id) visitor_id,cart_items,received_at from public.analytics_events where test_mode=mode and kind='cart_update' and received_at>=now()-interval '30 days' order by visitor_id,received_at desc,id desc)
 select jsonb_build_object('period',jsonb_build_object('from',date_from,'to',date_to,'timeZone','America/Sao_Paulo'),'generatedAt',now(),
 'coverage','Acessos e abandono estimados apenas de quem autorizou; troca de dispositivo e bloqueadores reduzem a cobertura. Sacolas de recuperação exigem autorização separada. Pedidos e pagamentos vêm do sistema da loja.',
 'totals',jsonb_build_object('visitors',(select count(distinct visitor_id) from e),'sessions',(select count(distinct session_id) from e),'pageViews',(select count(*) from e where kind='page_view'),
 'activeNow',(select count(*) from public.analytics_sessions where test_mode=mode and last_seen>now()-interval '5 minutes'),
 'productClicks',(select count(*) from e where kind='product_click'),'addToCart',(select count(*) from e where kind='add_to_cart'),'checkoutStarts',(select count(distinct session_id) from e where kind='begin_checkout'),
 'registeredOrders',(select count(*) from o),'paidOrders',(select count(*) from paid),'paidRevenueCents',coalesce((select sum(total_cents) from paid),0),
 'abandonedCarts',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.last_activity_at>=start_time and c.last_activity_at<end_time and private.recovery_eligible(c)),
 'recoveryEligibleCount',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.last_activity_at>=start_time and c.last_activity_at<end_time and private.recovery_eligible(c)),
 'abandonedCartsEstimated',(select count(*) from last_cart c where jsonb_array_length(c.cart_items)>0 and c.received_at<=now()-interval '24 hours' and c.received_at>=start_time and c.received_at<end_time and not exists(select 1 from public.analytics_order_links l where l.test_mode=mode and l.visitor_id=c.visitor_id and l.created_at>=c.received_at)),
 'recoveredCarts',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.recovered_at>=start_time and c.recovered_at<end_time)),
 'pages',coalesce((select jsonb_agg(to_jsonb(x)) from(select page,count(*) as views,count(distinct session_id) as sessions from e where kind='page_view' and page is not null group by page order by views desc)x),'[]'),
 'sections',coalesce((select jsonb_agg(to_jsonb(x)) from(select section,count(*) filter(where kind='section_view') as views,count(*) filter(where kind='section_click') as clicks,count(distinct session_id) as sessions from e where section is not null and kind in ('section_view','section_click') group by section order by views desc)x),'[]'),
 'products',coalesce((select jsonb_agg(to_jsonb(x)) from(select product_id as "productId",count(*) filter(where kind='product_view') as views,count(*) filter(where kind='product_click') as clicks,count(*) filter(where kind='add_to_cart') as adds from e where product_id is not null group by product_id order by views desc)x),'[]'),
 'sources',coalesce((select jsonb_agg(to_jsonb(x)) from(select coalesce(campaign->>'source',referrer_host,'direto') as source,coalesce(campaign->>'medium','') as medium,coalesce(campaign->>'name','') as campaign,count(*) as sessions from s group by 1,2,3 order by sessions desc)x),'[]'),
 'devices',coalesce((select jsonb_agg(to_jsonb(x)) from(select device,count(*) as sessions from s group by device order by sessions desc)x),'[]'),
 'daily',coalesce((select jsonb_agg(to_jsonb(x)) from(select (occurred_at at time zone 'America/Sao_Paulo')::date as date,count(distinct session_id) as sessions,count(*) filter(where kind='page_view') as "pageViews" from e group by 1 order by 1)x),'[]')) into result;
 return result;
end $$;

revoke all on function public.analytics_ingest(jsonb,boolean),public.analytics_link_order(uuid,uuid,uuid,uuid,boolean),public.recovery_preferences(),public.recovery_preferences_update(boolean,text),public.recovery_cart(),public.recovery_cart_update(jsonb),public.recovery_overview(),public.recovery_contact(uuid,integer,text),public.analytics_overview(date,date) from public,anon,authenticated;
grant execute on function public.analytics_ingest(jsonb,boolean),public.analytics_link_order(uuid,uuid,uuid,uuid,boolean) to service_role;
grant execute on function public.recovery_preferences(),public.recovery_preferences_update(boolean,text),public.recovery_cart(),public.recovery_cart_update(jsonb),public.recovery_overview(),public.recovery_contact(uuid,integer,text),public.analytics_overview(date,date) to authenticated;
revoke all on function private.analytics_cleanup(),private.recovery_lock(uuid,boolean),private.recovery_ensure_account(uuid,boolean),private.recovery_json(public.recovery_accounts),private.recovery_eligible(public.recovery_carts),private.recovery_lead(public.recovery_carts),private.recovery_order_before(),private.recovery_order_after() from public,anon,authenticated;
commit;
