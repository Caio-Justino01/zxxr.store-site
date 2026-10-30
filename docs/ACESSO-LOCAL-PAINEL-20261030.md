# Acesso local ao painel — 30/10/2026

## Causa e correção

O comando `npm run dev` iniciava somente a interface Vite. As chamadas `/api/auth/session` e `/api/admin/analytics` recebiam HTML da loja, em vez de JSON, e a interface interpretava a API como não configurada.

A ponte `server/dev-api.ts`, ativa somente no desenvolvimento, passa a usar os mesmos handlers de contas do servidor. Ela carrega os campos permitidos de `.dev.vars` exclusivamente no processo Node, sem enviá-los ao navegador. Não há conta administrativa simulada na rota real, e as verificações de proprietário e MFA permanecem intactas.

## Como abrir

1. Executar `npm.cmd run dev` na pasta `zxxr-store`.
2. Abrir <http://127.0.0.1:5274/painel/pedidos> para a administração real.
3. Entrar com a conta existente de proprietário e concluir a verificação no autenticador. Senhas e códigos são preenchidos pelo próprio usuário; não são necessários no chat.

A prévia aceita apenas conexões loopback e preserva os cookies HttpOnly e SameSite da autenticação. O endereço de retorno de login é o localhost; provedores externos ainda dependem de esse retorno estar autorizado no serviço de autenticação. Nenhuma lista de retorno remoto foi alterada.

Esta ponte é de consulta: alterações de pedidos, catálogo, perfis e contatos são recusadas antes de chegar ao banco. As rotas de autenticação continuam disponíveis. O gate é desativado somente nesta prévia de desenvolvimento, sem alterar a data do domínio oficial.

## Analytics: demonstração e dados reais

- Demonstração navegável: <http://127.0.0.1:5274/work/analytics-seo-qa/index.html?view=panel>.
- Rota administrativa dos relatórios: `/painel/analytics`, exclusiva do proprietário com MFA.
- A demonstração usa o componente real de relatórios, com respostas fictícias interceptadas e identificadas permanentemente. Não lê visitantes, pedidos ou contatos reais e não envia mensagens.
- A coleta real continua restrita ao domínio oficial, após autorização de cookies. O localhost não registra visitas de produção nem contorna a restrição dos endpoints de Analytics.
- A ativação integrada continua dependendo da migração `202610290002_analytics_recovery.sql`, da publicação dos handlers e da validação autenticada no domínio oficial. Essa ativação não foi executada nesta correção local.

Os arquivos do gelo e as animações da loja não foram alterados. O estado anterior dos arquivos ajustados ficou preservado em `work/antes-acesso-painel-20261030/`.

## Conferência nesta correção

- `176` testes passaram, incluindo 12 casos da ponte local, preservação de cookies, CSRF, limites e bloqueio das mutações.
- TypeScript e build de produção passaram; as oito páginas públicas e o 404 foram pré-renderizados.
- `/api/auth/session` passou de HTML para JSON com `configured:true`. Login por e-mail e Google estão habilitados na configuração local existente.
- A configuração local existente usa `STORE_MODE=test`; não foi substituída pela configuração de produção.
- A sessão já aberta no navegador foi reconhecida, mas não tinha permissão de proprietário nesse ambiente. Nenhum papel ou permissão foi alterado. O login com a conta correta e a verificação MFA dependem do próprio usuário e não foram apresentados como concluídos.
- Uma chamada anônima a `/api/admin/orders` recebeu `401 auth_required`. `/api/admin/analytics` mantém `503 analytics_unavailable` no localhost, conforme a restrição de ambiente da coleta. A demonstração de relatórios tem URL e sinalização próprias.
- Fontes do servidor e Functions receberam `403` por HTTP, enquanto os handlers continuaram carregando internamente no Vite.

Não houve migração, publicação, criação de pedido, alteração comercial ou envio de contato.
