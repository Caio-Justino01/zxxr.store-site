import { storefront } from "./storefront.ts";

// One source for the help page and the interactive guide.
export const helpContent = {
  sizes:
    "O drop tem modelagem oversized, com corte amplo. As opções são P, M, G e GG; confira a disponibilidade de cada camiseta antes de adicionar à sacola.",
  sizeAdvice:
    "Veja as fotos em uso e o guia de caimento na página da camiseta. Se tiver dúvida sobre o tamanho, fale com a loja antes de registrar seu pedido.",
  fabric:
    "Você encontra a modelagem, a cor e o acabamento na página da camiseta. Para confirmar composição da malha ou medidas exatas, fale com a loja antes de comprar.",
  care: "Lave a peça do avesso e evite passar o ferro diretamente sobre a estampa. Siga as instruções da etiqueta para conservar a malha e as cores.",
  payment: storefront.paymentNote,
  paymentTotal:
    "O subtotal corresponde às camisetas. O total do pedido é definido após a confirmação do frete. Quando a loja disponibilizar um link de pagamento, ele aparecerá nos detalhes do pedido.",
  delivery: `As camisetas são feitas sob encomenda. ${storefront.deliveryNote}`,
  tracking:
    "Acompanhe o andamento em Meus pedidos. Quando a loja informar a postagem, o código de rastreamento ficará disponível nos detalhes.",
  returns:
    "Para solicitar uma troca, devolução ou alteração, entre em Meus pedidos, abra o pedido e escolha “Solicitar alteração”. Explique o que precisa à equipe pelo WhatsApp.",
  returnsNext:
    "Informe o número do pedido e o motivo da solicitação. A equipe orientará você sobre as condições e os próximos passos aplicáveis ao seu caso.",
  address:
    "Alterar um endereço em Meus dados não modifica o endereço de um pedido já registrado. Solicite a alteração à equipe.",
  buy: "Escolha a camiseta e o tamanho, revise a sacola e entre na sua conta. Depois, preencha seus dados e registre o pedido. A mensagem do WhatsApp só é preparada após o registro; revise e envie para continuar com a loja.",
} as const;
