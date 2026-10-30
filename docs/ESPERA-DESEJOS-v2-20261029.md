# Espera Desejos — v2 · 29/10/2026

Prévia local: **http://127.0.0.1:5277/**. Ativação pública desligada; a loja existente, o banco e os pedidos não foram alterados. Sem deploy.

## Revisão entregue

- Oito fotografias: quadra, praia, cadeiras, jardim, píer, Emoção na Mercedes, Spiritual na piscina e ZXXR na sinuca. Arquivos inteiros, sem recorte, distorção, zoom de preenchimento ou edição generativa das fotos.
- Mercedes: edição V3 enviada pelo usuário, SHA-256 `66974dc0f6afcdb76ac9880a200bd6c14d3c73fb70aa997da82f90e17f6144a6`. Todas as fontes e seus hashes estão em `assets-originals/launch-v2/SOURCES.json`.
- O mosaico combina retângulos conforme as proporções das oito imagens e o formato real da tela. Os encaixes são contíguos; eventuais respiros azuis ficam fora do mosaico. Fotos entram como blocos completos até 2,1 s, ficam montadas até 5,4 s e se dissolvem até 6,5 s. A espera termina de entrar em 7,2 s. Textos e botão de pular ficam na faixa azul superior.
- Nova arte gerada com imagegen: boia branca com relógio de aço escovado prata, tela preta e números não incorporados à fotografia. PNG com alfa preservado em `assets-originals/launch-v2/`, WebPs de 480, 900 e 1254 px em `public-store/media/launch-v2/`; prompt salvo junto do original.
- Visor com sete segmentos SVG vermelhos, apenas segmentos ativos, brilho discreto, sem pequenas legendas internas ou tonalidade vermelha no fundo.
- Deriva diagonal em área reservada entre cabeçalho e rodapé. Desaceleração e retorno contínuos nas bordas em cerca de 0,9 s; velocidade de referência de 22 px/s no computador e 12 px/s no celular; rotação máxima de 1,5°. Inclinação e imagem completa entram no cálculo dos limites.
- Pausa e retomada com transição de 0,5 s, mantendo a posição e a contagem. Dimensões menores reduzem primeiro o percurso; mudança de orientação recalcula os limites e preserva a posição relativa. Efeitos pausam fora de uso; movimento reduzido exibe a composição estática.

## Verificação

- Suíte completa: **118 testes aprovados**, incluindo **12 testes da prévia**. Cobrem horário do servidor, viradas, adiamento, autorização de abertura, transparência, oito fotos completas, mosaico sem sobreposição e continuidade/limites do movimento.
- TypeScript, build da prévia e build geral da loja aprovados. O JavaScript compilado da prévia não contém controles nem endpoint de simulação e não solicita a arte antiga da v1.
- Navegador: 320×740, 390×844, 768×1024, 1024×768, 1440×900, 2560×1080 e 320×568. Arte completa dentro da área de movimento, sem rolagem horizontal e sem colisão com os textos. Medições salvas em `previews/espera-desejos-v2/responsivo.json`.
- Capturas do mosaico em computador, tablet e celular: oito fotografias inteiras. Mudança de orientação durante a montagem manteve os oito blocos no campo visível.
- Pular apresentação pelo teclado concluiu a abertura e focou o título. A sessão usa chave v2, independente da apresentação anterior.
- Pausar movimento manteve posição e rotação, enquanto os segundos continuaram contando. Retomar preservou o ponto de partida.
- Simulação local de movimento reduzido: deriva estática, ausência de colagem e fundo estático; relógio ativo. Nenhuma preferência do sistema operacional foi alterada.
- Falha das imagens: oito alternativas visíveis na colagem e relógio funcional no fallback da boia. Pular permaneceu disponível. Arquivos foram restaurados após o teste.
- Últimos 12 segundos sem conexão: permaneceu na prévia em `00:00:00`, sem liberação e com mensagem de confirmação pendente. Com conexão, confirmou o estado no servidor e navegou para a loja local. Nenhuma ação comercial foi executada.
- Após os testes, data restaurada para **01/11/2026 às 00h de Brasília**, deriva retomada e tamanho do navegador restaurado. Nenhuma exceção JavaScript não capturada foi encontrada na inspeção final.

## Continuidade

A API e o sistema de contagem/liberação mantêm o contrato e as regras da v1. O endpoint é informativo e continua desativado por padrão fora da simulação. Esta revisão não integra nem ativa bloqueio de vitrine, contas, painel ou compras.

A v1 permanece em `work/antes-espera-v2-20261029/`, nas imagens `launch-v1` e no pacote `ZXXR-espera-desejos-v1-20261029.zip`. A documentação de uso atual está em `launch-preview/README.md`. O pacote v2 é complementar ao projeto existente, não uma autorização ou um pacote de publicação sobre a loja.

Capturas principais: `colagem-desktop-1440.jpg`, `colagem-tablet-768.jpg`, `colagem-mobile-390.jpg`, `relogio-desktop-1440.jpg` e `relogio-mobile-390.jpg`, em `previews/espera-desejos-v2/`.
