import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { CommerceProvider } from "./commerce/CommerceProvider";
import "./commerce/commerce.css";
import "./styles.css";
import "./hero-v6.css";
import "./glass-store.css";
import "./hero-desejos.css";
import "./liquid-glass.css";
import "./brand-theme.css";
import "./storefront.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CommerceProvider>
        <App />
      </CommerceProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
