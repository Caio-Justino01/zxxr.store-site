# ZXXR Store — direção ativa v7

Edição Razz: cinco camisetas limitadas, sob encomenda, a R$ 100,00 cada. A hero conserva as cinco peças livres sobre um fundo animado azul e branco; os cards transparentes ficam somente na apresentação individual abaixo. As roupas usam os recortes originais em 2D, preservando silhueta, proporções, inscrições e estampas.

O fundo é compartilhado entre hero e apresentação das peças. `collection-world` contém uma camada `.collection-sky` absoluta com `inset: 0`; dentro dela, um único `GradientBackdrop` fica sticky com altura `100svh`. Assim a animação acompanha a rolagem sem multiplicar canvases ou dimensionar o buffer pela altura de todos os cards. O renderer usa fluxo suave, alternativa de ondas e fundo CSS claro caso WebGL falhe. DPR limitado, pausa fora de uso, movimento reduzido e recuperação de contexto permanecem.

O H1 New Drop ZXXR combina lettering em grafite novo, desenhado em SVG editável, e a logo oficial transparente correspondente à referência PNG do usuário. Os caminhos e a cor da logo oficial são preservados; o lettering não é apresentado como uma peça antiga do kit. O bonequinho encerra a página em 150 × 126 px no computador e 120 × 101 px no celular.

“Cada peça, uma ideia.” contém cinco cards editoriais de vidro claro: frente e costas originais, descrição breve, preço e botão “Encomendar”. As imagens abrem um painel sobre a coleção na vista selecionada. “Encomendar” abre esse painel com foco nos tamanhos P/M/G/GG. É obrigatório selecionar o tamanho para adicionar à sacola. Fechar o painel devolve a pessoa à coleção; a página individual também continua disponível.

A sacola local mantém produto, tamanho e quantidade, com preço unitário e subtotal calculado em centavos. O fluxo não envia encomendas por WhatsApp, não cobra e não confirma pedidos. Pagamento, contato de atendimento, entrega, estoque, medidas e prazo de produção serão definidos na próxima etapa.

A seção musical usa a foto nativa do perfil Spotify correto de Razz, com 271 × 320 px, e uma adaptação fiel da bio com link de origem. O player abre sob demanda. Não há estatísticas de ouvintes ou informações biográficas inventadas.

Fotos, zoom, rotas, histórico e guia compacto permanecem. O runtime das roupas não carrega Three.js, Studio ou GLBs; o WebGL é exclusivamente decorativo. As imagens não ganham novos detalhes ou resolução 4K, e os estudos 3D anteriores continuam preservados.

Ver [GLASS-v7.md](GLASS-v7.md), [HERO-v6.md](HERO-v6.md) e [VALIDACAO.md](VALIDACAO.md). Nesta rodada, 23 testes e TypeScript foram aprovados; build e inspeção visual têm registro próprio. Os arquivos e pacotes v4, v5 e v6 ficam preservados, e o pacote v7 será gerado separadamente.
