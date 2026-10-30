# Publicação — 26/10/2026

Site atualizado: https://zxxr.store/ → https://www.zxxr.store/

GitHub: https://github.com/Caio-Justino01/zxxr.store-site/commit/232a365aeee300894a62497d76dd558f5a11abf8

Deploy: https://vercel.com/caio-mendoncas-projects/zxxr-store-site/6fHwf3HeH7CyX4CbWZ55mMYYTUYt

A referência remota `main` foi conferida com `git ls-remote` e corresponde a `232a365aeee300894a62497d76dd558f5a11abf8`. A API pública do GitHub retornou `success`, com contexto Vercel e descrição “Deployment has completed”. O checkout de publicação está limpo.

## Versão entregue

- Pré-lançamento com fotos com pessoas nítidas e demais fotografias de produtos congeladas.
- Informações substituídas por formas decorativas sob vidro congelado. Sem preços, seleção de tamanho, sacola ou compra na aplicação publicada.
- Originais protegidos fora da pasta servida. Galerias, miniaturas, hero e páginas individuais usam arquivos já borrados.
- Guia adaptado para o ensaio; seção do Razz preservada. O espaçamento corrigido na composição de três fotos está incluído.

## Validação

- Workspace: TypeScript, 51 testes e build aprovados.
- Publicação: instalação limpa por `npm ci`, TypeScript, 47 testes e build aprovados. O aviso local de engine decorre do Node 25.7.0; o projeto publicado mantém Node 22.x e o build da Vercel foi concluído com sucesso.
- HTTP 200 e HTTPS funcional no domínio próprio; a associação e o redirecionamento já existiam na Vercel. Nenhuma alteração na Hostinger, DNS ou serviços de e-mail.
- 16 endereços de originais de produto, campanhas congeladas e JavaScript da versão anterior retornaram 404 no domínio público.
- As cinco fotografias com pessoas verificadas e uma versão congelada publicada têm exatamente o mesmo SHA-256 dos respectivos arquivos do pacote aprovado.
- Os três arquivos JavaScript de produção, incluindo o módulo carregado sob demanda, foram inspecionados sem preços nem caminhos para originais protegidos.
- Navegador público confirmou ausência de preços, ações de compra, fontes de imagens originais protegidas e rolagem horizontal. `/sacola` redireciona para `/#o-drop`.
- Desktop e celulares de 320/390/391 px conferidos. Teclado e seleção de frente/costas continuam usando apenas imagens congeladas.

## Evidência local

- `previews/prelaunch/public-desktop.png`
- `previews/prelaunch/public-mobile-390.png`
- `previews/prelaunch/production-verification.json`
- `previews/prelaunch/local-hero.png`

Os arquivos originais continuam preservados para o lançamento. O repositório e os deploys históricos não foram apagados ou reescritos.
