# Integração para publicação — 30/10/2026

Base preservada: `bb9685a`, revisão do favicon mascote já publicada. Branch: `codex/analytics-oficial-20261030`.

A integração traz o código atual da loja, gelo vertical v8/v11 aprovado, carrossel e animações atuais, Analytics, consentimento, recuperação autorizada, SEO pré-renderizado, funções de servidor, testes e migrações. A espera conserva a lógica e as fotografias de produção, incluindo o favicon aprovado e a abertura de 31/10/2026 às 00h de Brasília.

A fotografia Emoção Mercedes `07-v3` é mantida, corrigindo a referência `07-v2` que permanecia no workspace local. Não se regenera nem altera a imagem aprovada.

Não foram copiados `.env.local`, `.dev.vars`, tokens, `.wrangler`, `node_modules`, fixtures `work`, previews, relatórios Lighthouse binários, backups, pacotes de entrega ou modelos Blender. As dependências podem ser instaladas pelo lockfile. A demonstração com dados fictícios continua exclusiva do desenvolvimento e não entra no build de produção.

Os seis GLBs legados são somente dados de arquivo e ficam fora desta publicação 2D. Para executar a validação histórica desses arquivos no workspace atual, `public/models` é uma junction local ignorada, apontando aos originais preservados. Uma nova clonagem pode executar os demais testes sem esses modelos; a validação de que nenhum modelo 3D é carregado na experiência ativa permanece obrigatória.

As fontes PNG da matriz v8 e as máscaras v11 foram preservadas sem otimização destrutiva. O build usa as versões WebP responsivas atuais. Renders antigos inativos de gelo não foram adicionados à release; as cópias locais ficaram preservadas em `work/arquivos-nao-publicados`.

Validação local: 184 testes passaram, TypeScript do site e da espera passou, build com pré-renderização passou e o Worker de Functions compilou. Após acrescentar RLS à tabela privada de manutenção, os 14 testes de Analytics foram repetidos e passaram. O build foi produzido com `VITE_PREORDER_MODE=live`; a configuração operacional do servidor permanece uma responsabilidade do ambiente publicado.

O commit local desta integração não aplica migração nem publica. A ativação e a conferência do banco e domínio serão executadas pela tarefa principal. Nenhum segredo, fixture de demonstração, GLB legado ou backup foi incluído no commit; não houve envio para o Git nem implantação nesta preparação.

Revisão antes da publicação: rotas privadas carregam `store-shell.html` também antes do horário de abertura, evitando hidratar o HTML público da coleção numa rota de login ou painel. O HTML mantém canonical próprio e `noindex`; o acesso continua dependendo da conta e do MFA. Os 23 testes focados de SEO/gate/contador passaram, assim como novo build live e compilação das Functions. Um servidor Pages isolado, sem banco, confirmou GET e HEAD das três rotas de conta/painel, enquanto inicial, produto e URL desconhecida continuaram na espera e o catálogo permaneceu bloqueado com `launch_pending`.
