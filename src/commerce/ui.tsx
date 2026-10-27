import { Link, useLocation } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCommerce } from "./CommerceProvider";
import { errorMessage } from "./client";
import { MfaPage } from "./auth";

export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`account-notice${error ? " is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Busy() {
  return (
    <div className="account-loading" role="status">
      <span />
      Consultando sua conta…
    </div>
  );
}
export function AccountShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const { session, logout } = useCommerce();
  const titleRef=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{titleRef.current?.focus({preventScroll:true});},[title]);
  const [error, setError] = useState("");
  return (
    <main id="top" className="account-page">
      <header className="account-heading">
        <Link to="/#o-drop" className="back-link">
          ← Voltar às peças
        </Link>
        <h1 ref={titleRef} tabIndex={-1}>{title}</h1>
        {intro && <p>{intro}</p>}
      </header>
      {session.user && (
        <nav className="account-nav" aria-label="Sua conta">
          <Link to="/conta/pedidos">Meus pedidos</Link>
          <Link to="/conta/dados">Meus dados</Link>
          {session.user.active && session.user.role !== "customer" && (
            <Link to="/painel/pedidos">Painel da equipe</Link>
          )}
          <button
            onClick={async () => {
              try {
                await logout();
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Sair
          </button>
        </nav>
      )}
      {error && <Notice error>{error}</Notice>}
      {children}
    </main>
  );
}
export function Protected({
  children,
  staff = false,
  owner = false,
}: {
  children: ReactNode;
  staff?: boolean;
  owner?: boolean;
}) {
  const { loading, session, error, refresh } = useCommerce();
  const location = useLocation();
  if (loading)
    return (
      <AccountShell title="Sua conta.">
        <Busy />
      </AccountShell>
    );
  if (!session.configured)
    return (
      <AccountShell title="Sua conta.">
        <Notice error>
          {error ||
            "O acesso às contas está sendo preparado. Sua sacola continua salva."}
        </Notice>
        <button className="account-button" onClick={() => void refresh()}>
          Tentar novamente
        </button>
      </AccountShell>
    );
  if (!session.user)
    return (
      <AccountShell title="Guarde suas escolhas.">
        <p>Entre para registrar seu pedido e acompanhar cada etapa.</p>
        <Link
          className="account-button primary"
          to={`/entrar?returnTo=${encodeURIComponent(location.pathname)}`}
        >
          Entrar na minha conta
        </Link>
      </AccountShell>
    );
  if (
    (staff || owner) &&
    (!session.user.active ||
      session.user.role === "customer" ||
      (owner && session.user.role !== "owner"))
  )
    return (
      <AccountShell title="Acesso reservado.">
        <Notice error>
          Esta área está disponível apenas para a equipe autorizada.
        </Notice>
        <Link to="/conta/pedidos">Voltar aos meus pedidos</Link>
      </AccountShell>
    );
  if ((staff || owner) && !session.user.mfa) return <MfaPage />;
  return <>{children}</>;
}
type TurnstileApi = {
  render: (el: HTMLElement, config: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
export function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const { session } = useCommerce();
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  useEffect(() => {
    if (!session.captchaSiteKey || !target.current) return;
    let widget: string | undefined;
    let disposed = false;
    const getApi = () =>
      (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    const render = () => {
      if (!disposed && target.current && !widget)
        widget = getApi()?.render(target.current, {
          sitekey: session.captchaSiteKey,
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-zxxr-turnstile]",
    );
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.zxxrTurnstile = "true";
      document.head.append(script);
    }
    script.addEventListener("load", render);
    render();
    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      if (widget) getApi()?.remove(widget);
    };
  }, [session.captchaSiteKey]);
  return <div ref={target} className="account-captcha" />;
}
