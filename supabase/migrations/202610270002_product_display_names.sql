-- Rename current catalog labels only. Existing order snapshots, identifiers,
-- sizes, prices, availability and SKUs remain unchanged.
update public.store_variants
set name = case product_id
  when 'boca' then 'Emoção'
  when 'me-preservando' then 'Yaji'
  when 'zxxr-rosa' then 'ZXXR'
end
where product_id in ('boca', 'me-preservando', 'zxxr-rosa');
