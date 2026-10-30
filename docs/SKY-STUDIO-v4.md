# Céu de aluguel — estudo de cenário v4

Um estúdio construído, aberto na frente, com céu pintado no reboco, piso de cimento e uma faixa de grama cortada sobre o chão. A referência visual foi a imagem enviada pelo usuário `36cbe2c17eec7de85928cffbf3c05684.jpg`; ela não foi usada como textura nem redistribuída.

## Arquivos

- `public/models/sky-studio-v4.glb`: cenário para Three.js, 24.552 triângulos, 12 objetos e dez materiais; peso final registrado no manifesto após exportação.
- `public/models/sky-studio-mobile-v4.glb`: variante de celular com 3.552 triângulos, mil lâminas de grama, mapas até 1024 px e aproximadamente 2,22 MB.
- `model-source/zxxr-sky-studio-v4.blend`: fonte editável, com câmera, luzes e arara de escala para o estudo.
- `public/media/sky-studio-v4/`: texturas locais. Atlas de pintura 2048 px; normal de reboco 1024 px; cimento 1024 px/normal 512 px; base de grama 2048 px/normal 1024 px.
- `docs/previews/sky-studio-v4-study.png`: estudo renderizado no Cycles, 1920 × 1080.
- `scripts/make-rental-sky-textures.py`, `scripts/project-photographic-sky.py`, `scripts/prepare-photo-studio-maps.py` e `scripts/build-rental-sky-studio.py`: reprodução do reboco/cimento, projeção/compressão do céu fotográfico e geometria. Rodar nessa ordem; depois `scripts/optimize-sky-studio.py` exporta a variante móvel.
- `docs/SKY-STUDIO-v4.json`: dimensões, procedência e parâmetros de integração.

## Construção e procedência

Geometria, reboco e cimento foram criados para este projeto por código. O céu usa a fotografia HDRI [Kloofendal 48d Partly Cloudy (Pure Sky), por Greg Zaal e Jarod Guest — Poly Haven](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), sob [CC0](https://polyhaven.com/license), conferida em 19/10/2026. A versão oficial 2K foi convertida em um albedo limitado, com pigmento azul mais vivo e textura discreta de pintura. Ela não ilumina a cena e não funciona como world/HDRI no navegador. Nuvens fotográficas substituem integralmente as manchas procedurais do primeiro estudo.

O atlas usa uma projeção fotográfica única nas coordenadas de mundo de paredes e teto, conservando a continuidade nas quinas. As linhas de argamassa, remendos discretos e relevo pertencem ao material, sem geometria pesada. A faixa de grama possui espessura, bordo de corte e oito mil lâminas geométricas com pontas dobradas; a altura das lâminas foi reduzida para evitar aparência de pinos.

A base e o normal de grama vêm de [Leafy Grass, por Charlotte Baglioni — Poly Haven](https://polyhaven.com/a/leafy_grass), sob [CC0](https://polyhaven.com/license), conferida em 19/10/2026. Foram baixados os mapas oficiais 2K e 1K e salvos em JPEG otimizado para a web, sem alterar seu conteúdo. O material recebe um fator verde escuro para representar a placa de grama; esse fator também é exportado ao glTF. A UV repete a textura a cada duas unidades da cena; a captura original do fornecedor representa dois metros. Não são utilizados um HDRI de paisagem, fundo externo ou renders de demonstração do fornecedor.

Fontes dos mapas: `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/leafy_grass/leafy_grass_diff_2k.jpg` e `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/leafy_grass/leafy_grass_nor_gl_1k.jpg`. Os downloads originais foram preservados junto das cópias comprimidas.

Os materiais incluem mapas normais compatíveis com glTF. O resultado no navegador não depende de um nó de bump exclusivo do Blender. A arara usada para conferir escala existe apenas na fonte e no render de estudo; não é exportada no GLB.

## Integração

Importar em posição, escala e rotação originais. O GLB já usa Y para cima: parede traseira em Z −3, paredes laterais em X ±9 e teto em Y 7. O piso avança até Z 10 para não terminar na câmera. As roupas ocupam a área frontal em torno de Z 0. A faixa de grama vai de Z −2,7 a +0,4 e possui limite visível sobre o cimento.

Retirar o piso/fundo plano anterior. Ativar `receiveShadow` nos objetos; as lâminas de grama podem ficar com `castShadow = false`, especialmente no celular. Usar luz frontal e ambiente neutros para manter off-white, preto estonado, vermelho e rosa das peças. Não usar a pintura azul como mapa de ambiente das roupas. O arquivo não exporta luzes ou câmeras e mantém a configuração do render sob controle da aplicação.

O cenário é uma visualização modelada de um estúdio, não uma fotografia de instalação construída. O render Cycles é referência de composição e iluminação; a fidelidade do WebGL deve ser verificada após integrar roupas, luzes e sombras na mesma cena.

A cor base da grama foi calibrada na prova de iluminação: mediana aproximada `#3b6527` no render final, comparada ao alvo `#426b26` (diferença máxima de 7/255 nos canais RGB). A fonte de luz superior foi reduzida e afastada da parede para evitar que o emissor cruzasse a estrutura e criasse uma faixa artificial no estudo. As luzes de prova ficam fora do GLB.

## Verificação realizada

O binário glTF foi lido após exportação: 24.552 triângulos, nenhum modelo animado, nenhuma câmera, seis mapas embutidos com resolução máxima de 2048 px. Os encontros de textura nas três quinas medidas têm diferença média inferior a um nível de RGB/255. O arquivo preserva o espaço frontal livre e não contém roupas, personagens ou texto. A fonte e versões anteriores do projeto foram preservadas.
