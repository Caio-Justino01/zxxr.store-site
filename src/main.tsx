import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { CommerceProvider } from "./commerce/CommerceProvider";
import { ConsentProvider } from "./privacy/ConsentProvider";
import { Analytics } from "./analytics/Analytics";
import { StoreLaunchGate } from "./components/StoreLaunchGate";
import { initHomeDiagnostics, reportHomeFault } from "./lib/home-diagnostics";
import "./commerce/commerce.css";
import "./styles.css";
import "./hero-v6.css";
import "./glass-store.css";
import "./hero-desejos.css";
import "./liquid-glass.css";
import "./brand-theme.css";
import "./storefront.css";
import "./support/support.css";
import "./responsive-store.css";
function HydrationReady() {
  return null;
}
const application = (
  <React.StrictMode>
    <ConsentProvider>
      <BrowserRouter>
        <CommerceProvider>
          <StoreLaunchGate>
            <App />
          </StoreLaunchGate>
          <Analytics />
          <HydrationReady />
        </CommerceProvider>
      </BrowserRouter>
    </ConsentProvider>
  </React.StrictMode>
);
const root = document.getElementById("root")!;
initHomeDiagnostics();
const rootOptions = {
  onUncaughtError: (error: unknown) => {
    reportHomeFault("runtime", error);
    console.error(error);
  },
};
if (document.documentElement.dataset.seoPrerendered === "true")
  hydrateRoot(root, application, rootOptions);
else createRoot(root, rootOptions).render(application);
