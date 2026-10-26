// Historical prelaunch preview, available only through an explicit build mode.
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./PrelaunchApp";
import "./styles.css";
import "./hero-v6.css";
import "./glass-store.css";
import "./hero-desejos.css";
import "./liquid-glass.css";
import "./brand-theme.css";
import "./prelaunch.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>,
);
