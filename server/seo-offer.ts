import { createClient } from "@supabase/supabase-js";
import { isAvailable, productById } from "../src/config/products.ts";
import type { ConfirmedOffer } from "../src/seo/metadata.ts";
import type { Env } from "./api.ts";
import { phoneSchema } from "../src/commerce/contracts.ts";

/** Never publishes an unverified fallback as an Offer. No private session is used. */
export async function confirmedCatalogOffer(
  env: Env,
  productId: string,
): Promise<ConfirmedOffer | undefined> {
  const product = productById(productId);
  if (
    !isAvailable(product) ||
    env.STORE_MODE !== "live" ||
    !env.SUPABASE_URL ||
    !env.SUPABASE_PUBLISHABLE_KEY ||
    !phoneSchema.safeParse(env.STORE_CONTACT).success
  )
    return;
  try {
    const client = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(1200) }),
        },
      },
    );
    const { data, error } = await client.rpc("store_catalog");
    if (error || !data || data.testMode !== false) return;
    const variants = (data.variants ?? []).filter(
      (variant: { product_id: string }) => variant.product_id === productId,
    );
    if (
      variants.length !== 4 ||
      variants.some(
        (variant: { price_cents: number }) =>
          variant.price_cents !== Math.round((product?.price ?? 0) * 100),
      )
    )
      return;
    return {
      priceCents: variants[0].price_cents,
      available:
        !!data.open &&
        variants.some((variant: { active: boolean }) => variant.active),
    };
  } catch {
    /* No Offer is safer than stale commercial metadata. */
  }
}
