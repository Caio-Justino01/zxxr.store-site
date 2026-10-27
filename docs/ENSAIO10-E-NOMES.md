# Ensaio 10 e nomes do catálogo — 27/10/2026

## Alterações

- Nomes confirmados: Emoção (`boca`), Flores (`flores`), Yaji (`me-preservando`), Spiritual Gangsta (`spiritual-gangsta`) e ZXXR (`zxxr-rosa`). IDs, URLs anteriores, SKUs, tamanhos e preços preservados.
- Migração `202610270002_product_display_names.sql` aplicada somente aos nomes das variantes. Conferência no painel: quatro tamanhos para cada um dos três produtos renomeados. Nenhum pedido anterior foi regravado.
- A campanha do Porsche foi substituída pelo ensaio 10 na mesa de sinuca. A referência original e a camisa de catálogo foram preservadas no workspace; a versão antiga da campanha permanece no acervo `public`, fora da distribuição `public-store`.
- Mestre: `work/ensaio-drop-qc/foto-10-zxxr-sinuca/ensaiodrop1zxxrfoto10-com-estampa.png`, relativo ao workspace pai do repositório. 1086 × 1448 px, gerado com a ferramenta integrada imagegen, sem usar a CLI.
- Exportação: `node scripts/prepare-campaign10.mjs <master.png>`. WebP em 640/1086 px, com qualidade 92, incluídos na lista de arquivos públicos.
- A galeria agora mantém a proporção vertical do primeiro ensaio ao selecionar frente/costas. Originais são contidos nessa moldura sem esticar ou recortar a peça. Miniaturas também possuem molduras verticais. Os arquivos originais da frente/costas não foram alterados.

## Validação

- 84 testes aprovados; TypeScript e build aprovados. Inclui fidelidade dos pixels dos originais, dimensões dos arquivos, nomes atuais, mensagem de sacola e migração idempotente que preserva preço, disponibilidade e histórico.
- Prévia: https://0533db92.zxxr-store.pages.dev.
- As quinze vistas foram conferidas em 1440 px. Cada produto manteve exatamente a mesma moldura ao alternar entre ensaio, frente e costas.
- ZXXR em 390 px: as três vistas mediram 343 × 457,33 px, sem rolagem horizontal. Fotos e arte do novo ensaio inspecionadas visualmente em relação às referências.
- Não foram criados pedidos, enviados atendimentos ou efetuadas cobranças na validação.

## Publicação conferida

- GitHub: código `dd99209`, nas branches `main` e `codex/contas-pedidos`.
- Cloudflare de produção: https://ea9f1d6e.zxxr-store.pages.dev.
- Em www.zxxr.store foram confirmados os cinco nomes, a foto 10 carregada na ZXXR e a moldura vertical das vistas originais. Inclusão na sacola habilitada e sem aviso de teste.
- Capturas públicas em `docs/previews/ensaio10/publicado-ensaio-1440.png` e `publicado-frente-1440.png`.

## Prompt final — ferramenta integrada imagegen

Use case: compositing / precise-object-edit. Create ONE photorealistic streetwear campaign photograph for ZXXR's existing product. Portrait 3:4 composition, high detail. Image 1 is the photographic scene/composition reference: blue worn billiard-table felt, polished brown wood rail and metal fixtures, pocket near upper-right, dark warm room, overhead diagonal camera, natural on-camera flash, authentic fine analog grain. Replace ONLY the shirt and its graphic with the EXACT washed charcoal oversized cotton shirt shown in image 2, back facing up on the table. Image 3 is an immutable source decal for the original print, not a typography suggestion. Preserve all FOUR ornate hot-pink symbols and their white outline exactly: the bottom-left angular Z, then the two distinct crossed X-like glyphs, then the upper-right ornate R. They ascend diagonally across the back from lower-left near the hem to upper-right, with the SAME proportions, spacing, size relative to the torso and geometry as image 2. TRANSFER the provided original artwork, do not typeset, re-spell or redesign it. Preserve the charcoal mineral-washed cotton texture, visible knit, sewn hem, broad dropped shoulders, collar and natural irregular soft fabric folds. Match print to surface perspective and fabric folds; no rubbery material, no plastic sheen, no embroidered reinterpretation. No Japanese text, billiard balls illustration, white rectangles, Billiards Club text, extra lettering, watermarks, or logos from image 1 may remain. Keep the shirt the clear focus; show the whole shirt, both sleeves and bottom hem within the vertical frame with a small breathing margin, by framing slightly wider than image 1 if needed. Retain the blue felt, wood rail, pocket, realistic scale, photographic light and muted film colors of reference 1. The print must be the actual supplied pink-and-white original, with 4 glyphs only; do not invent new words.
