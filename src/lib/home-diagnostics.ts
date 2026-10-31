/** Opt-in, memory-only diagnostics for the public collection. Never sends data. */
export const homeStages = [
  "initialization",
  "home",
  "hero",
  "carousel",
  "background",
  "filters",
  "editorial",
  "guide",
  "music",
  "runtime",
] as const;
export type HomeStage = (typeof homeStages)[number];
export type HomeFault = {
  stage: HomeStage;
  code: string;
  name: string;
  source: string | null;
};

const errorNames = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "URIError",
  "EvalError",
  "DOMException",
  "AggregateError",
]);
const stageOf = (value: HomeStage): HomeStage =>
  homeStages.includes(value) ? value : "runtime";

export function isHomeDiagnosticsEnabled(search: string, pathname = "/") {
  return (
    pathname === "/" &&
    new URLSearchParams(search).get("diagnostico") === "home"
  );
}

/** Browser delivery warnings are not the exception we are trying to locate. */
export function isHomeResizeObserverWarning(message: unknown, error: unknown) {
  return (
    error == null &&
    (message ===
      "ResizeObserver loop completed with undelivered notifications." ||
      message === "ResizeObserver loop limit exceeded")
  );
}

/** Test-only injection is impossible on either official domain. */
export function shouldInjectHomeFault(
  stage: HomeStage,
  hostname: string,
  search: string,
  pathname = "/",
) {
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
  const preview = hostname.endsWith(".zxxr-store.pages.dev");
  return (
    (local || preview) &&
    isHomeDiagnosticsEnabled(search, pathname) &&
    new URLSearchParams(search).get("falha") === stage
  );
}

/** Keep only a known error class and one same-origin compiled asset location. */
export function describeHomeFault(
  stage: HomeStage,
  error: unknown,
  origin: string,
): HomeFault {
  let name = "Error";
  let source: string | null = null;
  try {
    if (error && typeof error === "object") {
      const candidate = error as { name?: unknown; stack?: unknown };
      if (typeof candidate.name === "string" && errorNames.has(candidate.name))
        name = candidate.name;
      if (typeof candidate.stack === "string") {
        const publicOrigin = new URL(origin).origin;
        // Safari starts directly with `function@URL`; Chromium starts with an
        // error description followed by `at function (URL)`. Never drop the
        // first Safari frame, and never treat the description as a stack frame.
        for (const frame of candidate.stack.split("\n").slice(0, 15)) {
          if (!/^\s*at\b|^[^:\n]*@https?:\/\//.test(frame)) continue;
          const marker = `${publicOrigin}/assets/`;
          const start = frame.indexOf(marker);
          if (start < 0) continue;
          const location = frame
            .slice(start + marker.length)
            .match(/^([A-Za-z0-9_.-]+\.m?js):(\d{1,9}):(\d{1,9})(?:\)|\s|$)/);
          if (location) {
            source = `${location[1]}:${location[2]}:${location[3]}`;
            break;
          }
        }
      }
    }
  } catch {
    // Even unusual thrown objects or blocked access must not break the page.
  }
  const safeStage = stageOf(stage);
  return {
    stage: safeStage,
    code: `HOME_${safeStage.toUpperCase()}_FAILURE`,
    name,
    source,
  };
}

let active = false;
let currentStage: HomeStage = "initialization";
let firstFault: HomeFault | null = null;
let updatePanel: (() => void) | null = null;

function onPublicHome() {
  return (
    typeof window !== "undefined" &&
    isHomeDiagnosticsEnabled(window.location.search, window.location.pathname)
  );
}

export function reportHomeStage(stage: HomeStage) {
  if (!onPublicHome()) return;
  currentStage = stageOf(stage);
  updatePanel?.();
}

export function reportHomeFault(
  stage: HomeStage,
  error: unknown,
  _reactInfo?: unknown,
) {
  if (!onPublicHome() || firstFault) return;
  firstFault = describeHomeFault(stage, error, window.location.origin);
  updatePanel?.();
}

/** The panel lives outside React so a failing component cannot remove it. */
export function initHomeDiagnostics(): () => void {
  if (!onPublicHome() || active) return () => {};
  active = true;
  const panel = document.createElement("aside");
  panel.className = "home-diagnostics";
  panel.setAttribute("aria-label", "Diagnóstico temporário da home");
  const title = document.createElement("strong");
  title.textContent = "Diagnóstico da home · sem envio de dados";
  const phase = document.createElement("div");
  const fault = document.createElement("div");
  fault.setAttribute("role", "status");
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copiar diagnóstico";
  copy.addEventListener("click", () => {
    const text = [title.textContent, phase.textContent, fault.textContent].join(
      "\n",
    );
    try {
      if (!navigator.clipboard?.writeText) {
        copy.textContent = "Selecione o texto acima para copiar";
        return;
      }
      void navigator.clipboard.writeText(text).then(
        () => {
          copy.textContent = "Diagnóstico copiado";
        },
        () => {
          copy.textContent = "Selecione o texto acima para copiar";
        },
      );
    } catch {
      copy.textContent = "Selecione o texto acima para copiar";
    }
  });
  panel.append(title, phase, fault, copy);
  document.body.append(panel);
  updatePanel = () => {
    panel.hidden = window.location.pathname !== "/";
    phase.textContent = `Fase: ${currentStage}`;
    fault.textContent = firstFault
      ? `Primeira falha: ${firstFault.code} · ${firstFault.name}${firstFault.source ? ` · ${firstFault.source}` : ""}`
      : "Nenhuma falha registrada nesta abertura.";
  };
  updatePanel();
  const runtimeError = (event: ErrorEvent) => {
    // Messages, event URLs and form values are deliberately excluded.
    if (isHomeResizeObserverWarning(event.message, event.error)) return;
    reportHomeFault("runtime", event.error);
  };
  const rejection = (event: PromiseRejectionEvent) =>
    reportHomeFault("runtime", event.reason);
  window.addEventListener("error", runtimeError);
  window.addEventListener("unhandledrejection", rejection);
  const root = document.getElementById("root");
  let rootWasPopulated = !!root?.childElementCount;
  const observer =
    typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
          if (root?.childElementCount) rootWasPopulated = true;
          else if (rootWasPopulated) reportHomeFault("home", new Error());
          updatePanel?.();
        })
      : null;
  if (root) observer?.observe(root, { childList: true, subtree: true });
  return () => {
    window.removeEventListener("error", runtimeError);
    window.removeEventListener("unhandledrejection", rejection);
    observer?.disconnect();
    panel.remove();
    updatePanel = null;
    active = false;
  };
}
