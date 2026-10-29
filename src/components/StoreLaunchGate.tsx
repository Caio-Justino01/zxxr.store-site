import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { readLaunchStatus } from "../../launch-preview/launch-state.ts";

const accountRoute =
  /^\/(?:entrar|cadastro|recuperar-acesso|conta|painel|ajuda|privacidade)(?:\/|$)/;
export function StoreLaunchGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [checked, setChecked] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const exempt = accountRoute.test(pathname);
  useEffect(() => {
    if (exempt) return;
    const controller = new AbortController();
    let timer: number;
    const check = async () => {
      try {
        const response = await fetch("/api/launch", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const status = readLaunchStatus(await response.json());
        if (controller.signal.aborted) return;
        if (status.enabled && !status.isOpen) window.location.reload();
        else {
          setChecked(pathname);
          setFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          timer = window.setTimeout(check, 3000);
        }
      }
    };
    void check();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [pathname, exempt]);
  if (exempt || checked === pathname) return children;
  return (
    <main className="account-page">
      <p role="status">
        {failed
          ? "Reconectando para confirmar a abertura…"
          : "Confirmando a abertura do drop…"}
      </p>
    </main>
  );
}
