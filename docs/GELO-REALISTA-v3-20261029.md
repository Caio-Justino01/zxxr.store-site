# ZXXR — gelo realista v3 · 29/10/2026

## Entrega local

Prévia: http://127.0.0.1:5274/ (`npm.cmd run dev` em `zxxr-store`).

A hero apresenta Emoção, Flores, Yaji, ZXXR e Spiritual Gangsta nessa ordem. As três futuras usam imagens de gelo espesso com fundo transparente, substituindo as superfícies de vidro em CSS. Flores aparece pela frente; Yaji e ZXXR pelas costas. A abertura, scroll reversível, roleta e balanço das disponíveis foram mantidos. A roleta usa uma moldura horizontal 4:3 para acomodar os blocos inteiros; a hero usa arco de até 4°, com vãos calculados de 24 px no centro e 48 px nas extremidades do grupo, na apresentação desktop.

As áreas das futuras mostram somente nome e “Em breve”: hero, seção Próximos desejos, páginas individuais, recomendações, suporte e detalhes rápidos. As rotas continuam acessíveis; o retorno às disponíveis está na navegação. Não há tamanhos, ficha, preço ou compra nessas apresentações.

## Imagens e método

Produzidas com **imagegen integrado**, editando os recortes originais e usando `entrega/ice-v2/amostras/spiritual-gangsta-costas-ice-v2-amostra01.png` como referência do gelo. Flores foi gerada e inspecionada primeiro; em seguida, Yaji e ZXXR receberam o mesmo material. Nenhum texto da interface foi incorporado aos renders.

Originais PNG, prompts completos e manifesto: `../entrega/gelo-realista-v3-20261029/`, a partir da raiz do workspace (pasta irmã de `zxxr-store`).

| Render | PNG original com alpha | WebP maior |
|---|---:|---:|
| Flores frente | 1447 × 1087 | 1440 × 1082 |
| Yaji costas | 1447 × 1087 | 1440 × 1082 |
| ZXXR costas | 1445 × 1088 | 1440 × 1084 |

WebPs em `public-store/media/ice-v3/`, larguras 640, 1024 e 1440, qualidade 93 e alpha 100. Dimensões e `srcSet` estão em `Product.frozenImage`. Sem upscaling; PNGs originais preservados na entrega. A aparência de profundidade está nas imagens; o GSAP move o conjunto em até 2°, sem deformar gelo ou tecido.

Comparação visual: três flores e assinatura de Flores; frase e assinatura de Yaji; quatro letras rosas com contorno branco de ZXXR. Silhuetas completas, mangas e barras visíveis, bordas do gelo inteiras. Os renders são edições geradas e não fotografias ou malhas 3D; os dez recortes originais continuam intactos.

## Validação executada

- Source: **95 testes passaram**, TypeScript e build concluídos.
- Checkout local de publicação: **91 testes passaram**, TypeScript e build concluídos; `git diff --check` sem erros.
- Inspeção no navegador em larguras CSS de 320, 390, 768, 1024 e 1440 px, sem rolagem horizontal. Limites geométricos também cobertos por teste até 2560 px.
- Navegação por teclado até futura, abertura de Yaji e histórico de volta; roleta por arraste, setas e volta da quinta para a primeira; scroll recolhe e retorna a 0 preservando a seleção.
- Informações das futuras verificadas na hero, página, seção inferior, recomendações, detalhes rápidos e suporte: nome e “Em breve”. As duas disponíveis conservam seus preços.
- Harness isolado em memória: movimento reduzido sem transformação do gelo; detalhes rápidos fecham com Escape e restauram foco; falha do render mostra alternativa legível. A sacola real de dois itens não foi alterada.
- Capturas em `previews/gelo-realista-v3/`: desktop, celular, tablet e Próximos desejos.

Validação responsiva feita no navegador desktop redimensionado e por interação de ponteiro; não representa ensaio em aparelho físico ou Safari. O servidor Vite não fornece a API comercial remota: autenticação/contato/pagamentos locais conservam a indisponibilidade pré-existente. Não foi criado pedido para essa revisão visual.

## Preservação e publicação

Backup anterior: `work/antes-gelo-realista-20261029/` (src e tests). Assets anteriores de gelo e referências preservados. Alterações desta revisão e novos WebPs sincronizados para `../work/publish-zxxr-store/`, sem sobrescrever configuração ou credenciais. Nenhum preço, banco, disponibilidade de variantes ou pedido foi alterado nesta revisão. **Sem commit, push ou deploy novo.**
