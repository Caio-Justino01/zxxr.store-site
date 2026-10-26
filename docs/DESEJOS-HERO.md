# Desejos — abertura da coleção

A hero apresenta as cinco camisetas originais em 2D, sem deformar tecido ou estampas, sobre o shader azul e branco existente. A seção inferior de cards de vidro, produtos, tamanhos, preço de R$ 100 e sacola continuam independentes da abertura.

## Sequência e controles

A abertura automática dura aproximadamente 3,4 segundos: fundo até 0,25 s; revelação por máscaras dos contornos aprovados de “New Drop ZXXR”, com uma única linha inferior; nome “Desejos”, assinatura Razz e informação de encomenda a partir de 1,05 s; pilha das camisetas a partir de 1,4 s; abertura do arco entre 1,95 e 3,4 s.

O arco é **∩**, com a camiseta central mais alta e as pontas mais baixas. As inclinações finais são −6°, −3°, 0°, 3° e 6°. As imagens completas preservam suas proporções. Na pilha inicial, as larguras nominais das imagens se sobrepõem em 35%.

- Computador: hover ou foco destaca uma camiseta e apresenta nome, cor, preço e acesso à peça na faixa inferior. Clique abre a página do produto.
- Toque e telas até 1099 px: as cinco camisetas permanecem no conjunto; tocar em uma abre uma ampliação central. “Explorar peça” abre o produto e “Voltar ao conjunto” restaura a apresentação. Escape também restaura a seleção.
- As setas esquerda/direita, Home e End percorrem as peças por teclado. A rolagem vertical continua livre.
- “Pular abertura” conclui a introdução. “Rever abertura” permite repeti-la deliberadamente.

A introdução é lembrada uma vez por sessão pela chave `zxxr-desejos-intro-v1`, com alternativa em memória quando o armazenamento está bloqueado. Voltar de produto ou sacola mostra o arco pronto; uma âncora inferior não obriga a assistir à introdução. Movimento reduzido apresenta diretamente o estado final e remove a repetição animada. A timeline pausa com a aba oculta ou a seção fora da tela. Se uma imagem falhar, tenta-se o outro lado da peça antes de apresentar uma alternativa textual.

## Construção

`getHeroLayout(width)` em `src/lib/hero-layout.ts` calcula posições dos centros das cinco imagens e a altura do palco. Para a imagem de proporção 923 × 700, o envelope horizontal rotacionado é `largura × (cos θ + 700/923 × sen θ)`. O cálculo usa a soma desses envelopes para manter inclusive as caixas completas das imagens dentro da área disponível. O espaço entre envelopes é de 4 px abaixo de 1024 px e 12 px a partir dessa largura; cada imagem tem no máximo 300 px de largura.

Os deslocamentos verticais formam uma parábola simétrica, com centro em zero e profundidade máxima de 48% da largura da imagem. A origem vertical fica em `(stageHeight - arcDepth) / 2`. Wrappers separados controlam posição no arco, destaque e transição de saída. As máscaras animam a revelação do lettering, preservando os caminhos vetoriais aprovados.

O cadastro `Product`, as rotas e a chave `zxxr-drop-01-bag-v1` permanecem os mesmos. O nome Desejos foi aplicado à hero e aos metadados da página inicial. Não há nova dependência de renderização ou modelo 3D na experiência ativa.

## Validação e referências locais

Foram verificados nesta entrega a hero, acesso ao produto e retorno pelo histórico, seleção ampliada por toque em 320 px e tablet em 768 px, fidelidade das imagens, TypeScript e build. Os 28 testes do projeto de trabalho passam, incluindo cinco testes de geometria para limites entre 320 e 2560 px, simetria, espaçamento, pilha e medidas inválidas. No checkout de publicação local, os 24 testes aplicáveis, TypeScript e build também passaram após a sincronização desta alteração. As verificações de imagem e grafo ativo continuam cobrindo os recortes aprovados e a ausência de modelos 3D no carregamento.

A versão anterior foi preservada em `work/hero-antes-desejos-v6/`, relativo à raiz deste projeto. O harness `work/desejos-qa/` é exclusivo da validação local e não integra a entrada de produção. Ele permite inspecionar quadros reais da timeline e simular movimento reduzido, bloqueio de sessionStorage e falha das imagens sem alterar o cadastro publicado.

Com o servidor local na porta 5274, exemplos do harness:

- `/work/desejos-qa/index.html?frame=stack`: pausa a timeline real na pilha, em 1,94 s.
- `/work/desejos-qa/index.html?frame=background`: inspeciona o início com fundo.
- `/work/desejos-qa/index.html?mode=reduced`: preferência de movimento reduzido.
- `/work/desejos-qa/index.html?mode=storage-blocked`: alternativa em memória.
- `/work/desejos-qa/index.html?mode=images-fail`: falha deliberada das duas vistas da Boca.

Na revisão final também foram conferidos Escape com devolução do foco, Pular abertura sem sessionStorage, repetição deliberada, redimensionamento durante a introdução, falha das duas imagens com acesso ao produto e troca da preferência de movimento. O harness simula essas condições de falha; os testes não substituem validação em um aparelho físico.

O build compilado do checkout de publicação foi inspecionado em http://127.0.0.1:4174/: cinco imagens carregadas, nenhum overflow, título e âncoras funcionando, cinco cards com blur de 24 px preservado e console sem erros ou avisos. A sacola existente da prévia principal continuou com seus dois itens, sem alterações de quantidade.

Capturas em `previews/desejos-v7/`: `01-pilha.jpg` mostra a timeline real pausada em 1,94 s; `02-arco-aberto.jpg` mostra o estado final; `03-selecao-celular.jpg` mostra a Boca ampliada em aproximadamente 390 px; `04-build-producao.jpg` registra o build compilado. O recorte das capturas do harness remove somente sua barra de testes.

Esta alteração foi preparada localmente; não constitui um novo commit, push ou deploy.

## Ajuste v7.1

A hero passou a alternar as cores: Boca, Spiritual Gangsta, Flores, ZXXR Rosa e Me preservando. Essa ordem é exclusiva da apresentação; o cadastro e os cards inferiores conservam sua sequência. Os índices de seleção, ampliação e acesso ao produto seguem a lista da hero.

“Created by Razz” foi aproximado de “Desejos” e alinhado à sua base, com o selo em proporção menor para formar uma assinatura contínua. Captura atualizada em `previews/desejos-v7.1/hero-intercalada.jpg`; as imagens da pasta v7 registram a composição anterior.

## Balanço suspenso — 22/10/2026

O hover das cinco camisetas usa uma camada interna `.dh-swing`, com origem em 50% / 8%, próxima à gola. A posição no arco e a transição de saída continuam em camadas independentes. `useSuspendedHover` controla uma única sequência por peça: inclinação de até 3°, retorno oposto de 1,3°, última oscilação de 0,5° e acomodação em 2,3 s. O deslocamento fica limitado a 5 px lateralmente, 4 px para cima e escala uniforme de 1,015. A direção depende do lado de entrada do cursor.

Sair da peça amortiza o movimento em 0,8 s, partindo da transformação atual. Trocas rápidas não reiniciam a pose anterior; o clique congela o balanço antes da animação externa de saída. Repetir a abertura, redimensionar ou alterar a preferência de movimento limpa as transformações. Teclado mantém destaque estável, toque conserva a seleção ampliada e movimento reduzido não oscila.

O harness local `/work/suspended-hover-qa/index.html` exercita os handlers reais de pointer e mede as transformações renderizadas: entrada pela esquerda/direita, limites, acomodação, saída sem salto, troca rápida e foco. O parâmetro `?mode=reduced` verifica a apresentação estática. Há um botão para abrir a Boca durante a oscilação. O harness não faz parte do build de produção. A base anterior foi preservada em `work/hero-antes-balanco-2026-10-22/`.

Validação concluída: os dois cenários do harness passaram; a Boca abriu durante o balanço. Na prévia principal, seleção de Spiritual Gangsta por toque em 346 px manteve as cinco camadas internas sem transformação e sem overflow. Repetir a abertura e redimensionar durante sua execução terminou com cinco imagens neutras e arco pronto. Console sem avisos ou erros. Os 28 testes, TypeScript e build do projeto de trabalho e os 24 testes, TypeScript e build do checkout de publicação passaram. Captura em `previews/balanco-suspenso/hero.jpg`. Alteração local, sem novo commit, push ou deploy.
