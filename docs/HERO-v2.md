# Edição Razz — arara interativa v2

Hero editorial em cinza, barra preta de ponta a ponta e cinco camisetas grandes. Chamada: **NEW DROP ZXXR**, **Edição Razz**, **Peças limitadas, feitas sob encomenda.** O selo Razz aparece em uma interpretação vetorial plana, com oval e lettering próprios, em preto e branco.

## Fontes e fidelidade

| Produto | Referência original | Vista inicial na arara |
|---|---|---|
| Boca | IMG_3296.PNG | Costas |
| Flores | IMG_3282.PNG | Frente |
| Me preservando | IMG_3283.PNG | Costas |
| Spiritual Gangsta | IMG_3281.PNG | Costas |
| ZXXR Rosa, nome provisório | IMG_3271.PNG | Costas |

Três peças off-white e duas pretas estonadas. O selo artístico usa IMG_1909.PNG. As cópias de referência estão em `public/media/source`. As imagens de campanha fornecidas pelo usuário orientam enquadramento, barra, luz e postura; nenhuma arte dessas outras marcas é utilizada.

Os atlas UV conservam os pixels das estampas originais e amostras da textura fotografada do algodão, incluindo o estonado e o contorno branco da peça rosa. Coordenadas em `ASSET-MANIFEST.json`. Gola, ombros, corpo, barra e mangas seguem as proporções visuais dos mockups; o caimento pendurado deforma a aparência da silhueta, sem alongar o molde em repouso.

Não há ficha técnica, molde de fabricação, fotografia da peça fabricada ou escaneamento. O modelo é uma interpretação tridimensional dos mockups. Para produção comercial, substituir atlas por artes de impressão e confirmar medidas e material com amostras reais.

## Construção

`scripts/build-draped.py` reaproveita o contorno e UVs do molde plano, resolve **160 frames de Blender Cloth**, com gravidade, suporte nos ombros, colisão com cabide e autocolisão. A simulação é amostrada em geometria de topologia estável; acabamento subdividido é calculado separadamente em cada pose para preservar UVs e deformações. `CLOTH-SIMULATION-v2.json` registra os dados do cálculo.

- `public/models/oversized-draped-v2.glb`: acabamento suavizado para computador/tablet.
- `public/models/oversized-draped-v2-mobile.glb`: geometria mais leve, mesma simulação, para largura CSS até 700 px no carregamento.
- `model-source/zxxr-gravity-draped-v2.blend`: malha e poses editáveis, materiais e estúdio para renders.
- `public/media/draped`: dez PNGs transparentes de frente/costas renderizados a partir do mesmo modelo, usados na galeria, editoriais e sacola.
- `public/brand/razz-seal-{black,white}.svg`: selo vetorial com curvas, sem dependência de fonte.

O navegador **não executa um solver completo de tecido**. Reproduz as deformações calculadas e combina giro com mola amortecida no pivô do cabide. GSAP coordena elevação, aproximação e mudança de rota. Há uma única cena persistente e o restante da interface permanece HTML.

Hover e foco revelam a estampa; saída devolve a peça à diagonal. Clique levanta o conjunto da barra e aproxima a peça antes de abrir `/produto/:slug`. Seleções concorrentes ficam bloqueadas durante a retirada. No celular, deslize ou selecione 01–05 e use “Explorar [peça]”; a rolagem vertical permanece disponível. Frente, costas, detalhes, solta e vestida continuam na página do produto.

As galerias atuais não utilizam as fotografias generativas da v1. Esses estudos e todos os arquivos anteriores continuam preservados no workspace. A cópia do código/modelos/documentação anterior à hero está em `../work/hero-v1-preservada`; o ZIP v1 também permanece intacto.

## Recriar ativos

Com Node e Blender 4.5.9 LTS oficial disponíveis, executar a partir de `zxxr-store`:

```powershell
node scripts/prepare-assets.cjs
& '../.tools/blender-4.5.9-windows-x64/blender.exe' --background --threads 6 --python scripts/build-draped.py -- --proof-only
& '../.tools/blender-4.5.9-windows-x64/blender.exe' --background --threads 6 --python scripts/build-draped.py -- --mobile --model-only
& '../.tools/blender-4.5.9-windows-x64/blender.exe' --background --threads 6 --python scripts/render-drop.py
```

O executável portátil não acompanha o ZIP. As fontes de construção e todos os ativos usados pelo site acompanham. Gerar os atlas antes dos modelos e renders.

## Limites da loja

P/M/G/GG e nomes provisórios, preço “A definir”. Catálogo e sacola local agrupam produto/tamanho, preservando a chave da v1. Sem pagamento, cálculo de frete, estoque ou confirmação de encomenda. Não há quantidade restante, prazo ou escassez numérica inventados. Seção de música e Spotify permanecem.
