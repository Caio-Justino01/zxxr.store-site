# Validação do banner da quadra

Implementado em 25/10/2026 no fechamento de DropEditorial, substituindo a faixa “Encontrou a sua?”. O banner aparece depois dos cinco produtos e antes do guia.

## Imagem

- Fonte original preservada: assets-originals/campaign/ensaiodrop1zxxrfoto06-original.png, 1086 x 1448.
- Master: ../entrega/ensaiodrop1zxxr/banner-quadra-v1/ensaiodrop1zxxrfoto06-banner-v1.png, 1920 x 800.
- Laterais preparadas com a ferramenta integrada image_gen. Pessoas e estampas recompostas da fotografia original, sem gerar letras novamente.
- Região opaca protegida: x=708, y=0, largura=536, altura=800. A comparação dos pixels do WebP desktop contra a fonte redimensionada passou com diferença zero nessa área, que contém as três pessoas.
- Mobile usa a fonte vertical completa. A comparação do WebP de 1086 px contra a fonte original passou com diferença zero.
- Os cinco arquivos WebP são sem perda e sem transparência. Variantes desktop: 960/1440/1920; portrait: 640/1086. Carregamento lazy.

## Navegador

- Desktop: viewports CSS 1440 x 900 e 1920 x 1080; panorama na proporção 12:5.
- Celular: 391 x 844 e 320 x 568; fotografia original na proporção 3:4. A largura de 391 px corresponde ao teste aproximado de 390 px sob o zoom atual do navegador.
- Não houve overflow horizontal. A imagem preenche a largura disponível e as três pessoas permanecem completas.
- O intervalo entre o fim do banner e a seção do guia é zero, considerando arredondamento inferior a 0,001 px.
- Sem posição fixa, overlays, links, texto ou animação no banner.
- Console sem erros ou avisos na revisão.
- Capturas reais: previews/court-banner-desktop.png e previews/court-banner-mobile.png. As capturas completas também foram preservadas.

## Código e escopo

- TypeScript: aprovado.
- Testes: 48 aprovados, incluindo três novos testes de dimensões e preservação da fotografia.
- Build Vite: aprovado, exit code 0.
- Comparação do backup confirmou que DropEditorial recebeu somente o import do novo componente e a substituição do fechamento.
- Hashes de App, MusicSection, produtos, leitura dos produtos, CloudCollection e DropGuide permaneceram iguais.

Registros de origem e prompts estão na pasta de entrega do banner. O viewport temporário do navegador foi restaurado ao final da revisão.
