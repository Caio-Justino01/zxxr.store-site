# ZXXR — encomendas reais abertas

27/10/2026. O dono confirmou receber contatos e pedidos reais pelo número atual, sem rotulá-lo como temporário na interface. Também autorizou manter, nesta abertura, o suporte Google da conta proprietária e o remetente de acesso já verificado na Brevo. Não houve contratação ou cobrança automática.

## Estado da publicação

- Vitrine e área do cliente: **https://www.zxxr.store/**. Cloudflare Pages em produção, versão de aplicação `0c241bb`, implantação `9098055a.zxxr-store.pages.dev`.
- `STORE_MODE=live` somente no ambiente **production** da Cloudflare; `store_settings.test_mode=false` e encomendas abertas no Supabase. A alteração foi registrada em `store_audit` como `launch_live`, com origem administrativa a pedido do dono.
- Catálogo público respondeu HTTP 200 com `open=true`, `testMode=false`, vinte variantes e preço de 10000 centavos. Contato atual aprovado: `5531985579685`.
- Pix e cartão continuam como preferências para atendimento. O cliente registra e acompanha o pedido no site; entrega, total final e pagamento continuam sendo confirmados no WhatsApp.
- O login Google passou de Testando para **Em produção**. A identidade do aplicativo usa o site e a privacidade de www.zxxr.store e inclui o domínio zxxr.store. O suporte pessoal foi expressamente autorizado para esta abertura. Nenhum escopo adicional foi solicitado.
- Login por e-mail, Google e Turnstile permanecem habilitados. O remetente verificado existente da Brevo foi autorizado para o lançamento; o SMTP e suas credenciais não foram trocados nem publicados.

## Dados e ambiente de validação

O projeto Supabase existente tornou-se a base operacional. Os dois pedidos fictícios foram preservados com `test_mode=true`; nenhum foi convertido em venda. A migration `202610270001_operational_orders.sql` limita a lista autorizada de pedidos ao modo atual do banco. Assim, os testes ficam fora das listas, métricas financeiras e exportações de produção da operação real.

A prévia continua com `STORE_MODE=test`. Ela responde com `open=false` enquanto compartilha a base operacional e bloqueia consultas e alterações privadas com `store_mode_mismatch`; não deve ser usada para receber encomendas. Foi conferido no navegador que uma sessão já autenticada da prévia não consegue mais consultar `/api/admin/orders`.

Para futuros ensaios completos de pedidos, criar um projeto Supabase de validação separado ou usar o banco PGlite isolado dos testes. Nunca voltar a marcação da base operacional para teste nem executar scripts de fixtures nela: isso não é uma rotina de validação da loja aberta.

## Verificações

- **76 testes aprovados**, incluindo criação de pedidos reais no PostgreSQL isolado, preservação dos fictícios, isolamento por cliente, exclusão dos testes das operações pagas e compatibilidade dos modos do servidor/banco. TypeScript e build aprovados.
- Após reforçar o bloqueio também para leitura privada na prévia, os sete testes pertinentes de modo e contratos/API passaram novamente.
- API do domínio confirmou catálogo aberto, modo real, preço e contato corretos. API da prévia confirmou catálogo fechado e modo de teste; seu acesso privado foi bloqueado.
- Navegador no domínio: cinco botões de adicionar habilitados, nenhuma ocorrência do aviso de loja em teste e contato apontando ao número autorizado. A ajuda de pagamento foi conferida em 390 px sem rolagem horizontal ou aviso de teste.
- A conta autenticada carregou Meus pedidos no domínio real, sem erros, sem aviso de teste e sem os dois pedidos fictícios antigos na lista.
- Não foi criado pedido fictício na operação real nem enviado WhatsApp ou iniciado pagamento durante esta ativação. Os novos testes de criação foram executados no banco isolado.
- Capturas: [rodapé publicado](previews/loja-aberta/rodape-dominio.png) e [pagamento no celular](previews/loja-aberta/pagamento-390.png).

## Alterações futuras

Para trocar o contato, atualizar somente `STORE_CONTACT` do ambiente production e publicar nova implantação. Não inventar prazo ou frete: as condições são liberadas por pedido no painel do dono, antes de cobrar. O modo real não habilita pagamento automático nem autoriza a equipe a confirmar valores não recebidos.

Os procedimentos históricos de publicação de teste continuam nos documentos anteriores para auditoria; este documento registra o estado atual da loja.
