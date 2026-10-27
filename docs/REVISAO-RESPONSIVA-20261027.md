# Revisão responsiva — 27/10/2026

## Entrega

- Cabeçalho compacto abaixo de 1200 px, com Menu, marca, Conta e Sacola; navegação ampla com Camisetas, Como comprar, Razz e Ajuda.
- Menu lateral nativo com grupos de compra, conta, ajuda e redes. Foco contido, Escape, retorno ao acionador e rolagem própria; abrir suporte fecha o menu. Ações de suporte são omitidas nas telas onde o widget não existe.
- Altura efetiva do cabeçalho compartilhada com âncoras e seções fixas. Mudanças de largura e orientação respeitam o espaço disponível.
- Rodapé em quatro grupos no desktop, duas colunas no tablet e grupos expansíveis no celular. Faixa inferior reserva espaço para a ajuda flutuante.
- Colagem recomposta com as fotografias originais completas no celular e tablet. Produtos em uma coluna abaixo de 1024 px, com margens e texto maiores.
- Galeria com “Ampliar foto”, instruções móveis, alvos de toque e restauração apenas quando necessária. Restaurar conserva a vista selecionada.
- Tipografia, espaçamento e controles revistos também em ajuda, privacidade, música, sacola e áreas do cliente. Nenhuma regra de pedido, preço, pagamento, banco ou permissão foi alterada.

## Movimento e compatibilidade

O modo de layout (`sticky` ou `flow`) foi separado da leitura animada. Se a seção exceder a tela, seu título continua acompanhando a rolagem no fluxo normal, com controles de compra sempre visíveis. Movimento reduzido apresenta todo o conteúdo imediatamente.

O gradiente mantém seu tratamento de perda/restauração de WebGL e sua alternativa em CSS. Observadores opcionais possuem proteção e atualização por resize. A abertura só solicita nova medição quando seu tamanho realmente muda; não captura a rolagem nem exige configuração especial do navegador.

## Verificação executada

- 82 testes aprovados, TypeScript e build. Novos testes cobrem leitura no fluxo em alturas curtas e navegação completa, incluindo retorno após login e ausência de contato.
- Chromium pela ferramenta de navegador: 320, 390, 430, 768, 820, 1024, 1199, 1440 e 1920 px. Sem rolagem horizontal no catálogo; menu correto em cada faixa.
- Menu, foco circular, Escape, toque fora, troca para suporte, devolução do foco, mudança para desktop com menu aberto e orientação 844 × 390 conferidos.
- Rolagem real nos dois sentidos em 390 px: a leitura da introdução voltou de 1 para 0 ao subir e de 0 para 1 ao descer, mantendo o layout em fluxo.
- Produto Spiritual Gangsta em 320 px; alternância frente/ensaio, ampliação e restauração; a vista escolhida foi preservada.
- Ajuda, privacidade e sacola em 390 px: títulos carregados sem transbordamento. A tela de login também foi conferida sem envio de formulário.
- Seção musical em 390 px; troca ESCOLHAS/ROCKSTAR mantendo um iframe. Nenhuma reprodução automática foi adicionada.
- Expansão do rodapé e destino Privacidade conferidos. A prévia mantém o isolamento dos pedidos reais; não foram criados pedidos nem enviados atendimentos.
- Capturas anteriores e posteriores em `docs/previews/responsivo-20261027/`.

## Limites da conferência

Somente Chromium está disponível nesta sessão. Firefox, WebKit, Safari em iPhone/iPad, Chrome em aparelho Android e navegador interno do Instagram não foram testados fisicamente. Emulação de viewport não é apresentada como validação nesses aparelhos. Não houve emulação de rede lenta ou alteração de preferências do sistema para redução de movimento/transparência; esses caminhos foram revisados no código e nas regras existentes.

Prévia final: https://5f129a90.zxxr-store.pages.dev.

## Publicação conferida

- Código `9a52a67` enviado ao GitHub (`main` e `codex/contas-pedidos`).
- Cloudflare de produção: https://a38bd879.zxxr-store.pages.dev.
- Conferidos no domínio www.zxxr.store o menu completo, a colagem em 390/820 px e o rodapé expansível em 390 px, sem rolagem horizontal.
- Catálogo comercial carregado: Pix e cartão de crédito, contato configurado, inclusão na sacola habilitada e ausência de aviso de teste. Nenhum pedido ou mensagem foi enviado durante a revisão.
- Capturas públicas finais: `publicado-colagem-390.png`, `publicado-colagem-820.png` e `publicado-rodape-390.png`.
