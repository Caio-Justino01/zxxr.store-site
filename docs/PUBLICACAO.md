# Publicação da prévia — 19/10/2026

Site: https://zxxr-store-site.vercel.app/
GitHub: https://github.com/Caio-Justino01/zxxr.store-site
Branch publicada: main
Commit final: 1db697bebea039bcabc1dd900c373c108a77c207
Projeto Vercel: caio-mendoncas-projects/zxxr-store-site
Deploy final verificado como Ready: https://zxxr-store-site-enzkbep97-caio-mendoncas-projects.vercel.app

## Código e atualização

O checkout Git de publicação fica em ../work/publish-zxxr-store a partir deste zxxr-store, ou seja, na pasta work do workspace ZAAR _ RAZZ. Ele contém a aplicação ativa na raiz do repositório, Node 22.x, configuração Vite e vercel.json com fallback de SPA. A branch local codex/store-launch acompanha origin/main. Pushes em main disparam o deploy conectado da Vercel; os dois pushes desta entrega foram publicados automaticamente.

O workspace original conserva a identidade, estudos 3D, arquivos históricos, pacotes e a prévia local. O checkout publicado tem 71 arquivos e aproximadamente 4,8 MiB, com fotos originais, logos e fontes utilizadas. Não publica modelos, HDRs, nuvens antigas, ZIPs, capturas, arquivos de ambiente ou dependências locais. Ao continuar o desenvolvimento, sincronize e valide as mudanças no checkout de publicação antes de commit/push; a pasta histórica não é enviada automaticamente.

A CLI da Vercel criou .vercel e .env.local somente no checkout de publicação. Ambos foram confirmados como ignorados e não estão no Git. Não é necessária configuração manual de variáveis para esta prévia.

## Validação

Instalação npm ci, TypeScript, build e 19 testes atuais aprovados. A suíte publicada mantém zoom, sacola, preços, shader e fidelidade aos JPGs; testes dos modelos 3D ficam no workspace histórico. A ordem das declarações de backdrop-filter foi corrigida para conservar o desfoque no CSS minificado, tanto nos cards quanto no modal.

Verificação pública: /, /produto/boca e /sacola retornam HTTP 200. PNG da camiseta, foto do artista, SVG do título e JPG original retornam 200 com tipos corretos. BrowserRouter, frente/costas, seleção de tamanho, inclusão na sacola, subtotal de R$ 100,00 e persistência após recarregar foram conferidos. O item de teste foi removido, deixando a sacola pública vazia.

No navegador: fundo flow/running, cinco imagens da hero carregadas, título preto com uma única linha, cinco cards com desfoque de 24 px, nenhum overflow horizontal em 1440 e 390 px. Console da aplicação publicada sem avisos ou erros. Captura real em previews/public-vercel/hero-publicada.png.

O site permanece uma prévia com noindex, sem checkout, envio de encomenda, frete ou estoque remoto. Nenhuma alteração de DNS ou vínculo ao domínio zxxr.store foi realizada.
