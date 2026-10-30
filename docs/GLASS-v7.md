# ZXXR Store v7 — coleção livre e apresentação em vidro claro

## Direção final

A hero mantém as cinco camisetas livres, sem contêineres de vidro ao redor das peças. O efeito de vidro claro e transparente aparece nos cinco cards editoriais da seção inferior “Cada peça, uma ideia.”. A coleção reúne Boca, Flores e Me preservando em off-white; Spiritual Gangsta e ZXXR Rosa em preto estonado. Todas custam R$ 100,00 e pertencem à edição limitada sob encomenda criada por Razz.

O título principal New Drop ZXXR combina dois arquivos em `public/brand/drop-title/`: lettering novo em caminhos SVG editáveis e a logo oficial transparente. A logo é a equivalente vetorial da referência PNG fornecida, sem redesenho ou remoção raster de fundo; caminhos e vermelho original foram preservados. O lettering foi desenhado para esta apresentação. A distinção e as fontes estão em `public/brand/drop-title/SOURCES.json`.

## Fundo único para hero e cards

`App.tsx` reúne `CloudCollection` e `ProductStories` dentro de `.collection-world`. Uma única `.collection-sky`, absoluta e com `inset: 0`, cobre esse conjunto; seu `GradientBackdrop` permanece sticky no topo com altura `100svh`. O buffer do canvas tem tamanho de uma tela, e não a altura acumulada das cinco apresentações.

`glass-store.css` define essa continuidade e o tamanho do bonequinho final. `hero-v6.css` continua definindo a hero livre; `product-stories.css` contém a composição dos cards. A seção musical e o restante da página conservam seus fundos próprios.

O shader azul e branco é decorativo: nenhuma foto de produto é lida ou redesenhada por ele. Fluxo em `highp`, alternativa de ondas, fallback CSS, limite de DPR, pausa fora da tela/aba oculta, movimento reduzido e recuperação de contexto seguem a implementação documentada em [HERO-v6.md](HERO-v6.md). A mudança da v7 é a área compartilhada e o enquadramento sticky. Não foi feita uma medição nova de FPS em aparelho físico para este documento.

## Fotos e apresentação individual

Cada card contém duas vistas nativas, breve explicação da estampa, preço e “Encomendar”. O vidro usa preenchimentos brancos translúcidos, borda clara, sombra discreta e `backdrop-filter`; as imagens mantêm `object-fit: contain`. As vistas continuam em HTML, independentes do canvas. Não há reconstrução do molde, alteração de estampas ou novo ângulo gerado.

Em telas largas, os cards alternam a posição do texto e das imagens. Até 900 px, passam a uma coluna; frente e costas permanecem lado a lado. O controle de encomenda ocupa toda a largura disponível no celular. Hover tem deslocamento leve; movimento reduzido remove essa transição. Imagem indisponível mantém um botão com acesso à exploração da peça.

As fotos vêm de `public/media/reference-v3/`, recortadas dos arquivos originais fornecidos, com procedência em `docs/REFERENCE-MANIFEST-v3.json`. O zoom de 100% a 200% amplia esses mesmos pixels. A versão não transforma os mockups em fotografias de peças fabricadas nem recupera detalhes 4K.

## Exploração e encomenda local

- Clicar em frente ou costas abre `ProductQuickView` na vista correspondente, sem navegar para fora da coleção.
- “Encomendar” abre o mesmo painel com foco na escolha de tamanho. A grade é P/M/G/GG; adicionar sem selecionar tamanho apresenta a orientação e leva o foco ao grupo.
- O painel oferece Frente/Costas, Detalhes, zoom e arraste limitado da imagem ampliada. Escape, fechar e clique iniciado fora do painel encerram a exploração; o foco retorna ao controle anterior.
- Depois de adicionar uma combinação de produto/tamanho, o painel informa a inclusão na sacola e evita repetir a mesma inclusão por cliques sucessivos naquele estado. A quantidade pode ser alterada na sacola.
- As páginas `/produto/:slug` e `/sacola` continuam disponíveis. A sacola agrupa produto/tamanho e calcula preço unitário e subtotal conforme a quantidade, com arredondamento em centavos.

O cadastro contém `price: 100` para as cinco peças. `formatPrice` formata BRL em pt-BR; `cartSubtotal` ignora produtos desconhecidos e entradas inválidas. A chave e o formato da sacola anterior são mantidos. Se o armazenamento do navegador falhar, as escolhas continuam utilizáveis apenas em memória naquela sessão.

“Encomendar” inicia a seleção local. Nenhuma informação é enviada a um vendedor; não há WhatsApp configurado, pagamento, frete, estoque remoto ou confirmação de pedido. Contato, medidas e prazo de produção ainda dependem da próxima etapa.

## Razz e identidade

A seção “O som por trás do drop.” usa o retrato do perfil Spotify de ID `3KuwSQKBjfgg0OnFi57bYN`. O arquivo nativo de 271 × 320 px foi copiado sem crop, filtro ou ampliação de resolução e é exibido com largura máxima de 271 px. A bio tem 62 palavras em adaptação própria, com origem linkada, preservando os fatos sobre Belo Horizonte, Nova Lima, repertório e relação entre música, desenho e moda. O player continua sob demanda, sem autoplay.

A procedência está em `public/media/artist/SOURCE.json`; nenhum nome de fotógrafo foi inferido. O bonequinho final mede 150 × 126 px no computador e 120 × 101 px no celular. O kit de identidade anterior permanece preservado.

## Verificação e preservação

Nesta rodada foram aprovados 23 testes e a verificação TypeScript. Build e inspeção visual da prévia são registrados separadamente em [VALIDACAO.md](VALIDACAO.md); este documento descreve a implementação e não acrescenta resultados de captura ou benchmark.

O grafo ativo mantém as roupas em 2D: não importa Three.js, R3F, Studio, GLB ou o céu fotográfico v5. Os estudos e fontes 3D continuam no projeto para consulta. Os pacotes v4, v5 e v6 em `../entrega/` não serão substituídos pelo novo pacote v7. Os arquivos históricos de documentação e as cópias de trabalho anteriores também permanecem preservados.
