# ZXXR — gelo fotográfico e carrossel contínuo v6
Data: 29/10/2026. Prévia local: http://127.0.0.1:5274/. Sem publicação.

## Resultado visual
Flores, Yaji e ZXXR usam novos renders com camiseta menor dentro de um bloco horizontal espesso. As bordas têm grandes superfícies translúcidas e menos bolhas/rachaduras. A inscrição “Em breve” foi incorporada às imagens como riscos na face frontal; não há texto HTML simulando gravação.

A revisão final incorporou o comentário do usuário durante a execução: manter o contorno aprovado de Flores e acrescentar uma camada de gelo na frente do tecido. As estampas ficam difusas por essa camada, enquanto o contorno e a incisão permanecem definidos. Não há película azul ou filtro CSS de desaturação.

Amostra de Flores conferida no contexto da hero antes de produzir Yaji e ZXXR. Conferência visual: três flores e assinatura na frente de Flores; frase nos ombros de Yaji; quatro símbolos em diagonal na região inferior esquerda da ZXXR. Emoção e Spiritual permanecem com os recortes originais.

## Arquivos
- PNGs selecionados: assets-originals/ice-v6/{flores,yaji,zxxr}-ice-v6.png, 1448 × 1086, com alpha.
- WebPs: public-store/media/ice-v6/, larguras 640/1024/1440, qualidade 94 e alpha 100.
- Rascunhos claros preservados em assets-originals/ice-v6/clear-drafts/.
- Prompts e referências: docs/GELO-v6-PROMPTS.json. Ferramenta usada: imagegen integrada, modo de edição.
- O script scripts/prepare-ice-v6.mjs apenas copia o PNG gerado e codifica versões menores; não redesenha a arte.
- Pacote: entrega/gelo-fotografico-v6-20261029/, incluindo PNGs, WebPs, comparacao.html, renders anteriores e capturas.

Os renders são visualizações geradas a partir dos mockups. A difusão frontal é intencional; as imagens de referência comerciais e as estampas originais permanecem preservadas.

## Movimento
- Mola analítica criticamente amortecida, frequência 12, integrada pelo ticker GSAP.
- Novos comandos preservam posição e velocidade; removido o reinício fixo de 0,7 s.
- Trajetórias cúbicas C1, sem degraus de posição/velocidade/rotação entre centro e laterais.
- Link e subárvore visual estáveis por produto: a imagem não remonta quando muda de prévia para central.
- Setters em cache; cursor e arraste atualizados uma vez por quadro.
- Efeitos do gelo ficam ocultos e com a animação pausada durante a troca e fora de uso.
- Retorno do hover suave, propriedades scaleX/scaleY compatíveis com quickTo e sem aviso no console.
- Gesto vertical rejeitado também suprime o clique posterior, evitando abrir produto sem intenção.
- Movimento reduzido não reutiliza o objeto de parâmetros mutável do GSAP; validado também na remontagem de efeitos do StrictMode.
- Duas peças a partir de 768 px, uma abaixo disso, uma posição por gesto, sequência circular e abertura Emoção + Spiritual mantidas.

## Verificação
- Fonte: 112 testes aprovados. Checkout de publicação: 99 testes aprovados.
- TypeScript, build e git diff --check aprovados.
- Testes específicos: continuidade angular/de velocidade, simulação de 30–144 Hz, retarget/reversão, convergência sem rebote e movimento reduzido.
- Browser: comandos rápidos, loop, teclado/foco, arraste horizontal e rejeição de gesto vertical, rota da ZXXR congelada e retorno ao mesmo produto, scroll reversível e seleção entre larguras.
- 320, 390, 768, 1024, 1440 e 2560 px: sem rolagem horizontal; informações inteiras e balões alinhados, incluindo Spiritual Gangsta em 320 px. Evidência: previews/gelo-fotografico-v6/responsivo.json.
- Cadência medida em harness local isolado com shader ativo, imagens finais e comandos reais de UI programados: mediana 10 ms e p95 10,1 ms nas larguras 1440 e 390; nenhuma lacuna acima de 33,4 ms nem long task durante as amostras. Mesmas imagens no DOM após as trocas; efeitos do gelo inativos enquanto o carrossel se move.
- Essas amostras medem cadência do requestAnimationFrame no Chromium controlado desta sessão, não garantem FPS de GPU em outros aparelhos. Capturas e medições não substituem teste em aparelhos físicos/Safari.
- Console da prévia normal final sem warnings/errors observados. No harness reduzido, a biblioteca Motion informa que as animações estão desativadas; não houve novo erro após corrigir a inicialização.
- Falhas/movimento reduzido usam harness com catálogo e sacola em memória, sem alterar a sacola real.

## Preservação
Comparação do cadastro antes/depois, excluindo frozenImage, confirmou igualdade dos cinco produtos: disponibilidade, nomes, preços, materiais, tamanhos, fontes e imagens originais não mudaram. Sem alteração em banco, pedidos, APIs, dependências ou chave da sacola. A sacola real permaneceu com dois itens.

Backup da revisão anterior em work/antes-gelo-fotografico-v6-20261029/. Os renders v3/v4 e o pacote v5 foram preservados. O checkout work/publish-zxxr-store recebeu os arquivos desta revisão, mantendo suas demais alterações preexistentes. Sem commit, push ou deploy.

A API comercial do Vite local não está conectada; testes comerciais foram executados no ambiente isolado existente. Não há alegação de mudança em produção.
