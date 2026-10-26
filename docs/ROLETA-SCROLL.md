# Roleta e hero reversível — 25/10/2026

O plano estava incompleto na base encontrada. Esta revisão implementa a roleta em telas até 1099 px e dispositivos de toque, o recolhimento reversível pelo scroll em todas as larguras e remove “Rever abertura” e a prévia ampliada duplicada.

A roleta mantém uma peça central de 74vw, limitada a 480 px, com vizinhas menores. O gesto acompanha o deslocamento horizontal e encaixa uma peça por vez, com continuidade entre a quinta e a primeira. Gestos curtos e diagonais devolvem a peça à posição; a rolagem vertical permanece disponível. Setas, contador, foco, nome, cor, preço e acesso ao produto acompanham a seleção. A peça central é lembrada em memória entre rotas.

O ScrollTrigger usa os limites `top top` / `bottom top`, suavização de 0,35 segundo, sem pin nem espaço adicional. Abertura, scroll, roleta, balanço e saída usam camadas separadas. Ao rolar durante a introdução, ela termina por uma transição de 0,2 segundo e entrega o controle à posição atual do scroll. Ao subir, a apresentação retorna pelo mesmo caminho. Movimento reduzido mantém a hero estável e as trocas imediatas. A hero completamente recolhida fica fora da interação por `inert`.

O histórico restaura a posição anterior sem forçar o foco ao título. Âncoras têm prioridade. Somente efeitos desta hero são limpos ao desmontar. Cadastro, preços, sacola, imagens originais e cards inferiores foram preservados; nenhuma dependência foi adicionada.

## Validação

- Inspeção no navegador em larguras CSS de 320 a 2560 px, incluindo celular, tablet e desktop: sem overflow horizontal e sem o botão removido.
- Roleta: continuidade nos dois sentidos, seleção, acesso ao produto e retorno preservando peça e posição. Arraste com captura nativa de ponteiro verificado no navegador; arraste nativo de imagens/links foi desabilitado para não cancelar o gesto.
- Harness local `/work/roleta-scroll-qa/index.html`: scroll parcial, completo e reverso, bloqueio de interação, seleção preservada; cancelamento curto/diagonal, limite de uma peça, wrap, pointercancel e interrupção do snap sem salto. Cenário de movimento reduzido aprovado.
- `/work/roleta-scroll-qa/index.html?mode=storage-blocked&early=1`: rolagem aos 450 ms da introdução concluiu a abertura em 214 ms e sincronizou progresso 0,500, sem exigir um segundo evento de scroll.
- Testes unitários cobrem geometria, gestos, continuidade circular e conversão do arco à pilha. TypeScript e build também foram executados.

Gestos automatizados do harness usam eventos de ponteiro com captura simulada; o arraste adicional usa ponteiro nativo do navegador. Não houve teste em aparelho físico ou Safari iOS. Os harnesses são locais e não integram a entrada de produção.

Capturas reais: `previews/roleta-scroll-v8/celular.jpg`, `tablet.jpg` e `computador.jpg`. Base anterior preservada em `work/hero-antes-roleta-scroll-2026-10-25/`. O checkout de publicação foi sincronizado localmente; esta entrega não inclui commit, push ou deploy.
