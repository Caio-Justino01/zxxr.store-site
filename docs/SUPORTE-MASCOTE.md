# Suporte com o mascote — 27/10/2026

O guia reutiliza o mascote XX vermelho original, os dados públicos do catálogo, a sessão e os destinos existentes. Não há serviço de chatbot, nova dependência, banco ou API. O painel é carregado sob demanda.

## Conteúdo e privacidade

- Seis assuntos iniciais, seleção de camisetas claras/pretas e busca local por palavras e sinônimos.
- Respostas revisadas em `src/support/guide.ts`; informações compartilhadas com a Central em `src/config/help-content.ts`.
- Preços e disponibilidade vêm do catálogo consultado pela loja. Sem resposta, o guia informa a falha e oferece nova tentativa; não usa um preço padrão.
- WhatsApp usa o contato configurado. Sem contato válido, há uma mensagem de indisponibilidade. O texto preparado contém apenas o assunto revisado e o nome público da camiseta.
- A pergunta digitada não é incluída no histórico nem enviada a serviços externos. A conversa contém até vinte escolhas, apenas em memória; navegar ou sair da conta a limpa.
- Pedidos e dados privados continuam nas páginas protegidas. O guia não lê nem altera pedidos.

## Comportamento

- Desktop: diálogo não modal de 380 px, com fechamento externo ou Escape.
- Até 767 px: diálogo modal, foco contido, rolagem interna, área segura e adaptação à altura visual disponível.
- Fechar e reabrir na mesma página preserva as escolhas. “Ver assuntos” retorna ao início da conversa.
- No formulário de encomenda, o acionador fica junto ao título. Autenticação, dados pessoais e painel administrativo não exibem o widget.
- Falha no carregamento do painel mantém a loja disponível e oferece Central de ajuda e atendimento.
- Movimento e transparência reduzidos possuem alternativas. Fotos, galerias, pedidos, catálogo e configurações de produção foram preservados.

## Verificação

- 80 testes automatizados aprovados, incluindo busca com acentos, ambiguidade, ausência de catálogo, preços alterados e rotas privadas.
- Testes existentes verificam contato ausente/inválido, métodos habilitados e retorno de login.
- TypeScript e build aprovados.
- Navegador: seis assuntos, busca ambígua/desconhecida, catálogo e links, contexto do produto, reabertura rápida após navegação, preservação da conversa, Escape, foco, fechamento externo e acionador da encomenda.
- Larguras de 320, 390, 1440 e 1920 px conferidas, além de altura reduzida para digitação. Nenhuma rolagem horizontal observada. Celular físico, VoiceOver e Safari não foram testados.
- Prévia compartilha catálogo de validação com bloqueio de acesso aos pedidos reais; sua indicação de encomendas indisponíveis é esperada. Não foram criados pedidos reais nem enviadas mensagens para validar o guia.

Capturas reais ficam em `docs/previews/suporte-mascote/`.

## Publicação conferida

- Código `0ae0bac` enviado ao GitHub (`main` e `codex/contas-pedidos`).
- Implantação Cloudflare de produção: `https://f6f019d0.zxxr-store.pages.dev`.
- Em `https://www.zxxr.store/produto/spiritual-gangsta`, o guia abriu, exibiu as duas camisetas pretas com preços reais de R$ 100 e encaminhou ao contato configurado. A opção de adicionar à sacola permaneceu habilitada e não apareceu aviso de teste.
- Capturas do acionador, conversa e menu móvel feitas no domínio público. Nenhuma mensagem ou encomenda foi enviada nessa conferência.
