import { productById, isAvailable } from "../config/products.ts";
import type { Catalog } from "../commerce/contracts.ts";
import { helpContent } from "../config/help-content.ts";

export const supportMascot =
  "/brand/stickers/mascote-xx-com-rosto-vermelho.svg";
export type TopicId =
  | "choose"
  | "sizes"
  | "paymentDelivery"
  | "orders"
  | "returnsCare"
  | "social"
  | "buy"
  | "payment"
  | "delivery"
  | "fabric"
  | "returns"
  | "care"
  | "access"
  | "product";
export type ProductFilter = "all" | "light" | "dark";
export type SupportAction =
  | { kind: "topic"; label: string; topic: TopicId }
  | { kind: "products"; label: string; filter: ProductFilter }
  | { kind: "route"; label: string; to: string }
  | { kind: "orders"; label: string }
  | { kind: "whatsapp"; label: string }
  | { kind: "instagram" | "spotify" | "product"; label: string };
type Topic = {
  title: string;
  answer: readonly string[];
  actions: readonly SupportAction[];
  keywords: readonly string[];
};
const topic = (label: string, id: TopicId): SupportAction => ({
  kind: "topic",
  label,
  topic: id,
});
const orders: SupportAction = { kind: "orders", label: "Acessar meus pedidos" };
export const supportTopics: Record<TopicId, Topic> = {
  choose: {
    title: "Escolher camiseta",
    answer: [
      "Qual combina com você? Escolha uma cor para ver as camisetas do drop.",
    ],
    keywords: [
      "camiseta",
      "camisa",
      "estampa",
      "produto",
      "frente",
      "costas",
      "modelo",
      "claras",
      "pretas",
    ],
    actions: [
      { kind: "products", label: "Claras", filter: "light" },
      { kind: "products", label: "Pretas", filter: "dark" },
      { kind: "products", label: "Ver todas", filter: "all" },
      topic("Como registrar o pedido", "buy"),
    ],
  },
  sizes: {
    title: "Tamanho e caimento",
    answer: [helpContent.sizes, helpContent.sizeAdvice],
    keywords: [
      "tamanho",
      "tamanhos",
      "caimento",
      "medida",
      "medidas",
      "oversized",
      "vestir",
    ],
    actions: [
      { kind: "route", label: "Ver camisetas", to: "/#o-drop" },
      topic("Sobre a malha", "fabric"),
      { kind: "whatsapp", label: "Pedir ajuda com o tamanho" },
    ],
  },
  paymentDelivery: {
    title: "Pagamento e entrega",
    answer: [
      "O pedido começa no site. A loja confirma o frete, o prazo e o pagamento com você no WhatsApp.",
    ],
    keywords: [],
    actions: [
      topic("Como pagar", "payment"),
      topic("Frete e prazo", "delivery"),
      topic("Registrar meu pedido", "buy"),
    ],
  },
  orders: {
    title: "Meu pedido",
    answer: [
      helpContent.tracking,
      "Para conferir o pagamento e as condições combinadas, abra os detalhes do pedido. A confirmação do pagamento é feita pela loja.",
    ],
    keywords: [
      "rastreio",
      "rastrear",
      "rastreamento",
      "acompanhar",
      "status",
      "paguei",
      "comprovante",
      "atrasado",
      "meu pedido",
      "minha compra",
      "minha encomenda",
    ],
    actions: [
      orders,
      topic("Preciso alterar meu pedido", "returns"),
      topic("Ajuda para entrar na conta", "access"),
    ],
  },
  returnsCare: {
    title: "Trocas e cuidados",
    answer: [
      "Quer solicitar uma alteração ou saber como cuidar da sua camiseta?",
    ],
    keywords: [],
    actions: [
      topic("Troca ou alteração", "returns"),
      topic("Cuidados com a peça", "care"),
    ],
  },
  social: {
    title: "Instagram e Razz",
    answer: [
      "Acompanhe a ZXXR no Instagram e conheça o artista por trás do drop Desejos.",
    ],
    keywords: [
      "instagram",
      "rede social",
      "redes sociais",
      "razz",
      "spotify",
      "musica",
      "criador",
      "desejos",
    ],
    actions: [
      { kind: "instagram", label: "Instagram · @zxxr.store" },
      { kind: "route", label: "Conheça o Razz", to: "/#som" },
      { kind: "spotify", label: "Ouvir Razz no Spotify" },
    ],
  },
  buy: {
    title: "Como comprar",
    answer: [helpContent.buy],
    keywords: [
      "comprar",
      "como compro",
      "sacola",
      "carrinho",
      "finalizar",
      "registrar",
      "fazer pedido",
      "fazer uma compra",
    ],
    actions: [
      { kind: "route", label: "Revisar minha sacola", to: "/sacola" },
      topic("Escolher camiseta", "choose"),
      topic("Pagamento e entrega", "paymentDelivery"),
    ],
  },
  payment: {
    title: "Como pagar",
    answer: [helpContent.payment, helpContent.paymentTotal],
    keywords: [
      "pix",
      "cartao",
      "credito",
      "boleto",
      "pagamento",
      "pagar",
      "parcelamento",
      "parcela",
      "desconto",
      "preco",
      "valor",
    ],
    actions: [orders, { kind: "whatsapp", label: "Falar sobre pagamento" }],
  },
  delivery: {
    title: "Frete e prazo",
    answer: [
      helpContent.delivery,
      "Frete a confirmar não significa frete grátis. As condições são combinadas antes de pagar.",
    ],
    keywords: [
      "frete",
      "prazo",
      "entrega",
      "envio",
      "cep",
      "transportadora",
      "correios",
      "chegar",
      "demora",
    ],
    actions: [
      orders,
      { kind: "whatsapp", label: "Consultar entrega com a loja" },
    ],
  },
  fabric: {
    title: "Sobre a malha",
    answer: [helpContent.fabric],
    keywords: [
      "malha",
      "tecido",
      "algodao",
      "gramatura",
      "material",
      "composicao",
      "qualidade",
      "amarrota",
    ],
    actions: [
      { kind: "whatsapp", label: "Confirmar detalhes da malha" },
      { kind: "route", label: "Ver camisetas", to: "/#o-drop" },
    ],
  },
  returns: {
    title: "Troca ou alteração",
    answer: [helpContent.returns, helpContent.address],
    keywords: [
      "troca",
      "trocar",
      "devolver",
      "devolucao",
      "cancelar",
      "cancelamento",
      "alterar",
      "endereco",
      "estorno",
      "reembolso",
    ],
    actions: [
      orders,
      { kind: "route", label: "Ver orientações de troca", to: "/ajuda#trocas" },
    ],
  },
  care: {
    title: "Cuidados com a peça",
    answer: [helpContent.care],
    keywords: [
      "lavar",
      "lavagem",
      "cuidar",
      "cuidados",
      "ferro",
      "conservar",
      "secar",
    ],
    actions: [{ kind: "whatsapp", label: "Tirar dúvida sobre a peça" }],
  },
  access: {
    title: "Ajuda com a conta",
    answer: [
      "Entre com Google ou com seu e-mail e senha para registrar e acompanhar pedidos. Se esqueceu a senha, solicite as instruções de recuperação na página de acesso.",
    ],
    keywords: [
      "login",
      "senha",
      "email",
      "cadastro",
      "conta",
      "acesso",
      "google",
      "entrar",
    ],
    actions: [
      orders,
      {
        kind: "route",
        label: "Recuperar meu acesso",
        to: "/recuperar-acesso?returnTo=%2Fconta%2Fpedidos",
      },
    ],
  },
  product: {
    title: "Sobre esta camiseta",
    answer: [
      "Veja a frente, as costas e o ensaio na página da peça. A escolha do tamanho e a inclusão na sacola continuam por lá.",
    ],
    keywords: [],
    actions: [
      { kind: "product", label: "Ver a camiseta" },
      topic("Tamanho e caimento", "sizes"),
      topic("Sobre a malha", "fabric"),
    ],
  },
};
export const mainTopics: TopicId[] = [
  "choose",
  "sizes",
  "paymentDelivery",
  "orders",
  "returnsCare",
  "social",
];
type GuideContent =
  | { kind: "topic"; topic: TopicId }
  | { kind: "products"; filter: ProductFilter }
  | { kind: "search"; topics: TopicId[] };
export type NewGuideEntry = { label: string } & GuideContent;
export type GuideEntry = { id: number } & NewGuideEntry;

export function normalizeQuestion(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\be[\s-]+mail\b/g, "email")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function findSupportTopics(value: string): TopicId[] {
  const query = normalizeQuestion(value);
  if (!query) return [];
  if (
    ["pedido", "pedidos", "encomenda", "encomendas", "compra"].includes(query)
  )
    return ["buy", "orders"];
  return (Object.keys(supportTopics) as TopicId[])
    .map((id) => ({
      id,
      score: supportTopics[id].keywords.reduce(
        (score, word) =>
          score +
          (new RegExp(`(?:^| )${word}s?(?: |$)`).test(query)
            ? word.split(" ").length
            : 0),
        0,
      ),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((hit) => hit.id);
}
export function supportProductState(
  productId: string,
  catalog: Catalog | null,
) {
  if (!isAvailable(productById(productId))) return { priceCents: null, varied: false, available: false };
  const variants =
    catalog?.variants.filter(
      (v) =>
        v.product_id === productId &&
        v.active &&
        Number.isInteger(v.price_cents) &&
        v.price_cents > 0,
    ) ?? [];
  const prices = variants.map((v) => v.price_cents);
  return {
    priceCents: prices.length ? Math.min(...prices) : null,
    varied: new Set(prices).size > 1,
    available: !!catalog?.open && variants.length > 0,
  };
}
export function supportRoute(path: string): "floating" | "inline" | "hidden" {
  if (path === "/encomenda") return "inline";
  if (
    path === "/" ||
    path === "/sacola" ||
    path === "/ajuda" ||
    path === "/privacidade" ||
    /^\/produto\/[^/]+$/.test(path) ||
    /^\/conta\/pedidos(?:\/[^/]+)?$/.test(path)
  )
    return "floating";
  return "hidden";
}
