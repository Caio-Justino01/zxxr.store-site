import { renderToReadableStream, renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "../App";
import { CommerceProvider } from "../commerce/CommerceProvider";
import { ConsentProvider } from "../privacy/ConsentProvider";
import { StoreLaunchGate } from "../components/StoreLaunchGate";
import { Analytics } from "../analytics/Analytics";
import { StrictMode } from "react";

// Keep the same sibling tree as the browser's effect-only HydrationReady node.
function ServerHydrationReady() {
  return null;
}

/** Build-time HTML only. Private customer data is never fetched or serialized. */
export async function renderPublicRoute(path: string): Promise<string> {
  const tree = (
    <StrictMode>
      <ConsentProvider>
        <StaticRouter location={path}>
          <CommerceProvider>
            <StoreLaunchGate>
              <App />
            </StoreLaunchGate>
            <Analytics />
            <ServerHydrationReady />
          </CommerceProvider>
        </StaticRouter>
      </ConsentProvider>
    </StrictMode>
  );
  // Resolve lazy route modules first, then emit a synchronous hydration document.
  // Streaming placeholders need inline $RC scripts, forbidden by our CSP.
  const warmup = await renderToReadableStream(tree, {
    onError(error) {
      throw error;
    },
  });
  await warmup.allReady;
  await new Response(warmup).text();
  const html = renderToString(tree);
  if (html.includes("<!--$?-->") || /<script\b[^>]*>[\s\S]*?\$RC/.test(html)) {
    throw new Error(`Unresolved streaming placeholder in public HTML: ${path}`);
  }
  return html;
}
