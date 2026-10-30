# Validação — ZXXR Store v7

Inspeção local em 19/10/2026, Chromium embutido no Windows, http://127.0.0.1:5274/. Sem publicação. O registro anterior foi preservado em VALIDACAO-v6.md.

## Resultado

Hero restaurada às cinco peças livres. A comparação com work/glass-before confirma que CloudCollection mudou somente a chamada para DropTitle e a localização do GradientBackdrop. Fotos, links, hover, seleção e transição para produto foram mantidos. O vidro está somente nos cinco artigos de ProductStories, sobre o mesmo fundo azul/branco procedural.

TypeScript, build e os 23 testes passaram na revisão final. A suíte cobre imagens e estampas, grafo de entrada, zoom/pan, sacola, preço de R$ 100 nas cinco peças, formatação BRL, subtotal, quantidades inválidas e arredondamento em centavos. Nenhum módulo Three/Studio ou modelo GLB é carregado pela apresentação ativa. O build gera CSS 56,17 kB, aplicação 305,57 kB e animação 69,58 kB antes de gzip.

## Verificações na interface

- Computador CSS 1440x1120: cinco peças na hero sem cards. Cinco artigos de vidro na seção inferior, frente/costas completas, descrições, R$ 100,00 e Encomendar. Fundo transparente nas fotos, object-fit contain e backdrop-filter de 24 px. Documento sem rolagem horizontal.
- Tablet CSS 768x1024: duas peças por vez na hero. Card inferior empilhado, fotos lado a lado e largura sem overflow.
- Celular CSS 426x844: uma peça inteira na hero, chamada em grafite sem deformação, seletores 01-05 e cards inferiores com frente/costas inteiras. Documento sem overflow horizontal. Capturas móveis têm 425 px de largura por arredondamento da escala do navegador.
- Clicar na foto de costas da Boca abriu o painel em costas, zoom 100%. Detalhes ampliou para 170%; os controles de frente/costas e restaurar permaneceram disponíveis.
- Adicionar sem tamanho exibiu a orientação e focou P. Escape fechou o painel, devolveu foco à imagem de origem e liberou a rolagem. O painel não produziu overflow horizontal.
- Encomendar Flores focou a escolha do tamanho; M foi adicionado uma vez. Sacola exibiu 3 peças e R$ 300,00. Aumentar Flores M para duas unidades mudou para 4 peças e R$ 400,00. O item de teste foi removido; após recarregar permaneceram somente Boca G e Spiritual Gangsta G, com subtotal R$ 200,00.
- No celular, Encomendar apresenta tamanhos e botão de adicionar antes da imagem. O botão e o tamanho focado ficam dentro da janela; explorar pela foto continua priorizando a imagem. Fechar devolve foco ao botão de origem.
- Um único canvas decorativo acompanha hero e cards com altura de uma viewport. O fundo executou em flow/running nos cards e pausou na seção musical. Nenhum canvas é necessário nas páginas de produto e sacola. Preferência reduzida, aba oculta e falhas de contexto conservam o ciclo de vida da v6 e seus testes.
- Seção musical: retrato real do perfil Spotify correto, carregado em resolução nativa 271x320 e sem filtro. Bio adaptada e créditos apontam ao mesmo ID de artista. No celular a foto mantém largura máxima de 271 px. Bonequinho final confirmado em 150x126 no computador e largura 120 px no celular.

As capturas da janela foram corrigidas pela escala de exibição informada pelo navegador ao pedir o retângulo de captura; os pixels da interface não foram redesenhados. Há oito capturas atuais em previews/final-v7/: hero-desktop, hero-mobile, cards-desktop, cards-tablet, cards-mobile, encomenda-mobile, artista-desktop e artista-mobile. Rascunhos raw não entram no pacote.

## Preservação e limites

Os dez recortes originais continuam com dimensões e pixels preservados, conforme a suíte de ativos. O SVG ZXXR do título é cópia do vetor oficial equivalente ao PNG enviado; o lettering New Drop é novo. A foto do artista foi copiada sem alterações, com procedência e hash em public/media/artist/SOURCE.json. A bio é uma adaptação fiel, não uma transcrição integral.

Os ZIPs v4, v5 e v6 permanecem preservados. A v7 recebe novo pacote sem node_modules, dist, work ou arquivos de ambiente. Não houve commit, push ou publicação.

A encomenda continua local: não envia mensagem, não confirma pedido e não cobra pagamento. Contato do vendedor, frete, estoque, medidas e prazos ainda dependem da próxima etapa. Não houve benchmark em telefone físico nem nova simulação de tecido; as imagens continuam limitadas ao material original.
