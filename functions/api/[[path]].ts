import { handleApi, type Env } from "../../server/api";
export function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  return handleApi(context.request, context.env);
}
