# Preços e ficha técnica — 27/10/2026

## Catálogo aprovado

| Peças | Preço unitário | Modelagem | Material | Cor / acabamento |
|---|---:|---|---|---|
| Emoção, Flores e Yaji | R$ 149,90 | Oversized boxy | Algodão Madri | Off-white |
| Spiritual Gangsta e ZXXR | R$ 169,90 | Oversized boxy | 100% algodão · fio 30.1 | Preto / marmorizado |

O acabamento correto é marmorizado, sem “10%”. Não foi atribuída composição percentual às off-white. Imagens, identificadores, tamanhos e animações foram preservados.

Modelagem, material e acabamento estão no cadastro Product e são usados pela ficha compartilhada. A ficha aparece nas apresentações, página individual e detalhes rápidos; a hero mantém o resumo. Ajuda, suporte, descrições e textos alternativos também foram corrigidos. O painel usa o preço do produto como fallback, sem o valor antigo fixo.

## Banco e publicação

A migration `202610270004_product_prices_materials.sql` foi aplicada ao projeto Supabase conectado da ZXXR. As vinte variantes foram conferidas no editor SQL: doze off-white a 14990 centavos e oito pretas a 16990 centavos, com identificação Preto marmorizado. A execução comparou, dentro do banco, uma impressão digital dos pedidos antes e depois; em caso de diferença, a transação seria cancelada. Nenhum pedido foi alterado.

A API pública `https://www.zxxr.store/api/catalog` confirmou os cinco grupos e seus quatro tamanhos nos novos preços. O banco mantém a autoridade comercial e a proteção contra preço desatualizado no registro de novos pedidos. Pedidos já registrados conservam seus valores e descrições originais.

Não houve commit, push ou novo deploy. O código com as fichas técnicas está atualizado no projeto de trabalho e no checkout local de publicação; a ficha nova depende da próxima publicação da aplicação. Os novos preços do catálogo remoto já estão ativos.

## Verificação

- Projeto de trabalho: 91 testes aprovados. Checkout de publicação: 87 testes aprovados. TypeScript, build e `git diff --check` aprovados.
- PostgreSQL/PGlite: todos os tamanhos, idempotência da migration, preservação de pedidos e campos não comerciais, rejeição de preços antigos e novo subtotal de 31980 centavos.
- Navegador: hero, cinco apresentações, fichas, recomendações e sacola persistente conferidos. A sacola existente, sem mudar seus itens, mostrou Emoção G a R$ 149,90 e Spiritual Gangsta G a R$ 169,90, subtotal R$ 319,80; os valores persistiram após recarregar.
- Larguras CSS 320, aproximadamente 390 (391 no arredondamento do navegador), 768, 1024 e 1440 px: sem rolagem horizontal ou texto cortado nas fichas.
- Capturas reais em `previews/precos-ficha-20261027/`: catálogo remoto, preta desktop, preta celular, off-white tablet e sacola desktop. Sem teste físico em aparelho ou Safari.

O Vite local não serve a API de contas/pedidos; a inspeção local usa o catálogo inicial atualizado. A consulta remota foi verificada separadamente pela API pública e pelo banco. Nenhum pedido fictício, pagamento ou mensagem foi enviado à operação real.
