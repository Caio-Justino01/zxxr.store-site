# ZXXR Store — Desejos, edição Razz

Site do primeiro drop da ZXXR Store, criado por Razz. Cinco camisetas autorais, fotografias de campanha, informações de cada peça, tamanhos selecionáveis e sacola persistente no navegador.

## Desenvolvimento

Use Node.js 22.18 ou superior dentro da série 22.

```sh
npm ci
npm run dev
npm test
npm run build
```

A prévia local abre em http://127.0.0.1:5274/. O build de produção é gerado em `dist/`.

## Experiência atual

- Abertura Desejos com as cinco peças e navegação por toque, mouse e teclado.
- Capítulos de produtos alternando fotografias e informações. Cada galeria começa pelo ensaio e oferece frente/costas originais, detalhes e zoom.
- Seleção P/M/G/GG, tabela de medidas, adição à sacola e página individual de cada peça.
- Banner da quadra ao final dos produtos: panorâmico no desktop e fotografia vertical completa no celular.
- Guia “A peça que faltava.” com leitura progressiva durante a rolagem, alternativa para telas baixas e suporte a movimento reduzido.
- Seção “Por trás de Desejos.” com retrato e bio de Razz, ESCOLHAS em destaque, emoção/controla com créditos de diaz e Razz e ROCKSTAR. Um player oficial do Spotify por vez, aberto sob demanda, sem autoplay.

## Conteúdo e validação

A sacola salva escolhas localmente e calcula quantidades e subtotal. Cada peça custa R$ 100,00. Pagamento, frete, estoque remoto e envio de pedidos ainda dependem de integração. O site permanece uma prévia com `noindex`.

Fotos de frente/costas preservam as referências fornecidas. O banner usa ampliação lateral de cenário e recompõe as pessoas e estampas com os pixels da fotografia original; no celular a fonte é exibida inteira. As medidas apresentadas precisam ser substituídas pelos dados reais de fabricação.

O catálogo do artista é estático, com IDs e links oficiais em `src/config/artist.ts`; os players são do Spotify. Não são necessárias credenciais de API para essa apresentação.

Os testes abrangem sacola, preços, galerias, fidelidade das imagens e do banner, leitura guiada, layout da abertura, navegação da roleta e fallback do fundo WebGL. Estudos históricos de modelos 3D permanecem no workspace de criação e não fazem parte desta publicação.

## Vercel

Repositório: https://github.com/Caio-Justino01/zxxr.store-site

Site: https://zxxr-store-site.vercel.app/

Diretório raiz `.`, preset Vite, Node 22.x, instalação `npm ci`, build `npm run build`, saída `dist`. `vercel.json` mantém o fallback de SPA para abrir diretamente `/produto/:slug` e `/sacola`. Pushes em `main` acionam o deploy conectado.

Credenciais e arquivos `.env*`, `.vercel/`, dependências locais, caches, estudos, capturas e pacotes de trabalho ficam fora do Git. A pasta `assets-originals/campaign/` contém somente a fonte necessária ao teste de preservação do banner.
