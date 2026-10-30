-- Freeze future releases without rewriting prices, identifiers or order history.
update public.store_variants
set active = product_id in ('boca', 'spiritual-gangsta')
where product_id in ('boca', 'flores', 'me-preservando', 'spiritual-gangsta', 'zxxr-rosa');
