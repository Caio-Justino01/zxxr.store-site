export class ApiError extends Error {
  status: number;
  code: string;
  fields: { path: string; message: string }[];
  constructor(
    status: number,
    message: string,
    code = "request_failed",
    fields: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(
      0,
      "Sem conexão com a loja. Confira sua internet e tente novamente.",
      "offline",
    );
  }
  if (!response.headers.get("Content-Type")?.includes("application/json"))
    throw new ApiError(
      503,
      "O acesso às contas está em preparação. Sua sacola continua salva.",
      "not_configured",
    );
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error?.message || "Não foi possível concluir. Tente novamente.",
      body.error?.code,
      body.error?.fields,
    );
  return body as T;
}
export const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
export function post<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body), headers });
}
