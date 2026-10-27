# Configuração e publicação

> Operação atual: produção aberta em www.zxxr.store. [Estado do lançamento](LANCAMENTO-LOJA.md). O projeto Supabase existente agora contém a operação real; a prévia foi bloqueada para dados privados. Novos testes completos devem usar uma base separada.

## Serviços e ambientes

Frontend: React/Vite existente. Backend: Cloudflare Pages Functions. Banco e identidade: Supabase Auth/PostgreSQL. SMTP: Brevo gratuito, somente e-mails de acesso. Nenhum plano pago, pagamento integrado ou serviço automático de WhatsApp.

Separar projetos/segredos de validação e produção. O projeto de validação deve manter `store_settings.test_mode=true`, `STORE_MODE=test` e número de atendimento de teste. As duas marcações precisam concordar para aceitar pedidos reais. O seed começa com encomendas fechadas. A disponibilidade comercial vem do banco; as imagens e textos editoriais continuam locais.

Copie `.dev.vars.example` para `.dev.vars` local e preencha os valores. Em hospedagem, configure os mesmos nomes como variáveis/segredos do ambiente Cloudflare. Nunca use prefixo `VITE_` em chaves privadas. Não copie `.env.local`, `.dev.vars`, logs, banco ou credenciais para o checkout de publicação.

## Banco

Aplicar as migrations de `supabase/migrations/` em ordem ao projeto vazio. A primeira cria as vinte variantes, políticas privadas, funções com validação de papel/MFA, idempotência e controle de versão. A segunda limita solicitações excessivas, limita o tamanho dos dados também no banco e filtra datas no fuso de São Paulo. Não executar novamente migrations já aplicadas nem aplicar scripts destrutivos sobre dados reais.

Todas as operações de negócio passam por funções com autorização. Cliente Data API não recebe escrita direta em tabelas, nem pode atribuir papéis ou escolher preços. A chave privada só é usada pelo servidor para convidar funcionário depois de confirmar dono ativo e sessão AAL2.

Criar e confirmar a conta real do dono pelo fluxo de autenticação. Depois, um administrador confiável do banco vincula o UUID confirmado:

```sql
insert into public.staff_access(user_id, role, active)
select id, 'owner', true from auth.users
where id = 'SUBSTITUIR-PELO-UUID-CONFIRMADO'::uuid
  and email_confirmed_at is not null;
```

Conferir que exatamente uma conta foi vinculada. Nunca promover pelo nome, por um campo de formulário ou por `user_metadata`. O dono também configura TOTP antes de entrar no painel.

Para abrir a validação depois dos testes, usar o painel do dono ou atualizar somente `store_settings.open=true` pelo console administrativo. Não alterar `test_mode` para contornar um bloqueio de configuração.

## Autenticação

Configurar Site URL e callbacks explícitos para cada origem autorizada. Endpoints:

- Google: `/api/auth/callback` com fluxo PKCE e retorno interno permitido.
- E-mail: `/api/auth/confirm?token_hash=...&type=...`.
- Recuperação/convite leva a `/recuperar-acesso?step=reset` após confirmar o token.

No Supabase, adaptar os templates de confirmação, recuperação e convite para apontar ao endpoint da loja com `{{ .TokenHash }}` e o `type` correto (`signup`, `recovery`, `invite`). Usar origem explícita de cada ambiente; não confiar em um retorno arbitrário. Templates devem conter HTML e link textual simples da ZXXR, sem rastreamento que reescreva os links.

Google: criar cliente OAuth Web em conta controlada pelo dono, autorizar o callback exibido pelo próprio Supabase, informar Client ID/Secret apenas no provedor Supabase e publicar o consentimento para os usuários reais. Escopos apenas de identidade, e-mail e perfil. Não pedir Gmail, contatos ou agenda. Configurar URLs públicas reais de privacidade/atendimento antes de liberar produção.

Os métodos ficam desligados até sua configuração ser validada: `EMAIL_LOGIN_ENABLED=true` habilita e-mail/senha e `GOOGLE_LOGIN_ENABLED=true` habilita o botão Google. Esses indicadores não substituem a configuração do Supabase/SMTP/OAuth. Em produção, ambos devem estar habilitados e testados; não divulgar botões que apontem para provedores desativados.

Supabase Auth: confirmação de e-mail obrigatória, senha mínima 10, CAPTCHA Turnstile, limites de tentativas e e-mails revisados para a expectativa do lançamento. Configurar a chave secreta do Turnstile no Supabase e `TURNSTILE_SITE_KEY` no servidor. O modo `live` rejeita login/cadastro/recuperação sem a verificação.

## Brevo gratuito

Conta gratuita com envio transacional ativado. Completar a verificação de titularidade solicitada pela Brevo. Configurar um remetente do domínio da loja e autenticar o domínio com os registros apresentados pelo provedor, preservando outros registros DNS/e-mail existentes.

SMTP no Supabase: servidor `smtp-relay.brevo.com`, porta 587, login e chave da conta Brevo, nome de remetente ZXXR Store. A chave SMTP é diferente da senha de login. Não registrar a chave em documentação ou capturas. O limite gratuito observado na preparação é 300 e-mails/dia e inclui assinatura da Brevo. Cota esgotada não autoriza upgrade.

Testar recebimento real de confirmação, recuperação e convite. Não desabilitar confirmação para simular funcionamento. O SMTP padrão do Supabase não serve ao cadastro público.

## Desenvolvimento e publicação

```text
npm ci
npm test
npm run build
npx wrangler pages dev dist --port 8788 --ip 127.0.0.1
```

O Vite continua disponível para interface. A validação integrada de API usa o endereço do Wrangler, sem trocar a API por localStorage ou autenticação falsa. O teste de banco usa PostgreSQL real em WASM (PGlite) e identidades descartáveis em memória; não substitui os testes do Supabase/OAuth/SMTP reais.

Publicar via Wrangler/CI incluindo `functions/`; o upload manual de ZIP estático não publica este backend. O build gera `_routes.json`, cabeçalhos e regras de indexação. Confirmar que `/api/` retorna JSON e nunca o HTML da SPA. O deploy Vercel antigo não hospeda automaticamente essas funções.

Antes da produção: serviços sob controle do dono; Google e SMTP funcionando; TOTP da equipe; domínio/origem/cookies HTTPS conferidos; contato definitivo confirmado; remetente autenticado; informação comercial e prazo tratados sem invenção; testes e capturas concluídos. Manter produção fechada enquanto alguma dessas dependências estiver pendente.

Os testes automatizados existentes preservam fotos/galerias/scroll. Os novos validam banco, acesso, sequência, total, conflitos e falhas. Validar visualmente 320/390/1440/1920 px, teclado e movimento reduzido. Usar somente pessoas/pedidos fictícios na prévia, sem cobrança nem envio real de WhatsApp.

O script `commerce-test-users.mjs` exige autorização específica para criar identidades externas. Ele só funciona com projeto e ambiente marcados como teste, não envia e-mails e grava as senhas aleatórias em `.commerce-test-users.json` ignorado pelo Git. O SQL de atribuição de papéis também é privado. Nunca copiar esses arquivos para publicação; desativar os acessos privilegiados das fixtures ao terminar a validação.
