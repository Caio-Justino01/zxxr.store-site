# Espera Desejos — v1 · 29/10/2026

Prévia local: **http://127.0.0.1:5277/**. Loja existente preservada na porta 5274. Não houve deploy, fechamento de rotas, migração, alteração de preço ou escrita em pedidos.

## Entrega

- Colagem das três fotos aprovadas, revelada por nove blocos; dissolução para o fundo animado existente; composição final com logo ZXXR, Desejos, selo Razz e relógio na boia.
- Boia e despertador gerados com imagegen, PNG com alfa preservado e WebPs responsivos. O visor original está vazio: os números vermelhos são SVGs de sete segmentos atualizados pela aplicação.
- Data provisória de 01/11/2026 às 00h de Brasília, configurável. Horas totais, sem reinício após 24 horas.
- Abertura única por sessão, pulo acessível pelo teclado e foco no título. Movimento reduzido elimina a colagem e a flutuação.
- Aplicação, build e servidor separados da loja. Apenas três scripts foram acrescentados ao `package.json`; os comandos existentes continuam iguais.

## Verificação

- 112 testes da suíte passaram na conferência, incluindo nove novos testes de contagem, resposta do servidor, transparência e isolamento da entrada da loja.
- `npm.cmd run check:launch`, `npm.cmd run build:launch` e `npm.cmd run build`: aprovados. A conferência final da loja também incluiu TypeScript.
- Build da prévia inspecionado: controles e endpoint de simulação `/__preview/launch` ausentes do JavaScript compilado; `/api/launch` presente.
- Navegador em 320×740, 390×844, 768×1024, 1024×768 e 1440×900: boia e visor inteiros, datas visíveis e largura do documento sem transbordamento horizontal. Medições em `previews/espera-desejos-v1/responsivo.json`.
- Montagem e colagem adaptada ao celular capturadas. Botão Pular apresentação acionado por Enter: foco no H1 e retirada do botão após conclusão. Recarregamento da mesma sessão mostrou diretamente a espera.
- Falha de imagem simulada: relógio permaneceu legível e contando no fallback, sem transbordamento. Arte e data restauradas depois do teste.
- Simulação local de movimento reduzido: sem colagem, sem flutuação e fundo estático; contagem permaneceu ativa. Nenhuma preferência do sistema operacional foi alterada. A preferência nativa é respeitada por GSAP e pelo componente de fundo reutilizado.
- Últimos 12 segundos com conexão indisponível: permaneceu na porta 5277 em `00:00:00`, com “Aguardando conexão para confirmar a abertura…”, sem liberar a loja.
- Últimos 12 segundos com servidor disponível: confirmou e navegou automaticamente para a loja local na porta 5274. Nenhuma ação comercial foi executada. A prévia foi restaurada para a data provisória após o teste.

## Estado do servidor e limites

O endpoint informativo de Pages Functions retorna horário do servidor, data e autorização. É desativado por padrão, exige fuso explícito e falha fechado em caso de data inválida. O contador usa tempo monotônico ancorado no servidor e pede confirmação ao chegar a zero. Testes cobrem viradas, adiamento, relógio local incorreto e retomada após suspensão.

**A loja pública permanece como estava.** Esta etapa não integra o bloqueio à vitrine, contas ou compras. A política de acesso e a ativação real ficam para depois da aprovação da tela e da data final. Habilitar o endpoint sozinho não fecha a loja.

## Uso e personalização

Consultar `launch-preview/README.md`. Coordenadas percentuais do visor, fotos e data ficam em `launch-preview/config.ts`; aparência dos dígitos e composição em `launch-preview/launch-preview.css`. Prompt e fonte PNG estão em `assets-originals/launch-v1/`. Nenhuma imagem de camiseta ou pessoa foi alterada.

Capturas principais: `desktop-1440.jpg`, `mobile-390.jpg`, `tela-768.jpg`, `colagem-desktop.jpg` e `colagem-mobile-390.jpg`, na pasta `previews/espera-desejos-v1/`.
