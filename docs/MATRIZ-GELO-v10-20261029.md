# ZXXR — borda v8 com superfície mais leve

A revisão v10 reutiliza exatamente os PNGs e WebPs de `ice-v8`: borda, superfície frontal e gravação. Nenhuma imagem foi gerada ou reprocessada. A v8 e a v9 permanecem preservadas.

A mudança em relação à v8 é apenas a intensidade da composição: superfície frontal a 28% e desfoque do recorte original de 0,22% da largura do bloco (`.22cqw`), em vez de 70% e `1cqw`. O recorte frontal original `inset(8% 7% 7% round 2cqw)` volta a encaixar a superfície dentro da borda. A gravação permanece central, a 95%.

Os três produtos usam a mesma matriz vertical 4:5 e os mesmos recortes originais: Flores pela frente, Yaji e ZXXR pelas costas. Janela da camiseta: 82% da largura e 76% da altura, com proporções preservadas.

O ajuste é compartilhado pela hero, seção inferior, páginas e miniaturas. Não altera navegação, carrossel, preços, disponibilidade, pedidos, sacola ou APIs. Sem publicação.

## Validação

124 testes passaram; TypeScript e build também passaram. A comparação em 1440 px mostra as três camisetas com a borda original e superfície mais leve. Flores e a estampa rosa continuam visíveis, com mangas e barra completas.

A página da ZXXR foi conferida em 320, 391, 768, 1024 e 1440 px: imagens carregadas, bloco inteiro e nenhuma rolagem horizontal. A seção das três peças também foi inspecionada na loja em 1706 px, confirmando a mesma matriz `shared-v8-light`, opacidade 28% e o recorte frontal original nas três. Capturas e medições ficam em `previews/matriz-gelo-v10/`.

A revisão altera somente a referência compartilhada aos ativos preservados, o recorte da superfície e a identificação interna do material. Os testes de ativos apontam novamente para v8. O comportamento existente de carrossel, reflexos e miniaturas não foi reimplementado.
