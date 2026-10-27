export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "request_failed") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function requireSameOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("Origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    throw new HttpError(403, "Atualize a página e tente novamente.", "csrf");
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new HttpError(415, "Formato de solicitação inválido.");
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("Content-Length") ?? 0) > 32768)
    throw new HttpError(413, "Solicitação muito grande.");
  const reader = request.body?.getReader();
  if (!reader) return {};
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) {
      await reader.cancel();
      throw new HttpError(413, "Solicitação muito grande.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Confira os dados enviados.");
  }
}
export function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  const known: Record<string, [number, string]> = {
    auth_required: [401, "Entre na sua conta para continuar."],
    email_required: [403, "Confirme seu e-mail para continuar."],
    forbidden: [403, "Seu acesso não permite esta ação."],
    mfa_required: [403, "Confirme o código do autenticador."],
    not_found: [404, "Pedido não encontrado."],
    version_conflict: [
      409,
      "Outra pessoa atualizou este pedido. Recarregue antes de continuar.",
    ],
    price_changed: [
      409,
      "O preço mudou. Confira sua seleção antes de continuar.",
    ],
    unavailable: [409, "Uma peça está indisponível. Revise a sacola."],
    closed: [409, "As encomendas deste lote estão encerradas."],
    invalid_transition: [409, "Esta etapa ainda não pode ser concluída."],
    rate_limited: [
      429,
      "Você já registrou vários pedidos recentemente. Aguarde ou fale com a loja antes de criar outro.",
    ],
    invalid_data: [400, "Confira os dados e as condições desta ação."],
    idempotency_conflict: [
      409,
      "Este pedido já foi registrado com outros dados. Confira seu histórico.",
    ],
  };
  const entry = known[error.message];
  if (entry) throw new HttpError(entry[0], entry[1], error.message);
  throw new HttpError(
    503,
    "Não foi possível consultar a loja. Tente novamente.",
    "service_unavailable",
  );
}
