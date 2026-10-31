begin;

-- Additive read model: preserve the existing RPC, security and operational data.
create or replace function public.analytics_overview(p_from date default null,p_to date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  mode boolean;
  zone_name constant text = 'America/Sao_Paulo';
  as_of timestamptz = now();
  today date = (now() at time zone 'America/Sao_Paulo')::date;
  date_from date = coalesce(p_from,(now() at time zone 'America/Sao_Paulo')::date-6);
  date_to date = coalesce(p_to,(now() at time zone 'America/Sao_Paulo')::date);
  day_count integer;
  grain text;
  bucket_step interval;
  start_time timestamptz;
  end_time timestamptz;
  through_time timestamptz;
  previous_from date;
  previous_to date;
  previous_start timestamptz;
  previous_through timestamptz;
  comparison_available boolean;
  result jsonb;
begin
  perform private.require_owner();
  perform private.analytics_cleanup();
  if date_to<date_from or date_to-date_from>89 or date_to>today then
    raise exception 'invalid_data';
  end if;
  day_count = date_to-date_from+1;
  grain = case when day_count=1 then 'hour' else 'day' end;
  bucket_step = case when day_count=1 then interval '1 hour' else interval '1 day' end;
  start_time = date_from::timestamp at time zone zone_name;
  end_time = (date_to+1)::timestamp at time zone zone_name;
  through_time = least(as_of,end_time);
  previous_from = date_from-day_count;
  previous_to = date_to-day_count;
  previous_start = previous_from::timestamp at time zone zone_name;
  -- A report containing today compares against the same elapsed local time.
  previous_through = case when date_to=today
    then ((through_time at time zone zone_name)-make_interval(days=>day_count)) at time zone zone_name
    else (previous_to+1)::timestamp at time zone zone_name end;
  comparison_available = previous_start>=as_of-interval '90 days';
  select test_mode into mode from public.store_settings where id;

  with windows as (
    select 'current'::text as slot,start_time as starts,through_time as finishes,date_to=today as inclusive_finish
    union all
    select 'previous',previous_start,previous_through,date_to=today where comparison_available
  ),
  events as materialized (
    select w.slot,e.* from windows w join public.analytics_events e
      on e.test_mode=mode and e.occurred_at>=w.starts and e.occurred_at<=w.finishes
        and (e.occurred_at<w.finishes or w.inclusive_finish)
  ),
  operational_orders as materialized (
    select w.slot,o.id,o.created_at from windows w join public.orders o
      on o.test_mode=mode and o.created_at>=w.starts and o.created_at<=w.finishes
        and (o.created_at<w.finishes or w.inclusive_finish)
  ),
  payments as materialized (
    -- One matching payment per order/window, even if an event was duplicated.
    select w.slot,o.id,min(p.created_at) as paid_at,o.total_cents
    from windows w join public.order_events p
      on p.kind='pay' and p.created_at>=w.starts and p.created_at<=w.finishes
        and (p.created_at<w.finishes or w.inclusive_finish)
    join public.orders o on o.id=p.order_id and o.test_mode=mode and o.payment_state='paid'
    group by w.slot,o.id,o.total_cents
  ),
  event_totals as (
    select slot,count(distinct visitor_id) as visitors,count(distinct session_id) as sessions,
      count(*) filter(where kind='page_view') as "pageViews",
      count(*) filter(where kind='product_click') as "productClicks",
      count(*) filter(where kind='add_to_cart') as "addToCart",
      count(distinct session_id) filter(where kind='begin_checkout') as "checkoutStarts",
      count(*) filter(where kind='whatsapp_click') as "whatsappClicks"
    from events group by slot
  ),
  order_totals as (select slot,count(*) as total from operational_orders group by slot),
  payment_totals as (select slot,count(*) as total,coalesce(sum(total_cents),0) as cents from payments group by slot),
  totals as (
    select w.slot,coalesce(e.visitors,0) as visitors,coalesce(e.sessions,0) as sessions,
      coalesce(e."pageViews",0) as "pageViews",coalesce(e."productClicks",0) as "productClicks",
      coalesce(e."addToCart",0) as "addToCart",coalesce(e."checkoutStarts",0) as "checkoutStarts",
      coalesce(e."whatsappClicks",0) as "whatsappClicks",coalesce(o.total,0) as "registeredOrders",
      coalesce(p.total,0) as "paidOrders",coalesce(p.cents,0) as "paidRevenueCents"
    from windows w left join event_totals e using(slot) left join order_totals o using(slot)
      left join payment_totals p using(slot)
  ),
  buckets as (
    select w.slot,g.bucket from windows w
    cross join lateral generate_series(
      date_trunc(grain,w.starts at time zone zone_name),
      greatest(date_trunc(grain,w.starts at time zone zone_name),
        date_trunc(grain,(case when w.inclusive_finish then w.finishes else w.finishes-interval '1 microsecond' end) at time zone zone_name)),
      bucket_step
    ) as g(bucket)
  ),
  event_buckets as (
    select slot,date_trunc(grain,occurred_at at time zone zone_name) as bucket,
      count(distinct visitor_id) as visitors,count(distinct session_id) as sessions,
      count(*) filter(where kind='page_view') as "pageViews",
      count(*) filter(where kind='product_click') as "productClicks",
      count(*) filter(where kind='add_to_cart') as "addToCart",
      count(distinct session_id) filter(where kind='begin_checkout') as "checkoutStarts",
      count(*) filter(where kind='whatsapp_click') as "whatsappClicks"
    from events group by 1,2
  ),
  order_buckets as (
    select slot,date_trunc(grain,created_at at time zone zone_name) as bucket,count(*) as total
    from operational_orders group by 1,2
  ),
  payment_buckets as (
    select slot,date_trunc(grain,paid_at at time zone zone_name) as bucket,
      count(*) as total,coalesce(sum(total_cents),0) as cents
    from payments group by 1,2
  ),
  points as (
    select b.slot,b.bucket at time zone zone_name as at,
      coalesce(e.visitors,0) as visitors,coalesce(e.sessions,0) as sessions,
      coalesce(e."pageViews",0) as "pageViews",coalesce(e."productClicks",0) as "productClicks",
      coalesce(e."addToCart",0) as "addToCart",coalesce(e."checkoutStarts",0) as "checkoutStarts",
      coalesce(e."whatsappClicks",0) as "whatsappClicks",coalesce(o.total,0) as "registeredOrders",
      coalesce(p.total,0) as "paidOrders",coalesce(p.cents,0) as "paidRevenueCents"
    from buckets b left join event_buckets e using(slot,bucket)
      left join order_buckets o using(slot,bucket) left join payment_buckets p using(slot,bucket)
  ),
  timelines as (
    select w.slot,jsonb_build_object('granularity',grain,'through',w.finishes,
      'points',coalesce(jsonb_agg(to_jsonb(p)-'slot' order by p.at) filter(where p.slot is not null),'[]'::jsonb)) as value
    from windows w left join points p using(slot) group by w.slot,w.finishes
  ),
  e as (select * from events where slot='current'),
  s as (select * from public.analytics_sessions where test_mode=mode and session_id in(select session_id from e)),
  last_cart as (
    select distinct on(visitor_id) visitor_id,cart_items,received_at
    from public.analytics_events where test_mode=mode and kind='cart_update'
      and received_at>=as_of-interval '30 days' order by visitor_id,received_at desc,id desc
  )
  select jsonb_build_object(
    'period',jsonb_build_object('from',date_from,'to',date_to,'timeZone',zone_name),
    'generatedAt',as_of,
    'coverage','Acessos e abandono estimados apenas de quem autorizou; troca de dispositivo e bloqueadores reduzem a cobertura. Sacolas de recuperação exigem autorização separada. Pedidos e pagamentos vêm do sistema da loja.',
    'totals',(select to_jsonb(t)-'slot' from totals t where slot='current')||jsonb_build_object(
      'activeNow',(select count(*) from public.analytics_sessions where test_mode=mode and last_seen>as_of-interval '5 minutes'),
      'abandonedCarts',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.last_activity_at>=start_time and c.last_activity_at<end_time and private.recovery_eligible(c)),
      'recoveryEligibleCount',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.last_activity_at>=start_time and c.last_activity_at<end_time and private.recovery_eligible(c)),
      'abandonedCartsEstimated',(select count(*) from last_cart c where jsonb_array_length(c.cart_items)>0 and c.received_at<=as_of-interval '24 hours' and c.received_at>=start_time and c.received_at<end_time and not exists(select 1 from public.analytics_order_links l where l.test_mode=mode and l.visitor_id=c.visitor_id and l.created_at>=c.received_at)),
      'recoveredCarts',(select count(*) from public.recovery_carts c where c.test_mode=mode and c.recovered_at>=start_time and c.recovered_at<end_time)),
    'pages',coalesce((select jsonb_agg(to_jsonb(x)) from(select page,count(*) as views,count(distinct session_id) as sessions from e where kind='page_view' and page is not null group by page order by views desc)x),'[]'),
    'sections',coalesce((select jsonb_agg(to_jsonb(x)) from(select section,count(*) filter(where kind='section_view') as views,count(*) filter(where kind='section_click') as clicks,count(distinct session_id) as sessions from e where section is not null and kind in ('section_view','section_click') group by section order by views desc)x),'[]'),
    'products',coalesce((select jsonb_agg(to_jsonb(x)) from(select product_id as "productId",count(*) filter(where kind='product_view') as views,count(*) filter(where kind='product_click') as clicks,count(*) filter(where kind='add_to_cart') as adds from e where product_id is not null group by product_id order by views desc)x),'[]'),
    'sources',coalesce((select jsonb_agg(to_jsonb(x)) from(select coalesce(campaign->>'source',referrer_host,'direto') as source,coalesce(campaign->>'medium','') as medium,coalesce(campaign->>'name','') as campaign,count(*) as sessions from s group by 1,2,3 order by sessions desc)x),'[]'),
    'devices',coalesce((select jsonb_agg(to_jsonb(x)) from(select device,count(*) as sessions from s group by device order by sessions desc)x),'[]'),
    'daily',coalesce((select jsonb_agg(to_jsonb(x)) from(select (occurred_at at time zone zone_name)::date as date,count(distinct session_id) as sessions,count(*) filter(where kind='page_view') as "pageViews" from e group by 1 order by 1)x),'[]'),
    'timeline',(select value from timelines where slot='current'),
    'comparison',jsonb_build_object('available',comparison_available,
      'reason',case when comparison_available then null else 'outside_retention' end,
      'period',jsonb_build_object('from',previous_from,'to',previous_to,'timeZone',zone_name),
      'totals',(select to_jsonb(t)-'slot' from totals t where slot='previous'),
      'timeline',(select value from timelines where slot='previous'))
  ) into result;
  return result;
end $$;

revoke all on function public.analytics_overview(date,date) from public,anon,authenticated;
grant execute on function public.analytics_overview(date,date) to authenticated;

commit;
