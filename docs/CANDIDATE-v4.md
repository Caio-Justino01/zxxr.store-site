# Avaliação da base externa — 19/10/2026

## Resultado

O candidato **Oversized t-shirt**, de **kylelhb**, está indisponível na fonte oficial. A página aberta no navegador apresenta **“Model deleted”** e explica que o modelo foi excluído. Não foi feito download, importação ou uso de cópia de terceiros.

- Página oficial: https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7
- Prova capturada: `work/external-garment-candidate/sketchfab-model-deleted.png`
- Consulta direta pelo leitor web: HTTP 403.
- Verificação no navegador: página pública de exclusão do modelo, sem malha ou botão de download.

## Metadados históricos e licença

O índice de busca ainda contém um retrato antigo da própria página do Sketchfab: publicação em 14/02/2024, aproximadamente **426,4 mil triângulos**, **213,2 mil vértices** e licença **CC Attribution**. Esses dados não comprovam a disponibilidade atual e não permitem validar uma malha que não foi obtida.

A licença CC BY 4.0 permite adaptação e uso comercial mediante atribuição, link à licença e indicação das alterações. A versão exata de licença aplicada ao arquivo original precisaria ser confirmada no download/página disponível antes de distribuí-lo; o cache apenas apresenta “CC Attribution”. Fonte dos termos gerais: https://creativecommons.org/licenses/by/4.0/

Se este candidato voltar a ficar disponível e for efetivamente utilizado, manter no pacote uma atribuição com título, autor, URL, licença exata e descrição das alterações. Nenhum crédito a ele foi inserido como autor dos modelos próprios deste projeto.

## Limites desta avaliação

Sem arquivo oficial, **topologia, UVs, gola, aberturas, espessura, corte, animação e capacidade de otimização não puderam ser inspecionados**. Não existe comparação visual neutra válida entre este candidato e os modelos v3. O número de polígonos do cache também não demonstra realismo ou qualidade de construção.

## Decisão para a implementação

Prosseguir com a correção/reconstrução das bases próprias, preservando o rastreamento dos contornos das referências. Primeiro validar a peça Boca em material neutro, parada, nas vistas frontal, traseira, perfil e três quartos; isolar depois gola/costuras/morphs para reproduzir o defeito quadrado. Não adotar um modelo externo apenas por estar descrito como oversized, nem substituir o renderer como solução para geometria incorreta.

Esta avaliação não certifica os modelos v3 como aprovados: a fidelidade do corte, repouso e movimentos permanece sujeita à inspeção visual da implementação.
