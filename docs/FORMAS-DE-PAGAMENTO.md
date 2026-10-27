# Formas de pagamento

- Os selos do rodapé e da Central de ajuda usam a mesma lista de meios habilitados retornada pelo catálogo. Não são exibidos meios indisponíveis nem valores de emergência.
- Pix: arquivo original do Banco Central, sem redesenho, em `public/brand/payments/pix-oficial.png`, distribuído também em `public-store/brand/payments/pix-oficial.png`. Fonte: https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png. Manual: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/I_manual_uso_marca_pix.pdf.
- Cartão e boleto: ilustrações SVG locais, sem bandeiras ou provedores não confirmados. Os nomes dos meios permanecem legíveis fora das imagens.
- O dono habilita boleto em **Painel → Loja e catálogo → Disponibilizar preferência por boleto**, com o segundo fator normal do painel. A opção persiste no banco e aparece na revisão do pedido, na ajuda, no suporte e no rodapé. A mudança não emite boleto nem confirma pagamento: a cobrança continua combinada no atendimento pelo WhatsApp.
- O painel é a fonte dessa configuração; não há migração ou relaxamento de permissões nesta alteração.
- Validação do código: 84 testes, TypeScript e build aprovados; prévia conferida no computador e em 320 px, sem rolagem horizontal.
