# Desejos — pré-lançamento congelado

Versão autorizada em 26/10/2026. O build padrão e o desenvolvimento na porta 5274 usam `PrelaunchApp`, `public-prelaunch` e o catálogo público independente `config/prelaunch.ts`. Não existe parâmetro de URL ou opção de navegador para abrir a loja completa.

## Conteúdo visível

- Fotografias com pessoas: píer, jardim, cadeiras, praia e banner da quadra. Os arquivos são cópias byte a byte dos aprovados.
- Marca, navegação, guia adaptado para explorar o ensaio e a seção musical do Razz.
- Nas peças, apenas números de identificação e “Detalhes em breve.”; sem nome da estampa, dados técnicos, tamanhos, preço ou compra.

## Conteúdo congelado

- Todas as vistas de catálogo, frente/costas e hero, usam versões irreversivelmente reduzidas e borradas antes de serem servidas.
- Flores na grama, Boca na Mercedes, Rosa no Porsche e Spiritual na piscina usam essas mesmas versões protegidas.
- Informações usam formas decorativas sem texto real por trás do gelo. O acabamento é CSS/SVG estático: superfície leitosa, granulação fina, bordas frias e reflexos. Referências visuais: [Glass Card / 21st](https://mcp.21st.dev/%40educalvolpz/components/glass-card) e [Aura — Styling](https://www.aura.build/learn/prompt-for-styling).
- Sem zoom ou ação que descubra a imagem original. A troca de miniaturas mantém os arquivos congelados.
- `/sacola` redireciona para `/#o-drop`. O estado antigo da sacola não é lido nem apagado.

## Separação de publicação

`npm run prepare:prelaunch` prepara a pasta pública com uma lista explícita de fotos permitidas. A preparação falha se encontrar arquivos inesperados. O plugin do Vite também rejeita módulos comerciais e arquivos públicos fora da lista permitida no build padrão.

Os originais e o código da loja são conservados localmente e no histórico existente. Eles não entram no site novo. O repositório e os deploys históricos já eram públicos; esta mudança não apaga versões antigas.

`npm run build` cria `dist`; `npm run check` verifica TypeScript; `npm test` inclui os testes de catálogo, originais preservados e fronteira dos arquivos de pré-lançamento. `dev:store` / `build:store` são entradas explícitas para retomar o trabalho futuro da loja; revisar lançamento e metadados antes de promovê-las.

## Domínio

Consulta atual confirmou `zxxr.store` e `www.zxxr.store` já associados ao projeto `caio-mendoncas-projects/zxxr-store-site`, com HTTPS funcional e redirecionamento existente do apex para `www`. O DNS continua na Hostinger. Nenhum registro DNS, e-mail ou nameserver precisa ser alterado para esta atualização.

## Validação

- TypeScript e build aprovados; o plugin verificou a ausência dos módulos comerciais no bundle publicado.
- Preços, ações de compra e caminhos dos originais ausentes no DOM e JavaScript de produção.
- Galerias e rota direta de produto verificadas. Frente/costas permanecem congeladas; ensaio com pessoa permanece nítido.
- Desktop 1440 px e celulares 320/391 px sem rolagem horizontal; fotos, controles e painéis dentro do espaço disponível.
- Animações de leitura continuam reversíveis e utilizam a lógica já testada. O gelo não depende de animação; preferências de movimento/transparência reduzidos e ausência de backdrop-filter preservam a ocultação.
- Registrar a confirmação do deploy e a captura pública na publicação desta versão.
