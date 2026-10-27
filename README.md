# ZXXR Store — edição Razz

Loja da edição Razz: cinco camisetas sob encomenda, com preço inicial de R$ 100,00. Esta versão acrescenta conta do cliente, registro de pedidos e painel da equipe com Supabase e Cloudflare. Entrega e cobrança são concluídas no atendimento pelo WhatsApp, sem plataforma de e-commerce paga. A vitrine conserva as imagens e animações aprovadas.

Prévia anterior, somente WhatsApp, publicada em 26/10/2026: [zxxr-store.pages.dev](https://zxxr-store.pages.dev/). O registro anterior está em `docs/previews/pre-venda-whatsapp/`. A integração de contas depende da configuração e validação dos serviços descritas abaixo; um build estático sozinho não confirma seu funcionamento.

## Rodar

Node.js 22.18 ou superior.

```powershell
npm.cmd ci
npm.cmd run dev
```

Vitrine em desenvolvimento: http://127.0.0.1:5274/ . Para testar a aplicação completa, configure `.dev.vars` conforme `.dev.vars.example`, execute o build e `npx.cmd wrangler pages dev dist --port 8788 --ip 127.0.0.1`. Use http://127.0.0.1:8788/ para a interface junto à API. `npm.cmd test` executa a suíte e `npm.cmd run build` verifica TypeScript e gera `dist/`.

## Conteúdo

- `/`: cinco peças livres, sem cards de vidro na hero, com imagens originais e título New Drop ZXXR em grafite. Hover, foco, toque e seleção 01–05 exploram a coleção. No celular/tablet, deslize ou use os seletores; no teclado, use as setas.
- `/#o-drop`: capítulos alternando fotografia e informações. Cada galeria abre com o ensaio da peça, seguido de frente e costas originais. Tamanhos P/M/G/GG selecionáveis, guia de caimento e adição direta à sacola. A página individual usa as mesmas informações e controles.
- `/#como-funciona`: guia compacto para escolher a peça e o tamanho, com a informação de produção sob encomenda.
- `/produto/:slug`: Boca, Flores, Me preservando, Spiritual Gangsta e ZXXR Rosa. Frente/Costas, Detalhes, zoom de 100% a 200%, arraste da imagem ampliada e Restaurar visão.
- `/sacola`: escolhas persistentes neste navegador, agrupadas por produto e tamanho, com quantidade, remoção, preço unitário e subtotal calculado. Compatível com o formato anterior. Adicionar uma peça salva uma escolha local; não envia um pedido real.
- `/encomenda`: finalização autenticada em três etapas, endereço completo, preferência de pagamento e registro no banco antes de abrir o WhatsApp.
- `/entrar`, `/cadastro`, `/recuperar-acesso`: acesso Google/e-mail e recuperação conforme os provedores habilitados.
- `/conta/pedidos`, `/conta/dados`: histórico, acompanhamento, perfil e endereços privados do cliente.
- `/painel/pedidos`, `/painel/equipe`, `/painel/configuracoes`: operação da equipe com autorização no servidor e segundo fator obrigatório; ações financeiras, catálogo e acessos reservados ao dono.
- `/privacidade`: informações sobre os dados usados no atendimento e na conta.
- `/#som`: retrato original de Razz, bio adaptada do perfil correto do Spotify, crédito à fonte e player sob demanda, sem autoplay.

React, TypeScript, Vite, Tailwind, GSAP e React Router. As roupas usam HTML/CSS e imagens; um único canvas WebGL nativo desenha o fundo decorativo. Esse fundo ocupa uma tela e fica sticky dentro de uma camada que cobre a hero e os cards, sem criar um canvas alto para toda a página. O grafo de entrada não carrega Three.js, GLBs ou as nuvens fotográficas anteriores. O fundo pausa fora da tela e com a aba oculta, respeita movimento reduzido e oferece fallback estático claro sem WebGL.

## Ativos e validação

Veja [a direção visual v7](docs/GLASS-v7.md) e o [plano histórico](docs/PLANO.md). [Hero v6](docs/HERO-v6.md) documenta a origem do shader. A suíte cobre imagens, interação, contratos de API e regras/permissões do banco, incluindo restauração em PostgreSQL isolado via PGlite. Os testes de modelos históricos continuam se referindo aos arquivos preservados. A validação local não substitui testes reais de Google, SMTP e hospedagem.

As fotos cadastradas conservam os pixels e a resolução nativa dos recortes frente/costas dos arquivos fornecidos, incluindo as inscrições e o contorno branco da estampa rosa. O zoom amplia o mesmo arquivo; não recupera detalhes novos ou estampas em 4K. São mockups/referências originais, não novas fotografias de peças fabricadas. O retrato de Razz conserva o arquivo do Spotify de 271 × 320 px, exibido com largura máxima de 271 px; sua procedência está em [SOURCE.json](public/media/artist/SOURCE.json). O título reúne lettering SVG novo e a logo oficial transparente equivalente à referência PNG solicitada, com caminhos e cor preservados: [SOURCES.json](public/brand/drop-title/SOURCES.json).

Os estudos 3D v1–v4, o céu fotográfico v5, a hero v6, modelos, fontes e provas anteriores continuam preservados. Cópias de trabalho estão em `work/hero-v4-preservada/` e `work/hero-v5-preservada/`; os ZIPs v4, v5 e v6 permanecem em `../entrega/`. A documentação da v7 prepara um novo pacote, sem substituir esses arquivos. O kit de identidade não foi alterado. A procedência do céu histórico v5 continua em [CLOUDS-v5-manifest.json](docs/CLOUDS-v5-manifest.json).

Tamanhos P/M/G/GG. Composição, gramatura, medidas e prazo real de produção dependem do fabricante. Não publicar valores ou promessas inventadas. O site registra pedidos no banco e acompanha estados atualizados pela equipe; a confirmação financeira é manual, pelo dono, após conferir o provedor. Abrir o WhatsApp não comprova envio nem leitura da mensagem.

## Contas e operação sem mensalidade de plataforma

Siga [CONFIGURACAO-LOJA.md](docs/CONFIGURACAO-LOJA.md) para banco, autenticação, SMTP e segredos. O atendimento está descrito em [OPERACAO-LOJA.md](docs/OPERACAO-LOJA.md). As variáveis antigas `VITE_PREORDER_*` pertencem à versão histórica somente WhatsApp; a API atual usa `.dev.vars` local e segredos Cloudflare em hospedagem.

- `STORE_MODE=test` e `store_settings.test_mode=true` identificam explicitamente pedidos fictícios. Não cobrar nem produzir.
- O dono abre/encerra novas encomendas pelo painel; o banco bloqueia novos registros quando o lote estiver fechado.
- Sem catálogo confirmado, autenticação ou contato válido, a finalização permanece bloqueada. Não há pedido falso em localStorage.
- Chaves privadas nunca usam prefixo `VITE_`, nunca são copiadas ao navegador e nunca entram no Git.

Operação do primeiro lote: receber a mensagem, confirmar peças/tamanhos, cotar o frete com o CEP e informar o prazo real. Só depois enviar a cobrança com o valor acordado, por exemplo um Link de Pagamento do Mercado Pago. Conferir o recebimento no painel do provedor; não usar a mensagem ou uma captura de comprovante como confirmação automática. Organizar os pedidos pagos por estampa/tamanho antes de fechar a produção. Se o lote mínimo exigir complemento, a loja cobre a diferença com capital próprio, conforme a decisão do projeto. Não há meta, data ou contador configurados nesta versão.

O WhatsApp por link não exige API paga. O Mercado Pago informa ausência de mensalidade no checkout e cobrança por transação; consultar os valores da própria conta antes de cobrar. O envio e eventuais taxas de pagamento continuam sendo custos da operação.

## Publicação gratuita no Cloudflare Pages

O frontend é estático; login e pedidos usam as Pages Functions e o Supabase. O build contém apenas os ativos aprovados em `public-store/` (nenhuma imagem congelada). Execute `npm.cmd run prepare:store` quando atualizar as imagens.

Configuração: Vite, build `npm run build`, saída `dist`, Node 22.18 ou superior. Publicar via Wrangler/CI incluindo `functions/` e configurar segredos de runtime por ambiente. Upload manual de ZIP estático não publica o backend desta versão. Nenhum arquivo `.env.local`, `.dev.vars` ou fixture privada deve ser versionado ou enviado como ativo.

O Pages trata as rotas da aplicação como SPA quando não existe `404.html` na raiz do build. Testar `/produto/boca`, `/sacola` e `/encomenda` por acesso direto. A camada de ativos estáticos gratuita tem limites de arquivos/builds; o projeto utiliza cerca de 80 ativos, com arquivos individuais abaixo de 25 MiB. Não ativar add-ons pagos para esta entrega.

Para `www.zxxr.store`, cadastrar o domínio no Pages antes de alterar o CNAME na Hostinger. Não basta apontar um CNAME sem associar o domínio ao projeto. O domínio raiz exige configuração própria; preservar o encaminhamento atual e os registros de e-mail até conferir o DNS real. A configuração Vercel existente permanece como alternativa; a migração de hospedagem só se considera concluída após conferir HTTPS e as rotas no domínio.

Referências: [Mercado Pago — custos sem mensalidade](https://www.mercadopago.com.br/blog/comparando-taxas-checkout-gateways-pagamento), [exemplo oficial do Checkout Pro](https://github.com/mercadopago/checkout-payment-sample), [WhatsApp — mensagem preenchida](https://faq.whatsapp.com/5913398998672934/), [Cloudflare Pages — limites](https://developers.cloudflare.com/pages/platform/limits/), [domínio próprio](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Atualização das galerias e validação de 25/10/2026: [registro dos produtos](docs/PRODUTOS-20261025.md).
