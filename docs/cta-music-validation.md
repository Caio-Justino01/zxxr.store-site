# CTA e seção musical — validação local

Data: 25/10/2026.
Escopo: DropGuide e MusicSection. O encaixe em App.tsx altera somente o import do novo guia e substitui a antiga faixa. As animações dos produtos não foram editadas nesta implementação.

## Comportamento conferido no navegador

- Guia com wrapper de 180svh, título antes das etapas e trecho final totalmente visível.
- Rolagem reversível: a mesma posição de scroll restaurou exatamente as mesmas opacidades das etapas.
- Link Encontrar minha peça chegou a #o-drop; #como-funciona continua acessível diretamente.
- Desktop: título à esquerda, etapas à direita; ESCOLHAS e demais lançamentos lado a lado.
- Celular: título acima das etapas e catálogo empilhado. Conferidas larguras CSS de 320 e 391 px, sem overflow horizontal nas seções.
- Tela de 320 x 568 e paisagem de 844 x 391: guia no fluxo normal, três etapas opacas e sem posição fixa.
- Movimento reduzido: teste isolado em tests/guide-reading-browser.html usa o componente real e simula a media query. Ao ativar, modo flow, título e etapas com opacidade 1; ao desativar, a leitura retorna ao estado de scroll correspondente.
- Ouvir monta somente um iframe do álbum escolhido. As trocas ESCOLHAS -> emoção/controla -> ROCKSTAR substituíram a URL mantendo um player.
- O player oficial de ESCOLHAS carregou com o controle Play disponível e sem iniciar automaticamente. O acesso à música completa depende do Spotify.
- Enter abre o player e move o foco para seu título. Fechar desmonta o iframe e devolve o foco ao botão usado.
- Link externo do álbum sempre presente com o player aberto, inclusive como alternativa caso o embed não carregue. Não foi forçada uma indisponibilidade do serviço externo.
- Retrato original preservado; capas oficiais locais em 300 x 300. Créditos diaz, Razz preservados.

## Verificação de código

- TypeScript sem erros.
- 45 testes passaram, incluindo seis novos testes do guia e do catálogo.
- Build de produção concluído. O estado atual do projeto emite um aviso não impeditivo de chunk acima de 500 kB.
- Arquivos novos de teste e documentação não são entradas do build de produção.

## Registros visuais

- previews/drop-guide-desktop.png
- previews/razz-panel-desktop.png
- previews/drop-guide-mobile.png
- previews/razz-panel-mobile.png

As imagens são recortes de capturas reais do navegador. Os arquivos de captura completa foram preservados na mesma pasta.
