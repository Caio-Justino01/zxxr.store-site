import React from "react";
import { createRoot } from "react-dom/client";
import { LaunchPreview } from "./LaunchPreview";
import {
  ConsentProvider,
  ConsentSettingsButton,
} from "../src/privacy/ConsentProvider";
import { WaitingAnalytics } from "../src/analytics/Analytics";
import "./launch-preview.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConsentProvider>
      <LaunchPreview />
      <WaitingAnalytics />
      <div className="waiting-privacy">
        <a href="/privacidade">Privacidade</a>
        <ConsentSettingsButton />
      </div>
    </ConsentProvider>
  </React.StrictMode>,
);
