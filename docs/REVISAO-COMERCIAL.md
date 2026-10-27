# ZXXR — revisão comercial de navegação e atendimento

27/10/2026. Revisão restrita à apresentação e aos acessos da loja completa em modo de teste. Fotos, produtos, galerias, animações, API, banco e permissões foram preservados.

## Comportamento

- Cabeçalho próprio, com Camisetas, Como comprar e Conheça o Razz; Menu em telas menores. Conta e Sacola (quantidade) continuam identificáveis no celular. Escape, seleção e toque fora fecham o menu; Escape e toque fora devolvem o foco ao botão.
- Visitantes veem Entrar. Os atalhos de conta preservam o destino permitido no login; clientes autenticados veem Minha conta. Meus pedidos e Meus dados indicam a página atual; saída identificada como Sair da conta.
- Rodapé comercial em quatro grupos, Instagram oficial @zxxr.store, condições de compra e acesso ao WhatsApp configurado. As formas de pagamento aparecem somente quando habilitadas no catálogo. Carregamento e indisponibilidade não viram contatos ou formas de pagamento inventados.
- Central pública /ajuda, com âncoras para compra, pagamento, entrega, tamanhos, trocas e atendimento. O conteúdo explica como registrar e acompanhar um pedido e concluir o atendimento no WhatsApp. Não acrescenta prazos, medidas, frete gratuito ou condições financeiras não confirmadas.
- Sacola com estado vazio explícito, subtotal das camisetas, frete a confirmar e total após atendimento. O registro do pedido continua anterior à abertura da conversa; não há cobrança automática.
- As âncoras aguardam o carregamento de páginas lazy antes de posicionar o conteúdo. O observador é encerrado quando encontra o destino ou ao sair da rota.

## Evidências

- Suíte completa: **74 testes aprovados**, incluindo isolamento de pedidos, permissões, transições, preservação de imagens e três novos testes de atalhos autenticados, métodos de pagamento e contato válido.
- TypeScript e build aprovados. Depois dos ajustes finais de textos, carregamento e largura do menu, os seis testes pertinentes de configuração comercial e leitura guiada passaram novamente.
- Prévia Cloudflare: https://6d5f1b9a.zxxr-store.pages.dev, disponível também em https://contas-pedidos.zxxr-store.pages.dev.
- Navegador real: Central de ajuda conferida em **320, 390, 1440 e 1920 px**, sem rolagem horizontal; rodapé em quatro colunas no desktop e empilhado no celular. Alturas existentes do cabeçalho preservadas.
- Menu: Escape, toque fora e seleção de seção conferidos; foco devolvido ao botão e âncora Como comprar alcançada. Entrega foi acessada da sacola para a Central de ajuda com título fora da área coberta pelo cabeçalho.
- Sacola isolada de visitante: Boca M e G separadas, contagem 2, aumento para 3, remoções para 2 e 0, subtotal coerente e estado vazio. Nenhum pedido foi registrado, nenhum pagamento iniciado e nenhuma mensagem enviada nesses testes.
- Sessão autenticada existente: Minha conta e indicação Meus pedidos como página atual; Meus dados, Painel da equipe e Sair da conta presentes. A sessão do dono foi preservada.

Capturas da prévia: [rodapé desktop](previews/revisao-comercial/rodape-1440.png), [menu 320 px](previews/revisao-comercial/menu-320.png), [sacola desktop](previews/revisao-comercial/sacola-1440.png), [sacola vazia 320 px](previews/revisao-comercial/sacola-vazia-320.png) e [ajuda 390 px](previews/revisao-comercial/ajuda-390.png).

As larguras de celular foram verificadas em viewport de navegador; não substituem um teste físico em iPhone/Safari. O número de atendimento, o banco e os pedidos permanecem de teste, sem cobranças ou produção real.
