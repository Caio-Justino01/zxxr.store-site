import { handleLaunchGate } from "../server/launch-gate.ts";
import { handleSeoRequest } from "../server/seo.ts";
import { secureResponse } from "../server/security.ts";
import { confirmedCatalogOffer } from "../server/seo-offer.ts";
import type { Env } from "../server/api.ts";
export const onRequest: typeof handleLaunchGate = async (context) =>
  secureResponse(
    await handleSeoRequest({
      ...context,
      confirmedOffer: (id) =>
        confirmedCatalogOffer(context.env as typeof context.env & Env, id),
      next: () => handleLaunchGate(context),
    }),
    context.request,
  );
