# Validação — ZXXR Store v6

Inspeção local em 19/10/2026, Chromium embutido no Windows, http://127.0.0.1:5274/. Não houve publicação. O fundo ativo é procedural; as cinco camisetas continuam em imagens 2D originais.

## Código e preservação

TypeScript, build e 18 testes aprovados. Os cinco testes novos cobrem falha de compilação/link com backup waves, precisão limitada, descarte de recursos em falha, DPR/resolução real, contexto perdido e dispose repetido. A suíte mantém as verificações das imagens, zoom/pan e sacola; testes de GLB referem-se somente aos arquivos históricos.

O grafo ativo exige GradientBackdrop e bloqueia Three/R3F, Studio, GLBs, SkyBackdrop e as nuvens fotográficas v5. O navegador mostrou um único canvas decorativo na coleção e zero canvases no produto. Nenhuma fotografia clouds-v5 estava no DOM ativo. A camada ::after da hero tem content:none e background-image:none.

As dez vistas frente/costas conservaram os pixels, dimensões e estampas aprovados. Produto, armazenamento da sacola e rotas não foram alterados. Os ZIPs v4 e v5 mantêm seus tamanhos e datas anteriores; fontes/modelos, CSS v5 e a cópia work/hero-v5-preservada permanecem. Validação anterior preservada em VALIDACAO-v5.md.

## Aparência, movimento e navegação

- Computador CSS 1440×1120: cinco camisetas inteiras, um canvas mode=flow/state=running, largura do documento de 1419 px e nenhuma rolagem horizontal. Interface grafite e selo Razz preto; ausência da faixa inferior escura confirmada visualmente e pelo estilo computado.
- Tablet CSS 768×1024: duas peças inteiras; Spiritual Gangsta entre x37–361 e Rosa entre x387–710. Largura do documento de 747 px.
- Celular CSS 426×844: uma peça inteira, cinco seletores, documento de 406 px. Seleção da Rosa funcionou. Os controles mantêm foco e contraste sobre azul/branco.
- O pixelbuffer acompanhou os tamanhos de viewport e DPR informados pelo navegador. DPR abaixo dos limites no ambiente de teste; limites de 2 e 1,5 são verificados no código e pelo teste do renderer.
- Paleta exata #3A83F7/#8FCAFF/#F5FAFF, combinada sem preto ou vinheta. Contraste mínimo calculado do grafite #0B1628 sobre a paleta: 4,98:1. A regra anterior que reduzia a opacidade de outras legendas no hover foi retirada para preservar o contraste.
- Duas capturas desktop mostram a evolução do fundo com a composição das roupas estável. O efeito é gerado por fragment shader; a suavidade das formas não vem de uma foto de baixa resolução ampliada.
- Link Som deixou a hero em state=paused; voltar à coleção retomou running. Link Spotify mantém o artista correto. Entrada no produto por Enter funcionou após a transição; voltar pelo histórico reabriu a coleção.
- Produto Rosa: Costas e Detalhes mostraram back/170%; Restaurar visão respondeu. A sacola manteve Boca G e Spiritual Gangsta G, uma unidade de cada, após recarregar. Console da aplicação principal sem avisos ou erros na leitura final.

## Falhas e ciclo de vida

O harness local work/gradient-v6-qa.html importa o componente real sob React StrictMode. Somente preferências/falhas são instrumentadas no harness, que é excluído da entrega. Verificações por UI:

- Normal: 1 canvas, mode=flow, pendingRAF=1, um listener ativo de movimento reduzido após montagem dupla do StrictMode.
- Movimento reduzido simulado: state=static, pendingRAF=0; desativar retomou execução.
- WEBGL_lose_context real: state=context-lost, canvas oculto, fallback claro e pendingRAF=0. Restaurar pelo mesmo handle recuperou flow/running e pendingRAF=1, sem duplicar o loop.
- WebGL indisponível simulado: mode=css/state=fallback, canvas oculto, pendingRAF=0.
- Falha forçada de todos os shaders: mesmo fallback claro, sem RAF.
- Falha forçada somente do fluxo: waves compilou no WebGL real, executou com pendingRAF=1 e produziu pixel RGBA opaco. O renderer reserva flow a highp; waves atende precisão limitada.

A pausa por aba oculta foi revisada no ciclo visibilitychange; não houve teste em telefone físico, benchmark de GPU/fps ou mudança da preferência de acessibilidade do sistema operacional. A preferência reduzida foi simulada por MediaQueryList no harness. A aba auxiliar foi encerrada.

## Capturas e entrega

Capturas em previews/final-v6/: hero-desktop.png, hero-desktop-inicio.png (1440×1120) e hero-mobile.png (426×844). Diagnósticos JSON registram recuperação de contexto, waves e os dois casos de fallback. O build gera CSS 43,12 kB, aplicação 296,20 kB e animação 69,58 kB antes de gzip; não gera chunk Three/Studio.

O pacote versionado v6 inclui código, fontes, testes, modelos históricos e documentação. Não inclui node_modules, dist, work ou arquivos de ambiente. As imagens das camisetas continuam limitadas à resolução fornecida; o novo fundo não altera a qualidade das estampas. Pagamento, frete, estoque e pedidos reais permanecem fora do protótipo.

## Complemento — apresentação individual das cinco peças

Abaixo da hero, a seção #o-drop apresenta cinco artigos separados com nome, cor, fotos originais de frente/costas, breve explicação da estampa e CTA individual. O guia compacto passou a #como-funciona; música, hero animada e sacola continuam nas mesmas rotas.

Conferência visual em computador CSS1440×1120: cinco artigos e dez imagens com dimensões nativas carregadas; documento1419px sem overflow horizontal. Em celular CSS426×844: fotos acima dos textos e documento406px sem overflow. Todos os links apontam aos produtos correspondentes. Enter em Ver a peça Boca abriu /produto/boca; histórico voltou a #o-drop. Console sem avisos ou erros. Os18testes e TypeScript passaram; build atualizado aprovado. Não foram criados testes que apenas repetem o conteúdo estático.

Capturas: previews/pieces-presentation/pecas-desktop.png e pecas-mobile.png. As fotos e os arquivos da hero não foram modificados. O ZIP v6 permanece preservado; este complemento está salvo no código do workspace.
