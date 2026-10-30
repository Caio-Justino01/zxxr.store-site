# ZXXR Store — Céu de aluguel, v4

Cinco peças da edição Razz, limitadas e sob encomenda. A direção substitui o estúdio branco/cinza pelo cenário construído da referência: céu pintado nas paredes e no teto, reboco, piso de cimento e faixa de grama com borda aparente. Logo ZXXR Store centralizada, selo artístico Razz monocromático e texto curto. A arara é a navegação. O guia abaixo foi reduzido a três orientações; música, Spotify, catálogo e sacola permanecem.

## Construção das roupas

O candidato externo do Sketchfab foi excluído. Não houve download nem uso de sua malha. A verificação e a evidência estão em `CANDIDATE-v4.md`.

`scripts/build-tailored-v4.py` deriva o corte das referências JPG limpas. Os contornos recebem tolerância de limpeza de 4,5 pixels para retirar irregularidades de compressão da borda. Os punhos são intervalos contínuos; lados e ombros compartilham vértices. O molde tem quatro aberturas semânticas: gola, barra e dois punhos. A receita rejeita faces duplicadas e arestas com mais de duas faces antes da simulação.

A malha parte de um corpo e mangas volumétricos. Um torso e braços relaxados invisíveis funcionam como colisores no Blender. Não são exportados. O algodão resolve gravidade, apoio e autocolisão offline; quatro poses de topologia estável são amostradas. `Worn` deriva de uma pequena mudança de postura do suporte e da resposta física, sem inflação analítica. O acabamento inclui espessura discreta e uma ribana contínua projetada na superfície do tecido para cada pose.

### Corte selecionado para o protótipo

A implementação atual carrega **uma única base compartilhada**, derivada do corte preto auditado e comparada à referência off-white da Boca. `scripts/select-shared-cut-v4.py` reutiliza a geometria, os índices e as quatro poses do GLB preto e associa as artes RGBA originais da Boca para a inspeção. O frontend instancia essa mesma geometria para as cinco peças, com tecido e estampas próprios. Não há expansão arbitrária da malha para aproximar medidas.

O comparativo de silhueta e gola está em `docs/previews/audit-v4-contact/SHARED-CUT-COMPARISON.md`. A base preta foi a opção mais limpa no teste de contato, com zero cruzamentos confirmados nas quatro poses extremas auditadas. Na comparação projetada com a foto plana off-white, o erro médio de largura do torso entre 55–85% da altura foi de 4,74%, chegando a 6,46% aos 85%; o extremo da barra apresenta diferença maior. Portanto a seleção é uma aproximação de apresentação, não uma certificação dimensional ou prova de que as peças fabricadas têm um único molde. A foto plana e a manga relaxada em volume também têm projeções diferentes.

- `public/models/oversized-shared-v4.glb`: corte ativo para computador/tablet.
- `public/models/oversized-shared-v4-mobile.glb`: corte ativo leve para largura CSS inicial até 700 px.
- `model-source/zxxr-shared-oversized-v4.blend`: fonte compartilhada com a Boca retargetada.
- `model-source/zxxr-tailored-black-v4.blend` e `public/models/oversized-black-v4[-mobile].glb`: base preta da qual o corte foi selecionado.
- `model-source/zxxr-tailored-offwhite-v4.blend` e `public/models/oversized-offwhite-v4[-mobile].glb`: cópias de inspeção retargetadas com a Boca; já usam a geometria selecionada, não o estudo branco anterior.
- `model-source/zxxr-tailored-offwhite-study-v4.blend` e `public/models/oversized-offwhite-study-v4[-mobile].glb`: estudo off-white anterior preservado e fora do carregamento da loja.
- `docs/SHARED-CUT-v4.json`: seleção, hashes do buffer original e registros de retarget. As imagens incorporadas e os metadados do GLB mudam; a geometria e as poses são reutilizadas.
- `docs/MODEL-{offwhite,black}-v4.json`: procedência, construção e hipótese de escala.
- `docs/previews/tailored-v4/`: inspeção das bases e provas `boca-shared-front.png`/`boca-shared-back.png`.

A largura física de 0,82 m usada pelo cálculo é uma hipótese de apresentação. Não é medida confirmada nem base para uma tabela de tamanhos.

## Artes e tecido independentes

As cinco fontes são `IMG_3296 1.jpg` (Boca), `IMG_3282 1.jpg` (Flores), `IMG_3283 1.jpg` (Me preservando), `IMG_3281 1.jpg` (Spiritual Gangsta) e `IMG_3271 1.jpg` (ZXXR Rosa). Cópias estão em `public/media/source/`.

`scripts/prepare-reference-patterns.py` registra contornos e recortes nativos em `REFERENCE-MANIFEST-v3.json`. A galeria usa esses pixels originais, com alpha exterior. `scripts/prepare-artwork-v4.py` separa somente a transparência do tecido ao redor da tinta: RGB, escala e posição dos pixels de arte são mantidos. Os dentes, brilhos, aro e R brancos da Boca e o contorno branco da Rosa fazem parte da camada de tinta. Regiões, regras e limites estão em `ARTWORK-v4.json`; os PNGs ficam em `public/media/artwork-v4/`.

O material WebGL combina algodão fosco, amostras pequenas da textura original e normal de microtrama com a camada RGBA de estampa. Interior e ribana recebem apenas tecido. Assim a luz e as costuras fotografadas do mockup não são aplicadas como se fossem novas dobras geométricas.

As fontes medem 1135×1828 ou 1080×1350 no contato de frente e costas. Os PNGs de arte mantêm o recorte UV nativo e o retarget não os amplia nem redesenha. Renderizar uma apresentação em resolução maior não recupera detalhes de impressão ausentes nem transforma esses arquivos em artes originais 4K. Nenhuma fonte tipográfica das estampas foi substituída.

## Estúdio

O cenário é geometria real em GLB, com atlas de céu fotográfico tratado como pintura fosca e continuidade de UV nas quinas. Não é um HDRI de paisagem usado como fundo infinito. Cimento, juntas e bordas de grama permanecem visíveis. Os arquivos não contêm luzes que substituam a iluminação do visualizador.

- `public/models/sky-studio-v4.glb`: 24.552 triângulos, texturas até 2K.
- `public/models/sky-studio-mobile-v4.glb`: 3.552 triângulos, texturas até 1K.
- `model-source/zxxr-sky-studio-v4.blend`: fonte.
- `docs/SKY-STUDIO-v4.md` e JSONs associados: procedência CC0, autores, URLs e reconstrução.

A luz frontal e o ambiente de reflexão são neutros para preservar off-white, preto e tinta. A pintura azul não é utilizada como fonte emissiva sobre a roupa. Arara, roupas, chão e ambiente compartilham câmera e sombras. A página individual oferece fundo neutro.

## Interação e limites

Uma única cena Three.js persiste entre coleção e produto. Giro no hover/foco, mola amortecida no cabide e deformações preparadas sugerem peso; não há solver de tecido contínuo no navegador. A seleção bloqueia retiradas concorrentes e aproxima a peça antes da mudança de rota. No celular há uma peça em destaque, seleção das cinco e deslize horizontal, preservando rolagem vertical.

Preferência de movimento reduzido desativa o balanço e encurta transições. Fora da tela e em aba oculta a renderização pausa. A galeria HTML e a navegação continuam disponíveis durante carregamento ou falha de WebGL. A sacola mantém a chave da primeira versão e agrupa produto/tamanho, sem preços ou pedidos inventados.

O visualizador de referência é [Tony Boy](https://tonyboyshop.com/products/v/colar-tttt-005/1419). A documentação [iJewel](https://docs.ijewel3d.com/introduction/ijewel.html) e [Viewer](https://docs.ijewel3d.com/viewer/viewer-class.html) orientou a avaliação de materiais, câmera e animação; não fornece uma camiseta pronta nem comprova simulação de algodão. A implementação mantém Three.js e Blender nativo.

## Reconstruir

Com Python/Pillow/numpy e Blender 4.5.9 LTS oficial disponíveis, executar na raiz `zxxr-store`:

```powershell
python scripts/prepare-reference-patterns.py
python scripts/prepare-artwork-v4.py
& '../.tools/blender-4.5.9-windows-x64/blender.exe' --background --threads 6 --python scripts/build-tailored-v4.py -- --dark
& '../.tools/blender-4.5.9-windows-x64/blender.exe' --background --threads 6 --python scripts/select-shared-cut-v4.py
python scripts/package-store.py
```

O seletor salva o estudo off-white existente com sufixo `-study` antes de substituir as cópias de inspeção, caso a cópia preservada ainda não exista. A receita original sem `--dark` continua disponível para reconstruir o estudo branco separadamente; a loja lê somente os arquivos `oversized-shared-v4*` após a seleção. Os JSONs de seleção e o comparativo distinguem essa decisão do estudo anterior.

O cenário tem receita própria em `scripts/build-rental-sky-studio.py`; ver os comandos e downloads oficiais no documento de procedência. O executável portátil e dependências instaladas não acompanham o pacote. Kit de identidade, fontes de referência e versões anteriores ficam preservados no workspace.
