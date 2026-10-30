# Hero v5 — referências originais em uma coleção 2D

A v5 substitui a apresentação ativa das camisetas 3D por imagens originais das cinco peças. A decisão prioriza o corte oversized, as proporções e os pixels das estampas fornecidas. Os estudos v4 permanecem preservados; não são carregados pelo aplicativo atual.

## Experiência ativa

- **Coleção:** cinco imagens grandes sobre céu fotográfico em camadas. O texto é curto: NEW DROP ZXXR, edição Razz e peças limitadas sob encomenda. O selo Razz acompanha a autoria; a marca principal continua centralizada no cabeçalho.
- **Hover e foco:** pequeno deslocamento, rotação no plano e ampliação uniforme da imagem. A peça não sofre deformação de tecido ou alteração independente de largura/altura. Ao selecionar, uma aproximação curta precede a navegação. Links modificados, como Ctrl+clique, conservam o comportamento normal do navegador.
- **Celular/tablet:** rolagem horizontal com encaixe, seleção 01–05 e setas/Home/End no teclado. A seleção programática mantém o botão escolhido mesmo quando o último item divide a tela com o anterior. O movimento manual libera esse bloqueio e acompanha o deslocamento da lista. A rolagem vertical da página continua disponível.
- **Produto:** Frente/Costas por troca de imagem, Detalhes, zoom de 100% a 200%, arraste dentro dos limites da imagem ampliada e Restaurar visão. Detalhes amplia o mesmo arquivo; não cria resolução nova. No zoom normal, toque permite rolar a página; ampliado, o gesto atua sobre a imagem.
- **Continuidade:** catálogo, sacola persistente, guia curto, seção musical/Spotify, selo Razz e bonequinho do fechamento permanecem.

Não há rotação 360°, volume reconstruído, simulação de tecido ou estados arara/solta/vestida na apresentação ativa. As imagens são referências/mockups originais, não fotografias novas de peças físicas penduradas.

## Fontes e fidelidade

| Peça              | Arquivo fornecido |
| ----------------- | ----------------- |
| Boca              | `IMG_3296 1.jpg`  |
| Flores            | `IMG_3282 1.jpg`  |
| Me preservando    | `IMG_3283 1.jpg`  |
| Spiritual Gangsta | `IMG_3281 1.jpg`  |
| ZXXR Rosa         | `IMG_3271 1.jpg`  |

Os arquivos completos estão em `public/media/source/`. As vistas frente/costas preservadas estão em `public/media/reference-v3/`, com recortes e dimensões registrados em `docs/REFERENCE-MANIFEST-v3.json`. O nome v3 identifica a preparação original desses ativos; a v5 os reutiliza sem redesenhar a roupa ou as inscrições. Os PNGs de referência mantêm a resolução nativa dos recortes, aproximadamente 921–923 × 691–702 nas peças off-white e 761 × 573 nas pretas. Não são estampas originais recuperadas em 4K.

O cadastro em `src/config/products.ts` aponta `front` e `back` para esses PNGs. A hero usa costas por padrão e frente em Flores, conforme `heroView`. O visualizador usa as mesmas fontes. Todas as apresentações usam `object-fit: contain`; não há deformação de malha nem `scaleX`/`scaleY` independente para mudar o corte.

O CSS legado possui regras de atlas com largura de imagem em 200% e deslocamento de costas. `hero-v5.css`, importado depois de `styles.css`, restaura largura/altura em 100%, deslocamento zero e proporção natural para `.native-photo`. A hero e o visualizador usam classes próprias (`cc-` e `gv-`) para evitar herdar os controles e as restrições de ponteiro da cena v4.

## Céu e movimento

`SkyBackdrop` contém três planos fotográficos de profundidade e quatro ativos derivados, com versões desktop/mobile. Procedência, autores, licença CC0, hash do HDR e transformações estão registrados em `docs/CLOUDS-v5-manifest.json`. A fonte registrada é [Kloofendal 48d Partly Cloudy — Pure Sky, Poly Haven](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), de Greg Zaal e Jarod Guest.

As nuvens recebem deriva lenta; o parallax do ponteiro fica restrito a dispositivos com ponteiro preciso. O céu não aplica filtros às camisetas e não intercepta cliques. Os movimentos param fora da tela ou com a aba oculta; a preferência de movimento reduzido mantém o céu estático e remove os deslocamentos de apresentação das peças. Essa camada substitui o estúdio físico v4 de paredes/teto/grama.

## Falhas e acessibilidade

Na coleção, se a vista principal falhar, tenta-se o outro lado original; se ambas falharem, o nome da peça e o link de exploração continuam disponíveis. No produto, uma falha oferece acesso ao arquivo completo de referência e retorno à coleção. Informações, tamanhos e sacola são HTML e independem da apresentação visual.

Links e botões têm foco visível. A coleção pode ser explorada com teclado; o visualizador oferece Frente/Costas e zoom por botões, além de atalhos. A imagem ampliada pode ser deslocada com setas; Home/Escape/0 restauram a frente e o zoom normal. A sacola mantém a chave e o formato anteriores do armazenamento local.

## Organização e verificação

- `src/components/CloudCollection.tsx`: navegação e imagens da coleção.
- `src/components/GarmentViewer.tsx`, `src/lib/viewer.ts`: vistas, zoom e limites do deslocamento.
- `src/components/SkyBackdrop.tsx`, `src/sky-v5.css`: céu fotográfico.
- `src/hero-v5.css`, `src/viewer-v5.css`: apresentação ativa e proteção contra estilos antigos.
- `tests/active-presentation.test.ts`: grafo de imports ativos sem Three/Studio/GLB e equivalência dos pixels das fotos cadastradas com os recortes aprovados.
- `tests/viewer.test.ts`: limites de zoom/pan considerando a área efetiva de `contain`.

As 13 verificações automatizadas passaram na integração desta etapa. Os testes de GLB que permanecem na suíte validam arquivos históricos preservados; não significam que o aplicativo ativo os carrega. Inspeção de layout, toque, histórico, falhas e fluidez na prévia deve ser consultada em `docs/VALIDACAO.md`, mantido separadamente.

## Limites e próxima etapa

A apresentação preserva a informação realmente disponível nas imagens. A ampliação pode evidenciar a resolução limitada dos arquivos fornecidos. Caimento ao cabide, perfil real, medidas finais e fotografia do produto fabricado exigem uma amostra física ou material adicional de produção. Uma futura versão 3D deve começar pela validação de uma única peça parada e pendurada, antes de replicar ou animar as cinco.

Pagamento, frete, estoque, prazo de produção e o site institucional do selo não fazem parte desta prévia. Os preços continuam a definir. Modelos, fontes e provas anteriores foram preservados, inclusive a cópia de trabalho v4 em `work/hero-v4-preservada/` na raiz do subprojeto. O ZIP v4 também fica preservado na pasta de entrega.
