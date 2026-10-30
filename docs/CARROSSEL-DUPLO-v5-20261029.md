# ZXXR — carrossel duplo v5

Prévia local: http://127.0.0.1:5274/ — alteração local, sem publicação.

## Composição e navegação

- Duas peças centrais a partir de 768 px, uma abaixo disso. Abertura em Emoção + Spiritual Gangsta.
- Sequência circular Flores → Yaji → Emoção → Spiritual Gangsta → ZXXR, avançando uma posição por comando ou gesto.
- Prévias pequenas nas laterais; imagem e balão movem-se como uma unidade. Os balões têm altura comum e ficam alinhados.
- Setas, teclado, arraste com distinção horizontal/vertical, retorno da página de produto e seleção preservada ao mudar a largura.
- Abertura, pular abertura e scroll reversível preservados. Sem avanço automático.
- Cursor amortecido: até 1,8 grau, 3 px e escala 1,01; retorno de 1,1 s sem rebote. Reflexo desvanece em 1,25 s.

## Refinamento solicitado durante a implementação

- Balões transparentes, arredondados e finos: 72 px no desktop e 82 px nas larguras menores. Borda com luz localizada e reflexo discreto do cursor.
- Na hero, disponíveis mostram cor/modelagem, nome e Explorar peça. Preços continuam nas áreas comerciais, não nos balões da hero.
- Futuras mostram nome e Em 2027, conforme indicação do usuário. Pequeno Em breve sobre o topo do gelo, como gravação, em camada HTML editável.
- Gelo com menor saturação/contraste, véu azul translúcido recortado pelo alpha, reflexo atenuado e frio restrito à região dos blocos. Os PNGs/WebPs aprovados não foram reeditados.
- Emoção e Spiritual ficam retas em repouso, com leve recuperação de bordas no navegador e contraste de 1,035. Não há desfoque nem compressão adicional dos recortes.

## Qualidade das imagens

As imagens da hero continuam sendo os recortes originais transparentes. Emoção/costas tem 917 × 701 px; Spiritual/costas, 761 × 573 px. Foram preservados cor, estampa, proporções e modelagem boxy. O filtro leve atua apenas na apresentação, sem gerar novas letras, costuras ou tecido.

Essa melhoria de leitura não cria detalhe real ausente nos mockups. Uma entrega fotográfica 4K exigirá arquivos maiores ou fotografia das peças; ampliar os mesmos pixels não equivale a isso.

## Verificações

- 98 testes passaram na fonte; 94 passaram no checkout de publicação. TypeScript e build passaram nos dois.
- Geometria do carrossel testada em 320, 390, 768, 1024, 1366, 1440, 1600 e 2560 px; continuidade circular e prévias sem saltos visíveis.
- Inspeção no navegador em 320, 390, 768, 1024, 1366, 1440 e 2560 px: nenhum overflow horizontal, texto dentro dos balões e alturas alinhadas. Evidência em previews/carrossel-duplo-v5/responsivo.json.
- Conferidos avanço circular, troca rápida, arraste, teclado, abertura de produto e histórico, mudança de largura, scroll e retorno ao topo.
- Movimento reduzido: troca imediata, gelo sem partículas animadas; falha de imagem conserva identificação legível e navegação.
- A sacola real permaneceu com dois itens. Testes de falhas/movimento reduzido usam harness isolado e armazenamento em memória.
- Conferência responsiva por viewport do navegador; não constitui teste em aparelhos físicos ou Safari.

## Preservação e limites

- Cadastro Product, preços, tamanhos, rotas, banco, pedidos e chave da sacola não foram alterados nesta revisão.
- SHA-256 do cadastro antes/depois: CBE7DEEF6DA7FBE46DBA4C62385F981AE8ED3192868EE2F5B79B2574F0DC5EE2.
- Backup anterior ao carrossel: work/antes-carrossel-duplo-v5-20261029/. Backup anterior ao vidro fino: work/antes-vidro-fino-v5-20261029/.
- O checkout work/publish-zxxr-store recebeu apenas os arquivos desta revisão, mantendo suas outras alterações anteriores. Sem commit, push, deploy ou migração nesta etapa.
- A API comercial não está disponível no Vite local; catálogo estático permite conferir a apresentação. Não foi feita alteração nem verificação de integração remota.

## Capturas

- desktop-1440.png: dupla inicial.
- tablet-768.png: duas peças e balões alinhados.
- mobile-390.png: peça central, vizinhas e controles.
- gelo-discreto-desktop.png: Spiritual ao lado de ZXXR congelada.

Arquivos em previews/carrossel-duplo-v5/ e cópia no pacote entrega/carrossel-duplo-v5-20261029/.
