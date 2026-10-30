# ZXXR — matriz compartilhada de gelo v8

Flores, Yaji e ZXXR usam o mesmo bloco vertical de gelo, superfície frontal e gravação. A revisão mantém as camisetas originais entre essas camadas; não gera novamente suas estampas, mangas ou barras.

## Conferir a apresentação

- Loja local: http://127.0.0.1:5274/
- Comparação do pacote pelo servidor local: http://127.0.0.1:5274/entrega/matriz-gelo-v8-20261029/comparacao.html
- Também é possível abrir `comparacao.html` diretamente no navegador. Imagens e CSS estão dentro do pacote.

A comparação é estática, com a atmosfera pausada. A loja mantém seus próprios controles e interações. O pacote não inicia o servidor local.

## Composição e parâmetros

As camadas são empilhadas em 2D nesta ordem: `shell`, recorte original da camiseta, `front` e `engraving`. O enquadramento comum é vertical, em proporção 4:5. O mesmo material é reutilizado nas três peças, evitando diferenças de textura ou iluminação causadas por gerar cada camiseta congelada separadamente.

Os recortes utilizados são Flores pela frente, Yaji pelas costas e ZXXR pelas costas. A janela compartilhada ocupa 82% da largura e 76% da altura do canvas. `object-fit: contain` preserva a proporção completa de cada recorte, sem esticar a camiseta para preencher a janela.

A gravação “Em breve” já está posicionada no canvas completo da camada `engraving`. Sua largura de composição é 52% do canvas, com opacidade de apresentação de 95%. O pacote copia `src/frozen-garment.css`; posição, difusão e sobreposição usam a mesma folha da implementação local, em vez de um segundo tratamento apenas para a comparação.

O efeito de profundidade vem das imagens e da sobreposição das camadas. Não é uma simulação 3D de refração, gelo ou tecido.

## Resolução e arquivos de origem

As três camadas geradas originais, de 1122 × 1402 px, permanecem preservadas em `assets-originals/ice-v8/generated/`. As exportações normalizadas têm 1440 × 1800 px. Essa normalização padroniza o enquadramento e não cria detalhe nativo 4K.

As versões WebP transparentes são 640 × 800, 1024 × 1280 e 1440 × 1800 px. O script confere as dimensões e a presença do canal alpha dos PNGs e WebPs antes de escrever a entrega. O manifesto registra resolução e hash dos gerados originais, além dos hashes dos arquivos exportados.

Os recortes das camisetas são copiados diretamente de `public-store/media/reference-v3/`, sem alteração de seus pixels. A suavização vista na composição é aplicada pelo CSS sobre esses mesmos arquivos.

## Conteúdo do pacote

- `material/`: três matrizes PNG de 1440 × 1800 px e nove WebPs responsivos transparentes.
- `camisetas/`: os três recortes originais usados na composição.
- `styles/frozen-garment.css`: folha de estilo copiada da apresentação local.
- `comparacao.html`: comparação estática que funciona sem React e sem compilação.
- `LEIA-ME.md`: esta documentação.
- `manifest.json`: parâmetros, dimensões, origens e hashes dos arquivos.
- `proveniencia/prompts.json`: cópia de `docs/GELO-v8-PROMPTS.json` com a proveniência da geração.
- `capturas/`: PNGs e relatórios JSON da validação, incluídos quando o script recebe `--with-previews`.

As versões anteriores ficam preservadas. O destino exclusivo desta revisão é `entrega/matriz-gelo-v8-20261029/`.

## Gerar a entrega após a validação

Com as camadas, WebPs e arquivo de prompts prontos:

```powershell
node scripts/package-ice-v8.mjs
```

Para incluir as capturas e relatórios já disponíveis em `previews/matriz-gelo-v8/`:

```powershell
node scripts/package-ice-v8.mjs --with-previews
```

O script valida primeiro os insumos e os parâmetros da matriz v8. Depois copia os arquivos e cria a comparação e o manifesto. Ele não gera imagens, não altera o site, não remove arquivos e não cria ZIP. Executá-lo novamente atualiza os arquivos de mesmo nome apenas no diretório de entrega da v8.

## Validação e limites

Os 119 testes passaram, assim como TypeScript e build. A hero foi conferida em 320, 390, 768, 1024 e 1440 px, com blocos inteiros, balões alinhados e sem rolagem horizontal. O carrossel manteve uma peça no celular e duas a partir de 768 px, com navegação circular por teclado.

Para separar a gravação dos símbolos rosa, a mesma superfície frontal usa opacidade de 70% e a camiseta recebe suavização proporcional de 1% da largura do bloco. A gravação conserva 95% de opacidade, com contraste local dos sulcos reforçado. Isso deixa as estampas futuras mais encobertas, sem mudar seus pixels, posição ou proporções.

O reflexo respondeu ao cursor e retornou a zero, com a inclinação neutra restaurada. Miniaturas de recomendações ficam estáticas. Movimento reduzido desativa os efeitos e pausa a névoa. Falhas do recorte original ou da camada frontal mostram nome e “Em breve”, sem voltar aos materiais antigos. Os relatórios JSON e as capturas registram essas conferências.

Conferir as três peças sobre os fundos da loja, incluindo a preta: o contraste do tecido pode tornar o mesmo material mais aparente. Confirmar também que a camada frontal permanece contínua no centro e que a gravação não se confunde com uma legenda sobreposta.

Esta revisão é visual. Preserva catálogo comercial, preços, tamanhos, disponibilidade, sacola e pedidos. Emoção e Spiritual Gangsta permanecem disponíveis; Flores, Yaji e ZXXR permanecem futuras, sem preço ou compra em sua apresentação pública.

Sem alteração de banco, credenciais ou publicação. A prévia local e o pacote não confirmam um novo deploy.
