import { useEffect, useState } from "react";

type LocalStatus = {
  configured: boolean;
  readOnly: true;
  realMetrics: false;
};

/** This notice is only mounted by the Vite development build. */
export function LocalDevelopmentNotice() {
  const [status, setStatus] = useState<LocalStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/_local/status", {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          return;
        const value = await response.json();
        if (value.readOnly === true && value.realMetrics === false)
          setStatus({
            configured: value.configured === true,
            readOnly: true,
            realMetrics: false,
          });
      })
      .catch(() => {
        /* The regular account error provides retry controls. */
      });
    return () => controller.abort();
  }, []);

  return (
    <aside className="local-development-notice" aria-label="Ambiente local">
      <strong>Prévia local</strong>
      <p>
        {status?.configured
          ? "Servidor de contas conectado. Use sua conta de proprietário e o autenticador para acessar a administração. Nesta prévia, pedidos, catálogo e contatos ficam somente para consulta."
          : "O acesso administrativo depende do servidor de contas e da configuração local. Sua sacola continua salva."}
      </p>
      <p>
        O localhost não registra acessos de produção. Conheça os relatórios na
        demonstração, identificada com dados fictícios.
      </p>
      <a href="/work/analytics-seo-qa/index.html?view=panel">
        Abrir demonstração dos Analytics ↗
      </a>
    </aside>
  );
}
