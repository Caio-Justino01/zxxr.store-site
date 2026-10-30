# Validação — ZXXR Store v5

Verificação local em 19/10/2026 no Chromium embutido do Codex, Windows. Prévia http://127.0.0.1:5274/. Não houve publicação. A apresentação ativa usa HTML/CSS, GSAP e os recortes completos das cinco camisetas fornecidas.

## Código, fontes e preservação

TypeScript e build Vite aprovados. A suíte contém 13 testes: grafo ativo sem Three/Studio/GLB; equivalência dos PNGs cadastrados; presença dos ativos; preservação RGB/posição/dimensões nativas da arte e galeria; contorno branco da Rosa; três regras da sacola; três casos matemáticos de limites de zoom/pan. Os testes de geometria GLB referem-se ao histórico preservado.

O build ativo gera somente os chunks da aplicação e de animação, sem chunk Three.js ou Studio. O navegador apresentou zero canvases. Os GLBs permanecem no projeto como arquivos históricos e não são requisitados pela apresentação ativa. As fontes PNG originais não foram regravadas. A fotografia do céu tem licença CC0, procedência e receita em CLOUDS-v5.md e manifesto associado.

A v4 está preservada no ZIP de entrega anterior e em work/hero-v4-preservada/. O kit de identidade e os modelos/fontes anteriores não foram alterados. O novo pacote é versionado v5.

## Conferência visual e navegação

- Computador CSS 1440×1120: cinco peças inteiras, estampas corretas e proporção natural, sem rolagem horizontal; conteúdo com 1419 px de largura. Carregamento nativo confirmado nas cinco imagens. Boca foi inspecionada primeiro no produto, frente/costas, sem espelhamento.
- Produto Boca: Detalhes mostrou 170%; zoom atingiu 200% e desabilitou aumento adicional. Arraste alterou deslocamento em 140×80 px; trocar de vista restaurou 100% e deslocamento zero. Teclas e fórmulas de limites são cobertas pelos testes; controles foram conferidos no navegador.
- Seleção da Boca registrou departing antes da rota; histórico retornou à coleção. Seleção de tamanho ausente exibiu o aviso e focou P, sem adicionar item.
- Tablet CSS 768×1024: duas peças inteiras, conteúdo de 747 px, sem rolagem horizontal da página. Seletor 05 manteve Rosa ativa mesmo dividindo a tela com Spiritual Gangsta.
- Celular CSS 426×844: uma peça inteira, cinco seletores e conteúdo de 406 px, sem rolagem horizontal da página. Arraste horizontal mudou Boca para Flores e conservou a rota da coleção, sem disparar abertura. A rolagem do carrossel não remove a rolagem vertical nativa por toque.
- Acesso direto e recarga em /produto/zxxr-rosa funcionaram. ArrowRight na imagem normal trocou frente por costas; a diagonal rosa e o contorno branco permanecem nas posições da referência.
- Enter no link da Rosa abriu o produto após a transição. `=` aumentou o zoom para 120%; Home restaurou frente e 100%. Console da aplicação sem avisos ou erros na inspeção final.
- Sacola preservou Boca G e Spiritual Gangsta G, uma unidade de cada, inclusive após recarregar. Chave e formato de persistência continuam iguais.
- Link Som alcançou a seção musical e manteve o Spotify correto. Ao sair da hero, data-sky-state mudou para paused. Player externo permanece sob demanda.

## Falhas, acessibilidade e limites

Um harness local em work/viewer-failure-v5.html solicitou intencionalmente uma frente inexistente: apareceu mensagem legível, acesso ao arquivo original e retorno à coleção; zoom ficou desabilitado. Costas continuou disponível e recuperou a imagem normal. A aba auxiliar foi encerrada. O 404 esperado desse harness não pertence ao aplicativo principal.

Foco, links, frente/costas, zoom, setas e controles de tamanho foram conferidos. Movimento reduzido e pausa em aba oculta foram revisados no código/CSS; não houve emulação dessa preferência, auditoria completa com leitor de tela, medição de fps ou teste em telefone físico. Perfis móveis são dimensões de viewport no computador.

A v5 preserva mockups originais, não produz novas fotos físicas, dobras animadas, ângulos laterais ou informação 4K ausente. Ampliação pode revelar a resolução das fontes. Pagamento, estoque, frete e pedidos reais continuam fora do protótipo.

Capturas finais em `previews/final-v5/`: `hero-desktop.png` (1440×1120), `hero-mobile.png` (426×844) e `produto-rosa-costas.png` (1440×1120). O céu final foi conferido após a correção das bordas alpha, sem o corte horizontal observado no celular.

O build final contém CSS de 44,27 kB, aplicação de 292,30 kB e animação de 69,58 kB antes de gzip. As quatro imagens de céu somam aproximadamente 479 kB em desktop e 120 kB no perfil móvel. TypeScript, formatação dos arquivos ativos e os 13 testes passaram.

A validação v4 anterior continua no backup preservado; suas métricas WebGL não descrevem esta versão.
