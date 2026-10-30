# Céu fotográfico v5

Fundo em três planos fotográficos: céu distante azul, nuvens intermediárias com transparência e recortes próximos enquadrando as bordas. Não há sala, teto, chão, grama, círculos, nuvens geradas ou filtro aplicado às roupas. Os ativos v4 foram preservados.

## Fonte e licença

A fotografia original é [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), por **Greg Zaal e Jarod Guest**, distribuída pela Poly Haven sob [CC0](https://polyhaven.com/license). A versão oficial HDR 4K foi obtida em 19/10/2026 neste endereço:

`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kloofendal_48d_partly_cloudy_puresky_4k.hdr`

O HDR original e a versão fotográfica convertida ficam em `public/media/clouds-v5/source/`. O componente não solicita esses arquivos pesados. O SHA-256, as dimensões e os tamanhos efetivos dos assets ficam em `CLOUDS-v5-manifest.json`.

## Preparação

`scripts/prepare-clouds-v5.py` usa Blender apenas para decodificar o HDR fotográfico. Pillow/Numpy fazem a compressão de luminância, a pigmentação seletiva do azul, a projeção de perspectiva e a extração de alpha pela diferença entre nuvens e céu azul. As nuvens mantêm formas e sombreamento capturados na fotografia. Não há síntese de imagens ou desenho de novos contornos. Os recortes próximos selecionam grupos fotográficos inteiros. A camada intermediária descarta os grupos cortados pelo limite do enquadramento, evitando linhas horizontais artificiais; fragmentos vizinhos fora do grupo selecionado também são retirados. As bordas dos três arquivos transparentes têm alpha zero.

Os enquadramentos de fundo ficam acima do horizonte do panorama. A área inferior espelhada do HDR não é usada. O fundo usa uma fotografia opaca; nuvens intermediárias e próximas são WebP RGBA. Cada arquivo possui uma variante `-mobile.webp` de menor resolução.

## Integração

`src/components/SkyBackdrop.tsx` importa seu próprio `src/sky-v5.css`. Inserir `<SkyBackdrop />` no início da hero, cujo elemento pai deve ter `position: relative`. O componente ocupa `position: absolute; inset: 0; z-index: 0`, tem `pointer-events: none` e não participa da acessibilidade ou navegação por teclado. Roupas e conteúdo ficam na camada de conteúdo controlada pelo pai. A propriedade opcional `className` permite ajustes locais sem alterar a API.

Os três planos têm drift GSAP discreto de 48–60 segundos. Parallax responde somente a mouse fino, limitado a 16 px horizontais e 10 px verticais no plano próximo; os outros planos têm amplitude menor. Toque não é interceptado. As animações pausam quando a hero sai da tela ou a página fica oculta. `prefers-reduced-motion` produz uma composição estática e remove parallax. Listeners, observadores e tweens são desmontados junto do componente. O atributo `data-sky-state` informa `running`, `paused` ou `static` para inspeção.

No celular são carregadas as variantes menores, a camada intermediária fica mais discreta e o recorte direito deixa de aparecer. Não há processamento de imagem por quadro, WebGL ou simulação de partículas neste fundo.

## Verificação

Os arquivos foram inspecionados em prancha sobre azul para conferir contorno/alpha e ausência de chão ou costura de horizonte. O TypeScript passou com o novo componente. Os quatro assets somam aproximadamente 479 KB no desktop e 120 KB nas variantes de celular; os tamanhos exatos estão no manifesto. Contraste do título, encontro com as roupas, histórico e desempenho total devem ser verificados na composição final da hero. O arquivo `inspection-sheet.jpg` é apenas uma prancha de revisão; o componente carrega somente os quatro WebPs e as alternativas responsivas.
