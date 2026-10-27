export const storefront = {
  instagram: {
    label: "Instagram · @zxxr.store",
    href: "https://www.instagram.com/zxxr.store/",
  },
  technology: {
    label: "Tecnologia desenvolvida pela Roupla",
    href: "https://www.roupla.com.br/",
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
  { label: "Razz", href: storefront.razz },
  { label: "Ajuda", href: storefront.ajuda },
] as const;

export type StoreNavigationItem =
  | { label: string; kind: "route"; href: string }
  | { label: string; kind: "external"; href: string }
  | { label: string; kind: "support" };
export type StoreNavigationGroup = {
  label: string;
  items: StoreNavigationItem[];
};
export function storeNavigationGroups(
  signedIn: boolean,
  contact?: string | null,
): StoreNavigationGroup[] {
  const route = (label: string, href: string): StoreNavigationItem => ({
    label,
    kind: "route",
    href,
  });
  const whatsapp = storeContactLink(
    contact,
    "Olá! Preciso de ajuda com uma compra na ZXXR.",
  );
  return [
    {
      label: "Comprar",
      items: [
        route("Camisetas", storefront.camisetas),
        route("Como comprar", storefront.guia),
      ],
    },
    {
      label: "Minha conta",
      items: [
        ...(signedIn ? [] : [route("Entrar", accountDestination(false))]),
        route("Meus pedidos", accountDestination(signedIn)),
        route("Meus dados", accountDestination(signedIn, storefront.dados)),
        route("Sacola", storefront.sacola),
      ],
    },
    {
      label: "Ajuda",
      items: [
        route("Central de ajuda", storefront.ajuda),
        { kind: "support", label: "Abrir suporte" },
        ...(whatsapp
          ? [
              {
                kind: "external" as const,
                label: "Falar no WhatsApp",
                href: whatsapp,
              },
            ]
          : []),
      ],
    },
    {
      label: "Sobre",
      items: [
        route("Razz", storefront.razz),
        {
          kind: "external",
          label: "Instagram",
          href: storefront.instagram.href,
        },
        route("Privacidade", storefront.privacidade),
      ],
    },
  ];
}

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
