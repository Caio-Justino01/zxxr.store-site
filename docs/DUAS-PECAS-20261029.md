# Desejos — duas disponíveis e três no gelo

29/10/2026. Emoção (R$ 149,90) e Spiritual Gangsta (R$ 169,90) ficam disponíveis. Flores, Yaji e ZXXR passam a “Em breve”, sem data de lançamento.

## Apresentação

O cadastro Product tem `releaseStatus: available | coming-soon`. O mesmo estado controla hero, roleta, páginas, detalhes rápidos, recomendações, fichas, suporte e sacola. Os preços futuros permanecem armazenados para administração e histórico, mas não são renderizados nas apresentações públicas das três futuras.

`FrozenGarment` reutiliza a marca de gelo existente e os recortes originais. Os blocos 4:5 usam superfícies CSS, veios SVG, granulação, bordas, espessura aparente e reflexos. As imagens não foram alteradas ou deformadas. No mouse, o bloco inclina até 3° e o reflexo acompanha o cursor; no toque, o bloco central tem destaque estável, preservando o arraste. Movimento reduzido não inclina o gelo. Não há descongelamento.

O espaço do arco considera os blocos verticais. A roleta limita a largura também pela altura disponível para manter a peça inteira em telas baixas. Abertura, posicionamento, scroll, balanço e inclinação do gelo continuam em camadas próprias.

As duas apresentações de compra vêm primeiro. A seção `#proximos-desejos` apresenta os três blocos com nome e “Este desejo fica para o próximo lançamento. Em breve.” As rotas individuais futuras preservam seus URLs e oferecem acesso às duas disponíveis, sem preços, tamanhos, ficha comercial ou compra.

## Disponibilidade e pedidos

A migration `202610290001_two_piece_launch.sql` foi aplicada no Supabase conectado. A execução comparou impressões digitais dos pedidos e dos campos das variantes fora de `active`, cancelando a transação se houvesse mudança fora da disponibilidade. A API pública confirmou quatro variantes ativas de Emoção, quatro de Spiritual Gangsta e zero ativas de cada futura. Preços, SKUs e pedidos anteriores foram preservados.

O reducer impede adicionar ou aumentar futuras. Linhas antigas continuam removíveis, sem preço e fora do subtotal. A sacola exige removê-las antes de continuar; checkout direto e a preparação de encomenda também bloqueiam essas peças. O servidor rejeita variantes inativas, inclusive requisições antigas ou manipuladas. Não foram criados pedidos de teste na operação real.

## Validação e entrega

- 94 testes do projeto de trabalho aprovados, incluindo limites dos blocos/arco, sacolas antigas, subtotal, bloqueio de encomendas futuras, migration idempotente, preservação de pedidos e preços. Testes do checkout de publicação também passaram. TypeScript, build e diff check aprovados.
- Navegador: 320, aproximadamente 390, 768, 1024 e 1440 px sem overflow. Três blocos na hero, somente duas ações de adicionar nas apresentações e nenhum preço na seção futura.
- Flores, Yaji e ZXXR em rotas diretas sem preço ou compra. Suporte e detalhes rápidos também não revelam valores; Escape fecha o modal e devolve o foco.
- Sacola isolada em memória com cinco peças: três futuras sem valor, subtotal R$ 319,80, continuação bloqueada. Após remover as três futuras, as duas disponíveis permanecem e a continuação é liberada. A sacola real do navegador não foi alterada.
- Arraste nativo e volta completa de cinco passos da roleta aprovados. Retorno da página de Flores mantém sua seleção; descer e subir restauram a apresentação pelo scroll. Mouse produziu inclinação/reflexo; no cenário de movimento reduzido permaneceu estático.
- Capturas em `previews/duas-pecas-20261029/`: hero desktop, hero celular e Próximos desejos no tablet. Harness local `work/duas-pecas-qa/`, com armazenamento em memória e API fictícia, fora da entrada de produção. Não substitui teste físico em aparelho/Safari.

A captura da tela privada do Supabase foi bloqueada pela revisão automática; a evidência remota utiliza apenas o catálogo público. Nenhuma captura alternativa dessa tela foi realizada.

Base anterior preservada em `work/antes-duas-pecas-20261029/`. Código sincronizado no checkout local de publicação. Sem commit, push ou deploy. A restrição de disponibilidade já está ativa no banco; a nova apresentação congelada depende da próxima publicação do frontend.
