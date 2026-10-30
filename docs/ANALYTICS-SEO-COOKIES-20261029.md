# ZXXR — Analytics, privacidade e SEO

## Entrega local

Implementação de 29/10/2026 no projeto `zxxr-store`. Nenhuma publicação, mensagem, compra ou migração no banco de produção foi executada. A coleta real só começa depois da migração e publicação verificadas. O histórico anterior de navegação e sacolas não existe no servidor e não é reconstruído.

O ponto de partida foi a vitrine atual, preservada em `work/antes-analytics-seo-20261029/`. A integração incorpora o gate e a espera da publicação `0cb8c21`, mantendo **31/10/2026 às 00h de Brasília** como abertura padrão. As imagens, preços, disponibilidade e pedidos anteriores não foram alterados.

## Consultar os números

Rota `/painel/analytics`, exclusiva ao proprietário ativo com MFA, validada também no servidor e no banco. O painel separa sessões ativas nos últimos 5 minutos, visitantes estimados, páginas, seções, produtos, origem de campanha, dispositivo, abandono estimado e sacolas identificadas para recuperação. A consulta atualiza a cada 15 segundos enquanto visível.

Tráfego é uma amostra de quem aceitou estatísticas. Não representa pessoas identificadas com precisão nem elimina todos os robôs. Sessão usa 30 minutos de inatividade; visitantes são identificadores aleatórios do navegador, sem fingerprint, IP ou conteúdo de formulários. Localhost, previews, testes e equipe não entram na coleta oficial. Campanhas aceitam apenas os campos UTM previstos e referrer sem caminho/query.

Pedidos e pagamentos são números operacionais independentes dessa amostra. Registro de pedido não equivale a pagamento. Só a confirmação existente da loja conta como pagamento; abrir WhatsApp não confirma envio nem venda. O painel não divide todos os pedidos por uma amostra de visitas para inventar conversão.

## Recuperação autorizada

A pessoa precisa estar conectada, ter nome e WhatsApp válidos no perfil e autorizar separadamente o lembrete. Não há captura de telefone de visitantes. A lista considera sacola não vazia, 24 horas sem atividade e nenhum pedido registrado no ciclo. A abertura de WhatsApp revalida os dados; envio e declaração de contato são manuais.

Versões por conta e bloqueio transacional invalidam uploads de abas antigas. Um pedido encerra ciclos da conta, ainda que feito em outro dispositivo. Esvaziar a sacola, revogar autorização ou voltar a interagir retira elegibilidade. Restaurar localStorage ou entrar na conta não simula uma nova edição. Dados de recuperação inativos expiram após 30 dias; eventos analíticos após 90 dias, por limpeza amortizada nas APIs.

## Cookies e conteúdo externo

Essenciais preservam login, segurança e sacola. Estatísticas e Spotify começam desligados, sem identificadores analíticos antes de aceitar. O aceite não recupera cliques anteriores. A central permite aceitar, rejeitar, personalizar e revogar, com sincronização entre abas. Falha de armazenamento deixa opcionais desligados. Retirada cancela timers, observadores, filas e requisições analíticas; o player é desmontado. O site não pode apagar cookies que já tenham sido gravados no domínio do Spotify.

O lembrete comercial tem autorização própria no banco; o banner não o habilita. A escolha pode ser revisada na sacola, em Meus dados e em Privacidade.

## SEO e imagens

Home, cinco páginas de peça, ajuda e privacidade têm HTML público pré-renderizado e hidratação React. Títulos, descrições, canonical, Open Graph e JSON-LD são centralizados por rota. O sitemap é XML real e só apresenta URLs públicas quando a loja abre. Contas, sacola, checkout, painel, previews e rotas inexistentes permanecem sem indexação; 404 é um status HTTP real depois da abertura.

A espera continua noindex antes da abertura. O domínio canônico é `https://www.zxxr.store`. Organization, WebSite, BreadcrumbList e produtos disponíveis descrevem apenas informações confirmadas. Ofertas só entram quando o catálogo remoto confirmar os mesmos preços das páginas; falha, ambiente de teste ou divergência omitem a oferta. Futuras não recebem preço nem oferta.

Imagens responsivas WebP preservam os originais. Fontes WOFF2 preservam licenças e glifos portugueses. As futuras usam exportações do gelo v11 nos metadados e sitemap. Os originais usados pela composição visual recebem noindex: isso é controle de indexação, não sigilo dos arquivos publicados. Autoria/licença não confirmadas não foram inventadas.

## Segurança verificada e limites

Sessões HttpOnly/SameSite/Secure em HTTPS; MFA e papéis no servidor/RPC; RLS e proibição de leitura direta das novas tabelas; service role somente no servidor; validação de origem, JSON e corpo de 32 KB. Coleta: máximo de 20 eventos por lote, deduplicação, limites por sessão/visitante, sem IP armazenado. Rotação maliciosa de IDs requer limites adicionais na borda/WAF, não é resolvida por esses identificadores.

CSP preservada sem script inline liberado; HSTS aplicado em respostas HTTPS e arquivos estáticos, sem incluir subdomínios indiscriminadamente. CSP também bloqueia colocar a loja dentro de iframes de outros sites; isso é esperado. A auditoria npm local não apontou vulnerabilidades conhecidas em dependências nesta execução, o que não equivale a garantia absoluta.

Não foram verificadas nem alteradas nesta entrega as configurações remotas de backups, SMTP, Turnstile ou alertas. Não há certificações ou condições comerciais fictícias.

## Ativação e conferência em produção

1. Revisar e aplicar `supabase/migrations/202610290002_analytics_recovery.sql` no projeto conectado, com backup e conferência do histórico de pedidos. Os testes locais usam PGlite isolado e não são aplicação remota.
2. Confirmar bindings existentes no host: Supabase URL/chave publicável, chave administrativa somente no servidor, STORE_MODE live e contato válido. Nunca inserir esses valores em arquivos públicos ou chat.
3. Publicar o build integrado com Functions e middleware, não apenas os arquivos estáticos. Manter o gate ligado com a data aprovada; o dia 31 não exige desativá-lo manualmente.
4. Verificar no domínio oficial: espera/noindex antes da data; sitemap XML; 2 produtos compráveis e 3 futuras; cookies recusados sem coleta; aceite com eventos; proprietário com MFA; conta comum recusada no Analytics. Não criar pedidos reais como teste sem autorização específica.
5. Verificar Search Console com conta autorizada, enviar sitemap após abertura e usar Inspeção de URL/Rich Results. Não foi concedido acesso ao Search Console nesta entrega; não há alegação de indexação concluída.
6. Conferir relatórios em `previews/analytics-seo-20261029/lighthouse-release/` e o resumo em `docs/VALIDACAO-ANALYTICS-SEO-20261030.md`. Lighthouse local usa build de produção e perfil isolado; não é PageSpeed Insights do domínio publicado. O noindex do preview e o backend deliberadamente desconectado afetam notas de SEO/boas práticas. INP e métricas de campo exigem tráfego real.

As animações não foram encurtadas ou removidas. Pontuações e limites reais são registrados no relatório, sem promessa de 100 fixo, ranqueamento ou segurança absoluta.
