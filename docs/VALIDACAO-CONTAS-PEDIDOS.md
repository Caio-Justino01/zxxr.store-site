# Validação da prévia de contas e pedidos

Atualizado em 27/10/2026. Ambiente de teste, sem cobrança, produção ou postagem reais.

Prévia: https://contas-pedidos.zxxr-store.pages.dev/

## Evidências concluídas

- 71 testes da versão de publicação passaram; TypeScript e build concluídos. Os testes cobrem PostgreSQL/RLS, isolamento por cliente, permissões, MFA, preços do servidor, idempotência, conflitos entre versões, sequência operacional e restauração em outro banco PGlite isolado.
- As duas migrations foram aplicadas no Supabase de validação. A existência da proteção adicional contra solicitações excessivas foi conferida na definição real da função.
- Login por e-mail funcionou na prévia HTTPS com Turnstile ativo. Login Google também retornou uma sessão válida à loja.
- A conta real escolhida pelo dono recebeu o papel administrativo após confirmação explícita. Seu fator TOTP consta como verificado no Supabase. Nenhum segredo do autenticador foi incluído nas capturas ou no repositório.
- A Brevo registrou a entrega do e-mail de recuperação autorizado. Os modelos de confirmação, recuperação e convite apontam ao endpoint da prévia e mantêm a confirmação de e-mail obrigatória.
- O teste integrado com três contas descartáveis percorreu o fluxo de pagamento manual e envio fictícios. Não houve pagamento, envio de WhatsApp ou postagem reais.
- Pelo navegador, um cliente escolheu Boca M, passou pelas três etapas e registrou outro pedido. A sacola foi esvaziada somente após o registro; frete e total permaneceram pendentes. A equipe iniciou e assumiu esse atendimento, marcou a conferência e salvou uma cotação fictícia.
- Uma resposta lenta do ViaCEP não substitui campos editados manualmente e é descartada ao avançar à revisão. Três testes de regressão cobrem preenchimento, edição posterior e troca de CEP.
- Os acessos de funcionário e dono fictícios foram desativados ao terminar. A sessão já aberta do funcionário perdeu a consulta imediatamente, exibindo a negativa de autorização. A conta real do dono foi preservada.
- Formulários e painel foram conferidos em 320, 390, 1440 e 1920 px, com largura do documento igual à área disponível e sem rolagem horizontal. Capturas abaixo contêm apenas pedidos fictícios.

## Capturas

- [Painel em 1440 px](previews/contas-pedidos/equipe-desktop-1440.png)
- [Painel em 1920 px](previews/contas-pedidos/equipe-desktop-1920.png)
- [Painel em 390 px](previews/contas-pedidos/equipe-mobile-390.png)
- [Painel em 320 px](previews/contas-pedidos/equipe-mobile-320.png)

As capturas são reais. Foi removida apenas a área vazia que o navegador de testes acrescenta ao redor do viewport; a interface não foi retocada.

## Limites desta validação

- Cadastro com confirmação, troca efetiva de senha e convite de funcionário ainda precisam de um ensaio completo com destinatários reais autorizados. Entrega do e-mail de recuperação foi comprovada; isso não é prova de execução de todos os fluxos de e-mail.
- A restauração automatizada foi executada em PostgreSQL/PGlite isolado. Uma restauração completa de Supabase Auth entre projetos ainda não foi executada.
- Não houve teste em aparelho físico ou Safari. A revisão responsiva usou o navegador do ambiente de trabalho.
- O script `commerce-smoke.mjs` foi usado antes da ativação do CAPTCHA. Com Turnstile configurado ele exige validação pelo navegador, sem contornar a proteção. As contas administrativas fictícias permanecem desativadas.

## Antes do lançamento público

Manter `STORE_MODE=test` e `store_settings.test_mode=true` nesta prévia. O número e o remetente pessoais foram autorizados somente para teste. O Google também usa temporariamente o contato pessoal aprovado para suporte da prévia.

Confirmar contato definitivo, remetente do domínio e seus registros DNS, suporte da marca no Google, informações comerciais e prazo de produção. Definir o ambiente de produção separado e repetir os testes reais de acesso e convite antes de aceitar encomendas reais. Não inferir frete, prazo ou condições de pagamento.

O domínio público existente não foi substituído por esta prévia. A publicação usa Pages Functions e segredos exclusivos do ambiente `preview`, sem alterar as variáveis de produção.
