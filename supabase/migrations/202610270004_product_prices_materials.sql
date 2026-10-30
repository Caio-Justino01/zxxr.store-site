-- Current catalog only. Historical order JSON and commercial terms stay intact.
update public.store_variants
set price_cents = case
  when product_id in ('boca', 'flores', 'me-preservando') then 14990
  else 16990
end,
color = case
  when product_id in ('boca', 'flores', 'me-preservando') then 'Off-white'
  else 'Preto marmorizado'
end
where product_id in ('boca', 'flores', 'me-preservando', 'spiritual-gangsta', 'zxxr-rosa');
