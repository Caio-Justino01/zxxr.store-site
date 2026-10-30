# Validação — Analytics, SEO e cookies

Implementação local iniciada em 29/10/2026 e conferida na virada para 30/10, horário de Brasília. Sem publicação, mudança de banco remoto, mensagens ou pedidos reais.

## Resultado dos testes

- 164 testes passaram, incluindo 14 do novo backend analítico/recuperação, contratos de consentimento, máscaras e comércio existentes. Após o acabamento final dos metadados, foram repetidos e passaram mais 29 testes focados em SEO, backend e consentimento.
- TypeScript do site, TypeScript da espera e build com pré-renderização passaram.
- Auditoria npm de dependências de produção e desenvolvimento: nenhuma vulnerabilidade conhecida apontada nesta execução.
- 16 respostas HTTP conferidas no build isolado: HTML público real, ausência de streaming incompleto, canonical, 404, shell privado, sitemap XML e noindex das imagens originais futuras.
- Backend do ambiente de medição deliberadamente desconectado: `/api/auth/session` retorna configured=false. Gate desligado somente nesse ambiente local para permitir medir a loja antes de 31/10.

## Lighthouse: 30 medições

Chrome headless em perfis separados, Lighthouse 13.6.0, cinco execuções sequenciais por combinação de página/dispositivo. Valores abaixo são medianas, não promessas de resultado em outros dispositivos ou no domínio publicado.

| Página | Perfil | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Inicial | Móvel simulado | 46 | 97 | 96 | 69 | 16,93 s | 1529 ms | 0,0054 |
| Inicial | Computador | 56 | 97 | 96 | 69 | 3,80 s | 542 ms | 0,00024 |
| Emoção | Móvel simulado | 73 | 100 | 96 | 69 | 10,63 s | 85 ms | 0,00028 |
| Emoção | Computador | 88 | 100 | 96 | 69 | 2,32 s | 0 ms | 0,00023 |
| Spiritual Gangsta | Móvel simulado | 74 | 100 | 96 | 69 | 11,53 s | 104 ms | 0,00041 |
| Spiritual Gangsta | Computador | 86 | 100 | 96 | 69 | 2,63 s | 0 ms | 0,00023 |

**A meta de 100 em tudo não foi atingida.** As animações, sua duração e os efeitos foram preservados conforme a decisão do projeto. As medições mostram custo de execução/renderização e carregamento, especialmente na inicial. Não foi feita remoção seletiva de efeitos para o Lighthouse.

SEO 69 tem como única auditoria reprovada `is-crawlable`: o host local/preview tem X-Robots-Tag noindex e robots que bloqueiam indexação de teste. Boas práticas 96 tem como única reprovação os erros de rede do `/api/catalog`, que responde 503 nesse ambiente sem banco. Esses controles não foram desligados para inflar notas. O comportamento de indexação do domínio oficial após a abertura é validado pelos testes de middleware e ainda precisa de publicação/medição remota.

Acessibilidade 97 na inicial decorre do contraste de passos com transparência no guia animado. As duas páginas de produto chegaram a 100 depois de corrigir o contraste de legendas e nomes acessíveis dos botões. O usuário escolheu manter as animações; não se removeu a leitura guiada para alterar essa nota.

Os relatórios estão em `previews/analytics-seo-20261029/lighthouse-release/`, com HTML, JSON e `summary.json`. Séries de diagnóstico anteriores ficam preservadas em outras pastas e não entram na tabela. O hash SHA-256 do HTML inicial auditado é `3a69238c0cf23b502876922dad746239e1e436e28b9428b2903363084f9c2f77`. O acabamento posterior de metadados mantém ofertas verificadas também na navegação React e identifica Razz como assunto da página, sem atribuir a ele autoria das fotografias; não altera as animações nem o tratamento visual medidos.

Não há dados de INP de campo ou Core Web Vitals de usuários reais nesta execução. Após publicar, medir novamente o domínio oficial, verificar o catálogo operacional e acompanhar Search Console conforme houver tráfego.

## Evidência visual e privacidade

- `painel-demonstracao-desktop.png`: painel com dados explicitamente fictícios; nenhuma métrica real foi inventada para produção.
- `painel-responsivo.json`: larguras de frame 320, 390, 768, 1024 e 1440, sem overflow horizontal no painel.
- `central-de-cookies.png`: preferências independentes e centralizadas, com opções de rejeição e salvamento.
- `cookies-revogacao.json`: após revogar, escolhas=false, IDs de visitante/sessão removidos, nenhum iframe Spotify.
- No navegador, clicar Ouvir com conteúdo externo recusado apresentou a autorização, sem montar iframe Spotify. Os testes de protocolo também cobrem filas, navegação, revogação e exclusão de peças futuras dos snapshots de compra.

O painel de recuperação real exige migração aplicada, ambiente configurado e proprietário com MFA. A fixture de demonstração fica exclusivamente em `work/analytics-seo-qa/`, fora do build, e intercepta requisições para impedir pedidos ou contatos reais.

## Pendências externas

Aplicar a migração no Supabase conectado, publicar o pacote integrado, conferir domínio oficial e vincular/verificar a propriedade no Search Console com acesso autorizado. Configurações remotas de backup, SMTP, Turnstile e alertas não foram auditadas nesta entrega. Não há alegação de segurança absoluta, indexação garantida ou faturamento testado.
