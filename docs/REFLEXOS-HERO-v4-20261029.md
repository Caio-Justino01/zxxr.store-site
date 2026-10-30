# ZXXR — hero e gelo v4 · 29/10/2026

Prévia local: http://127.0.0.1:5274/ (`npm.cmd run dev`, em `zxxr-store`). Revisão local, sem deploy, alterações de preço, banco ou pedidos.

## Imagem escolhida

O imagegen integrado produziu três tentativas de posicionamento. O usuário escolheu explicitamente a segunda, anexada como `codex-clipboard-c663306e-384e-44ee-8669-e5ef0846cfaa.png`. Essa escolha prevalece sobre a proposta inicial de margens aproximadas de 5%.

PNG selecionado: `entrega/gelo-reflexos-v4-20261029/zxxr-back-ice-v4.png`, na raiz do workspace. É cópia integral de `exec-c2b6ec8a-3bfd-4782-a6cd-86338a85a21d.png`, sem manipulação posterior; SHA256 `D3341A7CDD5AB93F90CC24E098EB29A5EF784099FB06BAC3B405117B68EF8C43`. Dimensões 1445 × 1088, alpha preservado.

A estampa está deslocada para a região inferior esquerda. Letras, contorno branco e diagonal permanecem visualmente reconhecíveis, sem duplicação ou marcação vermelha. A edição é generativa, não uma translação pixel a pixel; a versão final foi a imagem escolhida pelo usuário. PNG anterior e recortes originais permanecem preservados.

WebPs com transparência em `public-store/media/ice-v4/zxxr-back-approved-{640,1024,1440}.webp`, qualidade 93 e alpha 100. O maior mede 1440 × 1084. `Product.frozenImage` compartilha essa referência com hero, roleta, páginas, recomendações, suporte e sacola antiga. Flores e Yaji conservam os renders v3. Prompts e manifesto completos acompanham os arquivos da entrega.

## Composição e efeitos

- Emoção e Spiritual Gangsta formam a dupla central maior. Flores e Yaji ficam menores em diagonal à esquerda; ZXXR equilibra a direita. As disponíveis não são cobertas pelos gelos.
- A roleta começa em Emoção e segue a ordem circular Flores, Yaji, Emoção, Spiritual Gangsta, ZXXR. Lembra a seleção ao retornar de produto.
- O layout agora inclui escala por posição. A abertura usa uma pilha compacta e o scroll converte deslocamentos e escala para as coordenadas locais corretas dos wrappers, sem disputar o balanço das camisetas.
- Reflexos recortados pelo alpha do render seguem o cursor com amortecimento; inclinação máxima de 2°. O conjunto é composto em um plano isolado para evitar falhas de pintura ao combinar máscara, brilho e perspectiva.
- Até 12 partículas discretas por bloco no computador e 5 na apresentação de toque, restritas à periferia, com névoa leve. O gelo selecionado recebe uma passagem curta de luz.
- IntersectionObserver, ResizeObserver e visibilidade da aba controlam a atividade. Movimento reduzido desativa movimento e partículas; miniaturas da sacola e suporte não criam a camada decorativa. Os efeitos não interceptam gestos ou cliques.
- Futuras continuam com apenas nome e “Em breve”; cabeçalho, navegação e rodapé permanecem disponíveis.

## Verificação

- Source: 94 testes aprovados, TypeScript e build concluídos. Checkout de publicação: 90 testes aprovados, TypeScript e build concluídos. `git diff --check` sem erros.
- Testes de geometria verificam peças completas, dupla central simétrica, escala maior das disponíveis e gelos nas laterais, incluindo abertura e transformação reversível para a pilha.
- Inspeção no navegador em 320, 390, 768, 1024, 1440 e 2560 px: sem rolagem horizontal e peça central inteira.
- Arraste horizontal, troca circular da quinta para a primeira, abrir ZXXR, retornar com a mesma seleção, navegar pelo teclado e scroll de ida e volta conferidos.
- Interação real de ponteiro confirmou reflexo e inclinação; movimento reduzido conferido em harness isolado. Miniaturas sem partículas verificadas na sacola de teste; a sacola real de dois itens foi preservada.
- Capturas em `previews/reflexos-v4/`: hero desktop, mobile, tablet e página de ZXXR com reflexo. Viewport temporário restaurado ao final.

Validação feita no navegador desktop redimensionado; não equivale a teste em aparelho físico ou Safari. A API comercial do Vite continua com a limitação local pré-existente; não foram criados pedidos para essa revisão.

## Preservação

Backup anterior em `work/antes-reflexos-v4-20261029/`. Derivadas intermediárias preservadas fora da pasta pública, em `work/intermediarios-ice-v4/`. Mudanças e três WebPs selecionados sincronizados com `work/publish-zxxr-store/`, sem sobrescrever configuração ou credenciais. Nenhum commit, push, migração ou deploy nesta entrega.
