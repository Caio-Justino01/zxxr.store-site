# ZXXR Store — edição Razz

Loja da edição Razz: cinco camisetas sob encomenda, por R$ 100,00 cada. O primeiro lote usa sacola local e atendimento pelo WhatsApp, sem plataforma de e-commerce paga. O site mantém as peças livres na hero, os capítulos com galerias e o fundo animado aprovado, com todas as imagens originais nítidas.

Prévia de validação publicada no Cloudflare Pages em 26/10/2026: [zxxr-store.pages.dev](https://zxxr-store.pages.dev/). O fluxo está marcado como teste. Capturas do resultado público e o registro da conferência ficam em `docs/previews/pre-venda-whatsapp/`.

## Rodar

Node.js 22.18 ou superior.

```powershell
npm.cmd ci
npm.cmd run dev
```

Prévia: http://127.0.0.1:5274/ . O terminal do servidor precisa permanecer aberto. `npm.cmd run build` verifica TypeScript e gera `dist/`; `npm.cmd test` executa a suíte. `npm.cmd run preview` serve o build em 4174. Esta entrega é local.

## Conteúdo

- `/`: cinco peças livres, sem cards de vidro na hero, com imagens originais e título New Drop ZXXR em grafite. Hover, foco, toque e seleção 01–05 exploram a coleção. No celular/tablet, deslize ou use os seletores; no teclado, use as setas.
- `/#o-drop`: capítulos alternando fotografia e informações. Cada galeria abre com o ensaio da peça, seguido de frente e costas originais. Tamanhos P/M/G/GG selecionáveis, guia de caimento e adição direta à sacola. A página individual usa as mesmas informações e controles.
- `/#como-funciona`: guia compacto para escolher a peça e o tamanho, com a informação de produção sob encomenda.
- `/produto/:slug`: Boca, Flores, Me preservando, Spiritual Gangsta e ZXXR Rosa. Frente/Costas, Detalhes, zoom de 100% a 200%, arraste da imagem ampliada e Restaurar visão.
- `/sacola`: escolhas persistentes neste navegador, agrupadas por produto e tamanho, com quantidade, remoção, preço unitário e subtotal calculado. Compatível com o formato anterior. Adicionar uma peça salva uma escolha local; não envia um pedido real.
- `/encomenda`: revisão das peças, nome, CEP e observação opcional. A mensagem abre no WhatsApp para o cliente revisar e enviar. Frete, prazo e pagamento são confirmados pela loja antes de cobrar.
- `/#som`: retrato original de Razz, bio adaptada do perfil correto do Spotify, crédito à fonte e player sob demanda, sem autoplay.

React, TypeScript, Vite, Tailwind, GSAP e React Router. As roupas usam HTML/CSS e imagens; um único canvas WebGL nativo desenha o fundo decorativo. Esse fundo ocupa uma tela e fica sticky dentro de uma camada que cobre a hero e os cards, sem criar um canvas alto para toda a página. O grafo de entrada não carrega Three.js, GLBs ou as nuvens fotográficas anteriores. O fundo pausa fora da tela e com a aba oculta, respeita movimento reduzido e oferece fallback estático claro sem WebGL.

## Ativos e validação

Veja [a direção visual v7](docs/GLASS-v7.md) e o [plano histórico](docs/PLANO.md). [Hero v6](docs/HERO-v6.md) documenta a origem do shader; a v7 amplia seu alcance para os cards sem mudar as imagens das roupas. A publicação usa a suíte de 53 testes dos recursos ativos, além da verificação TypeScript e do build. As capturas e medições desta pré-venda estão em `docs/previews/pre-venda-whatsapp/`. Os quatro testes de arquivos históricos 3D permanecem no workspace original, onde a suíte completa de 57 testes também passou; modelos e módulos arquivados não fazem parte desta publicação.

As fotos cadastradas conservam os pixels e a resolução nativa dos recortes frente/costas dos arquivos fornecidos, incluindo as inscrições e o contorno branco da estampa rosa. O zoom amplia o mesmo arquivo; não recupera detalhes novos ou estampas em 4K. São mockups/referências originais, não novas fotografias de peças fabricadas. O retrato de Razz conserva o arquivo do Spotify de 271 × 320 px, exibido com largura máxima de 271 px; sua procedência está em [SOURCE.json](public/media/artist/SOURCE.json). O título reúne lettering SVG novo e a logo oficial transparente equivalente à referência PNG solicitada, com caminhos e cor preservados: [SOURCES.json](public/brand/drop-title/SOURCES.json).

Os estudos 3D v1–v4, o céu fotográfico v5, a hero v6, modelos, fontes e provas anteriores continuam preservados. Cópias de trabalho estão em `work/hero-v4-preservada/` e `work/hero-v5-preservada/`; os ZIPs v4, v5 e v6 permanecem em `../entrega/`. A documentação da v7 prepara um novo pacote, sem substituir esses arquivos. O kit de identidade não foi alterado. A procedência do céu histórico v5 continua em [CLOUDS-v5-manifest.json](docs/CLOUDS-v5-manifest.json).

Tamanhos P/M/G/GG. Composição, gramatura, medidas e prazo real de produção dependem do fabricante. Não publicar valores ou promessas inventadas para preencher esses campos. O site não confirma pagamento nem registra pedido em banco de dados; abrir o WhatsApp também não comprova envio da mensagem. O pedido é acompanhado no atendimento, e o recebimento deve ser conferido no provedor de pagamento.

## Pré-venda sem mensalidade de plataforma

Copie `.env.example` para `.env.local` e configure `VITE_PREORDER_WHATSAPP` com o número autorizado da loja. O número não fica no Git, mas será público no site compilado porque é o contato de atendimento. Nunca colocar credenciais de pagamento em variáveis `VITE_`.

- `VITE_PREORDER_MODE=test` é o padrão. A página e a mensagem identificam o teste expressamente como algo que não deve ser cobrado ou produzido.
- `VITE_PREORDER_MODE=live` identifica encomendas reais. Só alterar quando o contato, os dados da peça e as condições da loja estiverem confirmados.
- `VITE_PREORDER_OPEN=false` encerra novas solicitações: os botões de compra ficam indisponíveis e a finalização é bloqueada. Recompilar e publicar depois de mudar qualquer variável.
- Sem um contato válido, a finalização fica desativada e a seleção permanece na sacola.

Operação do primeiro lote: receber a mensagem, confirmar peças/tamanhos, cotar o frete com o CEP e informar o prazo real. Só depois enviar a cobrança com o valor acordado, por exemplo um Link de Pagamento do Mercado Pago. Conferir o recebimento no painel do provedor; não usar a mensagem ou uma captura de comprovante como confirmação automática. Organizar os pedidos pagos por estampa/tamanho antes de fechar a produção. Se o lote mínimo exigir complemento, a loja cobre a diferença com capital próprio, conforme a decisão do projeto. Não há meta, data ou contador configurados nesta versão.

O WhatsApp por link não exige API paga. O Mercado Pago informa ausência de mensalidade no checkout e cobrança por transação; consultar os valores da própria conta antes de cobrar. O envio e eventuais taxas de pagamento continuam sendo custos da operação.

## Publicação gratuita no Cloudflare Pages

O projeto é um site estático e não precisa de servidor, Shopify, banco de dados ou plano pago para este fluxo. O build contém apenas os ativos aprovados em `public-store/` (nenhuma imagem congelada). Execute `npm.cmd run prepare:store` quando atualizar as imagens.

Configuração de Git no Cloudflare Pages: preset Vite, comando `npm run build`, pasta de saída `dist`, Node 22.18 ou superior. Configurar as três variáveis `VITE_PREORDER_*` no ambiente de prévia antes de compilar. `.env.local` não deve ser enviado nem versionado. Também é possível publicar `dist` por Direct Upload; `wrangler.toml` declara a saída para uso da CLI oficial.

O Pages trata as rotas da aplicação como SPA quando não existe `404.html` na raiz do build. Testar `/produto/boca`, `/sacola` e `/encomenda` por acesso direto. A camada de ativos estáticos gratuita tem limites de arquivos/builds; o projeto utiliza cerca de 80 ativos, com arquivos individuais abaixo de 25 MiB. Não ativar add-ons pagos para esta entrega.

Para `www.zxxr.store`, cadastrar o domínio no Pages antes de alterar o CNAME na Hostinger. Não basta apontar um CNAME sem associar o domínio ao projeto. O domínio raiz exige configuração própria; preservar o encaminhamento atual e os registros de e-mail até conferir o DNS real. A configuração Vercel existente permanece como alternativa; a migração de hospedagem só se considera concluída após conferir HTTPS e as rotas no domínio.

Referências: [Mercado Pago — custos sem mensalidade](https://www.mercadopago.com.br/blog/comparando-taxas-checkout-gateways-pagamento), [exemplo oficial do Checkout Pro](https://github.com/mercadopago/checkout-payment-sample), [WhatsApp — mensagem preenchida](https://faq.whatsapp.com/5913398998672934/), [Cloudflare Pages — limites](https://developers.cloudflare.com/pages/platform/limits/), [domínio próprio](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Atualização das galerias e validação de 25/10/2026: [registro dos produtos](docs/PRODUTOS-20261025.md).
