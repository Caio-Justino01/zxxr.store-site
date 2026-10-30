# ZXXR — gelo compartilhado v9

Esta revisão reduz o fosco que escondia as camisetas e troca o contorno muito regular por uma silhueta de gelo com irregularidades suaves. Flores, Yaji e ZXXR continuam usando um único material, com os recortes originais preservados.

## Composição

O mesmo arquivo de gelo orgânico é reutilizado em `shell` e `front`. Isso mantém borda, iluminação e superfície frontal no mesmo registro. A composição é: gelo de fundo, camiseta original, superfície frontal e a gravação compartilhada “Em breve”, preservada da v8.

A frente usa **28% de opacidade**, e o desfoque do recorte é de **0,22% da largura do bloco** (`blur(.22cqw)`). O objetivo é reconhecer a camiseta e sua estampa sem retirar a camada de gelo diante do tecido. Não se aplica uma textura própria à camiseta preta.

A gravação permanece com **95% de opacidade** e o mesmo contraste local de sulcos da v8. A janela da camiseta ocupa **82% da largura e 76% da altura** do canvas; `object-fit: contain` preserva silhueta e proporções. A inscrição ocupa 52% da largura do canvas. Flores aparece pela frente; Yaji e ZXXR, pelas costas.

O formato continua vertical, em **4:5**. Na hero, a altura da área da imagem permanece igual, com largura do gelo equivalente a 80% dessa altura. Não há mudança nos cálculos do carrossel, nos balões ou na ordem dos produtos.

## Ativos e proveniência

Os arquivos ficam em `assets-originals/ice-v9/` e `public-store/media/ice-v9/`. Os PNGs são normalizados em **1440 × 1800 px**, com WebPs transparentes de **640 × 800, 1024 × 1280 e 1440 × 1800 px**. A normalização não acrescenta detalhe fotográfico ausente na geração original.

O novo gelo é produzido com o imagegen integrado. Os prompts e as origens reais devem ser registrados em `docs/GELO-v9-PROMPTS.json` antes de montar a entrega. Os gerados originais permanecem em `assets-originals/ice-v9/generated/`; `shell` e `front` compartilham a mesma matriz. A gravação é reaproveitada da v8, sem gerar novamente as letras.

Os recortes vêm diretamente de `public-store/media/reference-v3/`. Seus pixels, cores e posição da estampa não são editados. O efeito visual de difusão é aplicado somente na composição.

## Comparação local e pacote incremental

- Loja local: http://127.0.0.1:5274/
- Comparação, após gerar o pacote: http://127.0.0.1:5274/entrega/matriz-gelo-v9-20261029/comparacao.html

Com ativos e prompts prontos, executar:

```powershell
node scripts/package-ice-v9.mjs
```

Para incluir capturas e relatórios disponíveis em `previews/matriz-gelo-v9/`:

```powershell
node scripts/package-ice-v9.mjs --with-previews
```

O script confere configuração, dimensões, transparência e a matriz idêntica de `shell` e `front` antes de escrever os arquivos da entrega. Depois copia a folha `src/frozen-garment.css`, os três recortes, os PNGs, nove WebPs, prompts e este documento. Cria também uma comparação estática e um manifesto com hashes. Não cria ZIP e não remove versões anteriores.

A comparação usa os mesmos ativos e CSS da loja, com atmosfera e reflexos pausados. Serve para examinar as três peças no mesmo tamanho, sem depender de React ou compilação. Não substitui a conferência do carrossel na loja.

## Validação local

Os **124 testes passaram**, assim como TypeScript e build. A comparação lado a lado foi inspecionada em 1440 px: as três camisetas e suas estampas estão mais visíveis, o mesmo material envolve todas as peças e o contorno tem irregularidades suaves. Não aparece uma sobra retangular da superfície frontal dentro da nova borda.

A hero foi inspecionada em 320 px e a página da ZXXR em 390 px, com o bloco vertical inteiro, mangas e barra preservadas. A gravação permanece visível sobre a preta; em escala pequena, sua sobreposição à estampa rosa reduz a separação entre os traços, sem alterar a posição de nenhuma das duas. As capturas ficam em `previews/matriz-gelo-v9/`.

A hero também foi conferida em 768, 1024 e 1440 px: as três instâncias de gelo usam `shared-v9`, com camadas carregadas e sem rolagem horizontal. Os tamanhos e o estado de carregamento estão registrados em `responsivo.json`. O hash da gravação original foi comparado entre v8 e v9 e permanece idêntico.

Essas capturas documentam a revisão visual nos tamanhos indicados. Elas não comprovam sozinhas movimento, gestos, fallback ou pausa de efeitos; esses comportamentos mantêm a implementação existente e devem ser conferidos na loja quando necessário.

A revisão é local e visual. Preserva catálogo comercial, preços, disponibilidade, tamanhos, sacola, pedidos e rotas. A v8 e os arquivos anteriores permanecem guardados. Não inclui banco, publicação ou novo deploy.
