# ZXXR Store — edição Razz

Prévia navegável do primeiro drop. Cinco camisetas com imagens originais, fundo azul e branco animado e cards de vidro na apresentação individual. New Drop ZXXR em preto, com uma única linha contínua.

## Desenvolvimento

Node.js 22.18 ou superior dentro da série 22.

    npm ci
    npm run dev

Prévia local: http://127.0.0.1:5274/

    npm test
    npm run build

## Vercel

Importe este repositório com diretório raiz `.` e preset Vite. Node 22.x, instalação `npm ci`, build `npm run build` e saída `dist`. O arquivo vercel.json já inclui o fallback de SPA para que `/produto/boca` e `/sacola` também abram diretamente. Não são necessárias variáveis de ambiente para esta prévia.

## Escopo

Cada peça custa R$ 100,00. O botão Encomendar abre seleção P/M/G/GG e salva a escolha na sacola local. Não há envio de mensagem, pagamento, frete ou estoque remoto. O site é uma prévia e permanece com noindex.

As fotos de frente e costas preservam os recortes originais fornecidos. Zoom e inclinação não geram vistas laterais nem novos detalhes. A seção musical utiliza o retrato e uma bio adaptada do perfil Spotify de Razz, com créditos na página.

## Organização

- `src/`: aplicação React, TypeScript, GSAP e fundo WebGL decorativo.
- `public/`: fotos utilizadas, logos, fontes e respectivas licenças.
- `tests/`: sacola, preços, zoom, fallback do shader e fidelidade das imagens.
- `docs/REFERENCE-MANIFEST-v3.json`: origem e dimensões dos recortes.

Os estudos anteriores de 3D, nuvens, modelos e os pacotes de identidade permanecem preservados no workspace original. Este repositório contém a aplicação ativa para publicação.
