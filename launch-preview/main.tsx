import React from "react";
import { createRoot } from "react-dom/client";
import { LaunchPreview } from "./LaunchPreview";
import "./launch-preview.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LaunchPreview />
  </React.StrictMode>,
);
