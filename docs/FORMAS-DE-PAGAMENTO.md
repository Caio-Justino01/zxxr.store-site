# Formas de pagamento

- Os selos do rodapé e da Central de ajuda usam a mesma lista de meios habilitados retornada pelo catálogo. Não são exibidos meios indisponíveis nem valores de emergência.
- Pix: arquivo original do Banco Central, sem redesenho, em `public/brand/payments/pix-oficial.png`, distribuído também em `public-store/brand/payments/pix-oficial.png`. Fonte: https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png. Manual: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/I_manual_uso_marca_pix.pdf.
- Cartão: as bandeiras Visa e Mastercard substituem a ilustração genérica, conforme solicitação do dono. São arquivos SVG locais do projeto [SVG Credit Card & Payment Icons](https://github.com/aaronfagan/svg-credit-card-payment-icons/tree/main/logo), com a licença Apache-2.0 preservada em `brand/payments/LICENSE-payment-icons.txt`. Cores e proporções dos arquivos foram mantidas. São exibidas somente quando o catálogo habilita cartão de crédito.
- Boleto: ilustração SVG local de documento com código de barras. Os quatro selos mantêm nomes legíveis fora das imagens, com distribuição responsiva.
- O dono habilita boleto em **Painel → Loja e catálogo → Disponibilizar preferência por boleto**, com o segundo fator normal do painel. A opção persiste no banco e aparece na revisão do pedido, na ajuda, no suporte e no rodapé. A mudança não emite boleto nem confirma pagamento: a cobrança continua combinada no atendimento pelo WhatsApp.
- O painel é a fonte dessa configuração; não há migração ou relaxamento de permissões nesta alteração.
- Validação do código: 84 testes, TypeScript e build aprovados; prévia conferida no computador e em 320 px, sem rolagem horizontal.

## Ativação do boleto

- Boleto habilitado pelo painel do dono em produção, após confirmação de segundo fator. A vitrine pública passa a informar Pix, cartão de crédito e boleto.
- A tentativa inicial revelou `UPDATE requires a WHERE clause` nos logs do PostgreSQL: a proteção `safeupdate` bloqueava a função original de configurações. A migration `202610270003_settings_scope.sql` delimita a atualização ao registro `id = true`, mantendo os controles de dono/MFA, a proteção do banco e os registros de auditoria. Aplicada pelo SQL Editor e validada novamente pelo painel público, sem alteração de preços ou pedidos existentes.
- O teste de regressão cobre os acessos permitidos, preservação do catálogo e pedidos anteriores, criação com preferência por boleto quando habilitado e recusa quando desabilitado. Nenhum pedido real foi criado para validar esta mudança.
- Após a correção: 85 testes e TypeScript aprovados. O domínio público foi recarregado e conferido com os três meios, sem aviso de teste. Captura local: `work/payment-badges/rodape-com-boleto-publicado.png`.
