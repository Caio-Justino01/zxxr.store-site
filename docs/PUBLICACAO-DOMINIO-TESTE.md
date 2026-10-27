# ZXXR — publicação do domínio para testes

27/10/2026. O dono confirmou substituir a página pública anterior pela loja completa em modo de teste, para testar inclusive no celular. Nenhuma cobrança ou produção real foi habilitada.

## Endereço e hospedagem

- Endereço principal: **https://www.zxxr.store/**.
- `https://zxxr.store/` redireciona para o endereço principal com código 308, preservando caminho, parâmetros e método HTTP.
- Projeto Cloudflare Pages: `zxxr-store`, ambiente de publicação `main`, com Pages Functions e segredos no servidor.
- GitHub `main` e `codex/contas-pedidos` receberam o código validado. Os arquivos privados de ambiente e de contas fictícias não foram publicados.
- O registro do domínio continua na Hostinger. O DNS é administrado pela Cloudflare; os registros de `www` e da raiz são CNAME para `zxxr-store.pages.dev`, com proxy ativo.
- A Cloudflare confirmou **Active / SSL enabled** para `www.zxxr.store` e `zxxr.store` ao fim da conferência.

A regra de redirecionamento exclui `/.well-known/` e `/cdn-cgi/` para preservar os procedimentos de validação do certificado e os desafios de segurança. Isso segue a [orientação oficial da Cloudflare](https://developers.cloudflare.com/rules/reference/troubleshooting/).

## Login e segurança

- A origem do servidor e o Site URL do Supabase usam `https://www.zxxr.store`.
- O Supabase permite os callbacks `/api/auth/**` somente nas origens explicitamente configuradas: domínio, endereço técnico, prévia e localhost de desenvolvimento.
- O widget Turnstile existente passou a permitir os hostnames do domínio, preservando os anteriores. A proteção permanece ativa no Supabase.
- O e-mail de suporte pessoal no Google e o remetente de teste continuam somente sob a autorização temporária recebida para este ambiente de validação.
- O formulário agora apresenta falhas ou expiração da verificação, oferece repetição e renova o desafio após uma tentativa de login recusada. Não libera o formulário sem a validação exigida.

## Conferência executada

- HTTPS validado com o certificado ativo, sem ignorar erros de certificado.
- `/api/catalog`: 200, vinte variantes e `testMode=true`.
- `/api/auth/session`: 200, configuração reconhecida.
- `/api/admin/orders` sem login: 401.
- Início do Google: retorno 303 para o provedor com callback no domínio principal e cookies HttpOnly/Secure.
- Login real de uma conta fictícia pelo domínio; uma senha incorreta foi recusada e a tentativa seguinte conseguiu entrar. O histórico persistido foi carregado.
- Login Google da conta do dono retornou ao domínio correto e exigiu seu autenticador para acessar o painel.
- A área do cliente foi conferida em 1440 e 390 px sem rolagem horizontal. [Desktop](previews/contas-pedidos/dominio-conta-desktop.png) e [celular](previews/contas-pedidos/dominio-conta-mobile.png) mostram somente pedidos fictícios.
- Build e TypeScript passaram após as correções; os nove testes pertinentes de contratos, autorização básica, mensagens e CEP passaram. A validação anterior completa contém 71 testes aprovados.

Os resolvedores públicos do Google e da Cloudflare já retornaram o novo destino. Um resolvedor usado no computador de trabalho ainda devolvia o CNAME antigo durante a conferência, inclusive após limpar o cache local. Uma rede que conserve esse cache pode exibir a versão anterior até a propagação; isso não deve ser confundido com falha da nova API. A conferência no novo destino manteve a validação TLS e foi complementada pelo teste real no navegador, no próprio domínio.

## Antes de receber pedidos reais

O ambiente permanece de teste, incluindo o número de atendimento e os pedidos fictícios. Não alterar apenas um indicador para aceitar pedidos reais: confirmar contato definitivo, remetente do domínio, suporte público, condições comerciais e prazo, concluir os ensaios de e-mail restantes e preparar a separação dos dados de produção. Não inventar essas informações.
