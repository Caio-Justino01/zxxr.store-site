export const storefront = {
  instagram: {
    label: "Instagram · @zxxr.store",
    href: "https://www.instagram.com/zxxr.store/",
  },
  camisetas: "/#o-drop",
  guia: "/#como-funciona",
  razz: "/#som",
  sacola: "/sacola",
  pedidos: "/conta/pedidos",
  dados: "/conta/dados",
  ajuda: "/ajuda",
  privacidade: "/privacidade",
  paymentNote:
    "O pagamento é combinado no WhatsApp, depois da confirmação do frete e do prazo. Escolher uma forma de pagamento não realiza uma cobrança.",
  deliveryNote:
    "O frete e o prazo de produção e entrega são confirmados no atendimento, antes do pagamento.",
} as const;

export const mainNavigation = [
  { label: "Camisetas", href: storefront.camisetas },
  { label: "Como comprar", href: storefront.guia },
  { label: "Conheça o Razz", href: storefront.razz },
] as const;

export const helpTopics = [
  { id: "como-comprar", label: "Como comprar" },
  { id: "pagamento", label: "Pagamento" },
  { id: "entrega", label: "Entrega" },
  { id: "tamanhos", label: "Tamanhos" },
  { id: "trocas", label: "Trocas e devoluções" },
  { id: "atendimento", label: "Atendimento" },
] as const;

export function accountDestination(
  signedIn: boolean,
  destination: string = storefront.pedidos,
) {
  return signedIn
    ? destination
    : `/entrar?returnTo=${encodeURIComponent(destination)}`;
}

export function offeredPayments(methods: readonly string[] | undefined) {
  return (
    [
      { id: "pix", label: "Pix" },
      { id: "credit", label: "Cartão de crédito" },
      { id: "boleto", label: "Boleto" },
    ] as const
  ).filter((method) => methods?.includes(method.id));
}

export function storeContactLink(
  contact: string | null | undefined,
  message: string,
) {
  return contact && /^55\d{10,11}$/.test(contact)
    ? `https://wa.me/${contact}?text=${encodeURIComponent(message)}`
    : null;
}
