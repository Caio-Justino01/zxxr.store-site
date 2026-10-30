# ZXXR — matriz compartilhada de gelo v7

Esta versão usa o mesmo bloco de gelo em Flores, Yaji e ZXXR. As três peças recebem as mesmas bordas, superfície frontal e gravação, mantendo os recortes originais entre as camadas.

## Conferir a apresentação

- Loja local: http://127.0.0.1:5274/
- Comparação do pacote pelo servidor local: http://127.0.0.1:5274/entrega/matriz-gelo-v7-20261029/comparacao.html
- Também é possível abrir `comparacao.html` diretamente no navegador. As imagens e a folha de estilo estão dentro do pacote.

A comparação mostra as três futuras lado a lado, com a atmosfera pausada. A loja mantém carrossel, controles e efeitos de interação.

## Composição

O bloco é composto em 2D por `shell`, recorte da camiseta, `front` e `engraving`, nessa ordem. Os três PNGs compartilhados têm 1440 × 1080 px. Cada camada também possui WebPs transparentes de 640, 1024 e 1440 px de largura.

Os recortes utilizados são Flores pela frente, Yaji pelas costas e ZXXR pelas costas. A janela da camiseta usa os parâmetros compartilhados de largura 76% e altura nominal 74%; o CSS atual ajusta a margem vertical da janela e mantém a proporção do recorte com `object-fit: contain`. A gravação já está posicionada no canvas completo da camada `engraving`.

O pacote copia a folha `frozen-garment.css` da apresentação local. Transparência, sobreposição, suavização e posição das camadas na comparação vêm dessa mesma folha, sem novo desenho da estampa.

Trata-se de uma composição de imagens com profundidade visual. Não é uma nova simulação 3D de gelo ou tecido.

## Conteúdo do pacote

- `material/`: três PNGs compartilhados e nove WebPs responsivos.
- `camisetas/`: os três recortes originais utilizados, sem alterar seus pixels.
- `styles/frozen-garment.css`: folha de estilo usada pela comparação.
- `comparacao.html`: comparação estática independente do React.
- `manifest.json`: origem dos recortes, parâmetros e hashes dos arquivos exportados.
- `capturas/`: capturas da loja, quando adicionadas após a conferência final.
- `proveniencia/prompts.json`: prompts finais, quando fornecidos junto à entrega.

As versões anteriores permanecem preservadas. O script `node scripts/package-ice-v7.mjs` pode ser executado novamente sem remover arquivos; `--with-previews` acrescenta as capturas prontas de `previews/matriz-gelo-v7/`. O script não cria ZIP.

## Verificação e limites

As camadas têm transparência e enquadramento 4:3. O teste da superfície frontal compara a transparência média central à da face e impede a regressão do buraco transparente no centro. Os testes também verificam as vistas corretas dos recortes.

Os 118 testes da suite final passaram, assim como TypeScript e build. A validação responsiva e as medições finais ficam registradas nas capturas e no relatório da implementação.

Na conferência final, as larguras de 320, 390, 768, 1024 e 1440 px ficaram sem rolagem horizontal. Miniaturas permanecem estáticas; com movimento reduzido, os efeitos ficam desativados e a névoa pausada. Falhas no recorte original ou na superfície frontal exibem o nome da peça e “Em breve”, sem voltar aos renders individuais v6.

A composição de ZXXR usa o recorte original das costas, mantendo a posição da estampa. Sua página futura permanece sem preço ou compra. As capturas incluem a matriz sobre fundos azul, branco e escuro, a hero com as disponíveis e as futuras, além da página de ZXXR. `capturas/responsivo.json` e `capturas/compatibilidade.json` registram as conferências.

Esta revisão preserva catálogo comercial, preços, tamanhos, disponibilidade, pedidos e sacola. Emoção e Spiritual Gangsta continuam disponíveis; as outras três continuam futuras. Não há credenciais, dados de pedidos ou conteúdo da sacola real neste pacote.

Sem alteração de banco ou publicação. A prévia local não confirma um novo deploy.
