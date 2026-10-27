import { Link, NavLink, useLocation } from "react-router";
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [title]);
  const [error, setError] = useState("");
  return (
    <main id="top" className="account-page">
      <header className="account-heading">
        <Link to="/#o-drop" className="back-link">
          ← Ver camisetas
        </Link>
        <h1 ref={titleRef} tabIndex={-1}>
          {title}
        </h1>
        {intro && <p>{intro}</p>}
      </header>
      {session.user && (
        <nav className="account-nav" aria-label="Sua conta">
          <NavLink to="/conta/pedidos">Meus pedidos</NavLink>
          <NavLink to="/conta/dados">Meus dados</NavLink>
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
            Sair da conta
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
      <AccountShell title="Entre na sua conta">
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
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  callback.current = onToken;
  useEffect(() => {
    if (!session.captchaSiteKey || !target.current) return;
    setFailure("");
    callback.current("");
    let widget: string | undefined;
    let disposed = false;
    const fail = (
      message = "A verificação de segurança está indisponível. Tente novamente em instantes.",
    ) => {
      if (disposed) return true;
      callback.current("");
      setFailure(message);
      return true;
    };
    const getApi = () =>
      (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    const render = () => {
      if (!disposed && target.current && !widget) {
        try {
          widget = getApi()?.render(target.current, {
            sitekey: session.captchaSiteKey,
            callback: (token: string) => {
              if (!disposed) {
                setFailure("");
                callback.current(token);
              }
            },
            "expired-callback": () =>
              fail("A verificação expirou. Repita para continuar."),
            "error-callback": () => fail(),
            "timeout-callback": () =>
              fail(
                "A verificação demorou mais que o esperado. Tente novamente.",
              ),
            "unsupported-callback": () =>
              fail(
                "Abra o site em um navegador atualizado para concluir a verificação.",
              ),
          });
        } catch {
          fail();
        }
      }
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
    const scriptError = () => {
      script?.remove();
      fail();
    };
    script.addEventListener("load", render);
    script.addEventListener("error", scriptError);
    render();
    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", scriptError);
      if (widget) getApi()?.remove(widget);
    };
  }, [session.captchaSiteKey, attempt]);
  return (
    <div className="account-captcha">
      <div ref={target} />
      {failure && (
        <>
          <Notice error>{failure}</Notice>
          <button
            type="button"
            className="account-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Repetir verificação
          </button>
        </>
      )}
    </div>
  );
}
