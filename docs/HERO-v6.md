# Hero v6 — fluxo azul e branco

A hero substitui todas as fotografias de nuvens por um fundo procedural animado. As cinco camisetas continuam sendo os recortes originais completos em HTML, com o mesmo cadastro, posições das estampas, navegação, vistas, zoom e sacola da v5. O shader não lê nem modifica imagens dos produtos.

## Direção e procedência

Paleta: azul `#3A83F7`, azul claro `#8FCAFF` e branco `#F5FAFF`. As cores são combinadas por interpolação convexa: o fundo não acrescenta preto, vinheta ou faixa inferior. A interface da hero usa grafite `#0B1628`, com contraste mínimo calculado de 4,98:1 sobre a cor mais escura da paleta. O selo Razz permanece preto. A sombra discreta externa das roupas é preservada para separar a silhueta das áreas brancas.

O shader é código próprio inspirado na demonstração pública de [Background Gradient Shader, Nikolas Sapa](https://21st.dev/@nikolas-sapa/components/background-gradient-shader). A alternativa de ondas usa a referência visual [Shader 0cfd140c, Dobotox](https://21st.dev/@dobotox/components/shader-0cfd140c). Nenhum código bloqueado por login foi copiado, e nenhuma conta ou dependência externa foi adicionada. As páginas de referência identificam suas bibliotecas como MIT; o código desta implementação foi escrito no projeto.

## Implementação e ciclo

- `GradientBackdrop` controla um canvas WebGL1 decorativo e opaco, atrás da hero, com `aria-hidden`, sem foco ou captura de ponteiros.
- `gradient-renderer` desenha um triângulo de tela inteira. O fluxo usa ruído suave e domain warp em formas amplas; não há granulação sobreposta ou textura raster ampliada.
- O fluxo exige precisão `highp`. Falha de compilação ou precisão insuficiente tenta o shader simples de ondas. Falha completa deixa o fundo CSS estático azul e branco. Perda de contexto oculta o canvas; restauração reconstrói recursos e redesenha.
- `ResizeObserver` dimensiona o buffer pelo tamanho real da hero e DPR: limite de 2 em computador/tablet e 1,5 até 699px. A resolução do fundo é independente da resolução nativa das roupas.
- Um único RAF fica ativo enquanto a hero está visível e a aba está em primeiro plano. Fora de uso, é cancelado. A preferência de movimento reduzido desenha somente um quadro e respeita mudanças em tempo de execução.
- Desmontagem remove observadores, eventos, RAF, buffer e programa. O componente suporta montagem repetida do React StrictMode.

`data-background-mode` informa `flow`, `waves` ou `css`; `data-background-state` informa `running`, `paused`, `static`, `fallback` ou `context-lost`. Esses atributos são diagnóstico, não controles da experiência de compra.

## Compatibilidade e preservação

O grafo ativo contém um canvas nativo exclusivamente para o fundo. Não carrega Three.js, Studio, GLBs, as fotografias `clouds-v5` ou o componente antigo `SkyBackdrop`. Os ativos antigos permanecem arquivados no projeto e nos pacotes anteriores.

O CSS ativo da hero é `hero-v6.css`; a v5 original continua em `hero-v5.css` e no pacote v5. A cópia de trabalho anterior está em `work/hero-v5-preservada/`. A documentação histórica da validação foi preservada em `VALIDACAO-v5.md`, e a validação atual fica em `VALIDACAO.md`.

As roupas continuam com a resolução dos arquivos fornecidos. Este fundo não acrescenta detalhe às estampas nem cria fotografias de novos ângulos. A entrega segue sendo um protótipo local, sem pagamento, estoque ou encomenda real.
