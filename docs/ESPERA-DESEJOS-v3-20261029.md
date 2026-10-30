# Espera Desejos — v3 · 29/10/2026

Prévia independente: **http://127.0.0.1:5277/**. Sem publicação ou bloqueio da loja. Data provisória: **01/11/2026 às 00h de Brasília**. Ativação pública permanece desligada.

## Alterações

- Boia ancorada no centro da área entre identidade e data, com flutuação de barco: até 2 px lateralmente, 4 px verticalmente e 0,6° de inclinação. Arte metálica, visor personalizável e oito fotografias da v2 preservados.
- Após dez segundos sem interação, identidade e controles desaparecem em 0,35 s; ficam inativos, sem acesso acidental pelo teclado. O contador continua funcionando.
- Modo DVD percorre a tela visível. Sorteio por grupos de quatro cantos, incluindo diagonais e evitando retorno imediato ao canto anterior. Cada trecho tem velocidade própria: 30–45 px/s no computador, 18–24 px/s abaixo de 700 px. Aceleração/desaceleração em 0,45 s por extremidade, inclinação máxima de 1,5° e margens que incluem a rotação.
- Movimento real do cursor, clique, toque, teclado e rolagem reiniciam a inatividade. A boia retorna da posição atual ao centro em 0,8 s; textos reaparecem nos 0,25 s seguintes. Não repete a colagem. Teclado restaura foco visível.
- Pausa manual impede o DVD. Movimento reduzido mantém a composição estática, sem DVD. Ao ocultar a aba, efeitos e temporizador de inatividade são suspensos; retornar restaura a apresentação normal e reinicia os dez segundos. A liberação confirmada tem prioridade sobre o DVD.
- Colagem: oito imagens inteiras, montagem até 2,1 s e leitura até 5,4 s. A dissolução e a entrada da espera começam juntas aos 5,4 s, terminando perto de 6 s. Chave de sessão própria da v3 e botão de pular preservado.
- A API, o relógio do servidor, confirmação de acesso, reconexão e controles exclusivos de desenvolvimento mantêm seus contratos. Nenhuma nova dependência.

## Verificação realizada

- **124 testes da suíte completa aprovados.** Após o último ajuste interno, os **17 testes da prévia** foram executados novamente e passaram. Incluem prazo, relógio monotônico, liberação restrita, oito imagens, proporções, transparência, envelopes do movimento, quatro cantos, ausência de retorno imediato e velocidades contínuas nas extremidades.
- TypeScript, build da prévia e build geral aprovados. O build separado não inclui os controles nem o endpoint de simulações.
- Navegador: 320×568, 320×740, 390×844, 768×1024, 1024×768, 1440×900 e 2560×1080. Sem rolagem horizontal; boia completa, visor legível e informações preservadas. Medições em `previews/espera-desejos-v3/responsivo.json`.
- Limite real de inatividade: aos 9 s a composição permanecia normal; aos 10,5 s estava no DVD, com identidade inativa e foco fora dos controles ocultos.
- Pausa manual manteve posição por mais de 30 s, impedindo DVD e mantendo contagem. Movimento reduzido ficou estático por mais de 40 s, sem colagem, canvas ou DVD.
- Percurso móvel: amostras em 320×568 permaneceram dentro do viewport, incluindo proximidade das bordas superior e inferior. Dados em `dvd-percurso-320.json`. Os testes matemáticos verificam tours completos dos quatro cantos em 80 sementes, por 20 ciclos cada.
- Retorno por teclado e clique partiu da posição atual, passou pelo estado de retorno e terminou centralizado, com textos e controles acessíveis. Pular a apresentação pelo teclado focou o título.
- A transição da colagem terminou em cerca de **6,1 s reais**. Durante a dissolução, a boia já estava visível, assim como a identidade; as oito fotos permaneciam carregadas e sem recorte.
- Liberação durante DVD: na simulação de 12 s, a boia estava em DVD quando restavam 2 s; a confirmação do servidor iniciou o retorno e a navegação para `http://127.0.0.1:5274/`. A data original foi restaurada em seguida. Nenhuma ação comercial executada.
- Sem exceções JavaScript não capturadas na inspeção final.
- A interface automatizada mantém os documentos de teste como visíveis, mesmo ao abrir outra aba da prévia. O ciclo real de aba oculta e eventos nativos de toque não foram reproduzidos neste navegador; as condições de visibilidade estão cobertas pelo teste de elegibilidade e os respectivos listeners foram revisados no código.

## Arquivos e preservação

Código de movimento: `launch-preview/idle-motion.ts`, `use-launch-idle.ts` e `use-float-drift.ts`. Apresentação, foco, identidade e transição: `LaunchPreview.tsx` e `launch-preview.css`. Configuração de sessão: `config.ts`. Instruções em `launch-preview/README.md`.

A v2 está preservada em `work/antes-espera-v3-20261029/` e em `entrega/ZXXR-espera-desejos-v2-20261029.zip`. As oito fotos, o PNG original, WebPs, prompt e fontes continuam em `launch-v2` sem alteração. O pacote v3 é complementar ao projeto existente, não um pacote para publicar sobre a loja.

Capturas: `colagem-desktop-1440.jpg`, `colagem-mobile-390.jpg`, `normal-desktop-1440.jpg`, `normal-mobile-390.jpg`, `dvd-desktop-1440.jpg` e `dvd-mobile-390.jpg`, em `previews/espera-desejos-v3/`.
