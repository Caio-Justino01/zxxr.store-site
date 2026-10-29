# Desejos — espera pública v4

Aprovada para o site oficial em 29/10/2026. Abertura em **31/10/2026 às 00h de Brasília** (`2026-10-31T03:00:00Z`).

- Mosaico com as oito fotografias aprovadas, preenchendo as quatro bordas da tela. Os arquivos não são deformados; `object-fit: cover` permite cortes periféricos mínimos para preencher cada célula.
- Abertura a cada recarregamento. Não consulta nem grava uma chave de sessão. Movimento reduzido vai diretamente ao relógio.
- Espera preserva boia, relógio digital, fundo azul/branco, identidade Desejos/Razz e modo de inatividade. Retirados o cabeçalho do mosaico e as legendas auxiliares. Controle de movimento discreto e opção de pular acessível por teclado.
- Ferramentas de simulação são eliminadas no build. Nenhum cenário de teste é ativado em produção.
- `espera.html` é uma entrada independente do build Vite. O middleware serve essa entrada nas rotas públicas antes da data, com `Cache-Control: private, no-store`.
- `GET /api/launch` usa o relógio do servidor, sem cache. A contagem é ancorada em tempo monotônico e confirma novamente o acesso ao chegar a zero.
- O middleware bloqueia catálogo e novos pedidos antes da data; mantém contas, histórico, autenticação, painel, ajuda e privacidade. A verificação na entrada React cobre navegação interna a partir dessas páginas.
- Na data, as mesmas rotas passam a servir a loja automaticamente, sem outro deploy. O cliente troca de tela após confirmação do servidor.
- Configuração central: `launch-preview/config.ts`; `LAUNCH_OPENS_AT` é uma substituição opcional. `LAUNCH_GATE_ENABLED=false` é uma desativação explícita; não foi aplicada.

## Validação

104 testes aprovados, TypeScript e build. Testes reais com Pages Functions em `5280`, com a data aprovada; instância separada em `5281` com data de teste confirmou a transição para a loja. Nenhuma credencial do comércio foi copiada para essas instâncias.

## Publicação e preservação

Checkout isolado a partir da versão de produção `a6e7621`. Não inclui mudanças de catálogo, banco, pedidos, preços ou o gelo em revisão. Fotos WebP e arte da boia foram reutilizadas sem alterações. O checkout original e as prévias 5274/5277 foram preservados.

Build: `npm.cmd run build`. Prévia com middleware: `node_modules/.bin/wrangler.cmd pages dev dist --port 5280`.
