import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { api, errorMessage, post } from "./client";
import { safeReturnTo } from "./contracts";
import { useCommerce } from "./CommerceProvider";
import { AccountShell, Busy, Captcha, Notice } from "./ui";

export function AuthPage() {
  const location = useLocation(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const signup = location.pathname === "/cadastro",
    recovery = location.pathname === "/recuperar-acesso",
    reset = recovery && params.get("step") === "reset";
  const { session, loading, error: sessionError, refresh } = useCommerce();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [captchaToken, setCaptchaToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string; password: string; confirm: string }>();
  const returnTo = safeReturnTo(params.get("returnTo"));
  useEffect(() => {
    setError("");
    setMessage("");
  }, [location.pathname, reset]);
  async function submit(values: {
    email: string;
    password: string;
    confirm: string;
  }) {
    setError("");
    if ((signup || reset) && values.password !== values.confirm) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    try {
      const path = reset
        ? "auth/password"
        : recovery
          ? "auth/recover"
          : signup
            ? "auth/signup"
            : "auth/login";
      const result = await post<{ message?: string }>(path, {
        email: values.email,
        password: values.password,
        captchaToken,
      });
      if (signup || (recovery && !reset))
        setMessage(result.message || "Confira seu e-mail.");
      else {
        await refresh();
        navigate(returnTo);
      }
    } catch (e) {
      setError(errorMessage(e));
      setCaptchaToken("");
      setCaptchaAttempt((value) => value + 1);
    }
  }
  const title = reset
    ? "Uma nova senha."
    : recovery
      ? "Recupere seu acesso."
      : signup
        ? "Entre para o drop."
        : "Bom ter você aqui.";
  return (
    <AccountShell
      title={title}
      intro="Suas escolhas, seus pedidos e cada etapa da ZXXR em um só lugar."
    >
      <div className="auth-layout">
        <section className="auth-card">
          {loading ? (
            <Busy />
          ) : !session.configured ||
            (!session.emailEnabled && !session.googleEnabled) ? (
            <>
              <Notice error>
                {sessionError ||
                  "O acesso às contas está temporariamente indisponível. Sua sacola continua salva."}
              </Notice>
              <button className="account-button" onClick={() => void refresh()}>
                Tentar novamente
              </button>
            </>
          ) : (
            <>
              {!recovery && session.googleEnabled && (
                <>
                  <a
                    className="account-button google-button"
                    href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    <span aria-hidden="true">G</span>Continuar com Google
                  </a>
                  {session.emailEnabled && (
                    <div className="auth-divider">ou use seu e-mail</div>
                  )}
                </>
              )}
              {params.get("erro") && (
                <Notice error>
                  Este link expirou ou o acesso foi interrompido. Entre
                  novamente ou solicite outro link.
                </Notice>
              )}
              {error && <Notice error>{error}</Notice>}
              {message ? (
                <Notice>{message}</Notice>
              ) : (
                (session.emailEnabled || reset) && (
                  <form onSubmit={handleSubmit(submit)} noValidate>
                    {!reset && (
                      <label>
                        E-mail
                        <input
                          type="email"
                          autoComplete="email"
                          {...register("email", {
                            required: "Informe seu e-mail.",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Confira seu e-mail.",
                            },
                          })}
                          aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                          <small role="alert">{errors.email.message}</small>
                        )}
                      </label>
                    )}
                    {(!recovery || reset) && (
                      <label>
                        {reset ? "Nova senha" : "Senha"}
                        <input
                          type="password"
                          autoComplete={
                            signup || reset
                              ? "new-password"
                              : "current-password"
                          }
                          {...register("password", {
                            required: "Informe sua senha.",
                            minLength: {
                              value: 10,
                              message: "Use pelo menos 10 caracteres.",
                            },
                            maxLength: 128,
                          })}
                          aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                          <small role="alert">{errors.password.message}</small>
                        )}
                      </label>
                    )}
                    {(signup || reset) && (
                      <label>
                        Repita a senha
                        <input
                          type="password"
                          autoComplete="new-password"
                          {...register("confirm", {
                            required: "Repita a senha.",
                          })}
                        />
                      </label>
                    )}
                    {!reset && (
                      <Captcha key={captchaAttempt} onToken={setCaptchaToken} />
                    )}
                    <button
                      className="account-button primary"
                      disabled={
                        isSubmitting ||
                        (!!session.captchaSiteKey && !captchaToken && !reset)
                      }
                    >
                      {isSubmitting
                        ? "Aguarde…"
                        : reset
                          ? "Salvar nova senha"
                          : recovery
                            ? "Enviar instruções"
                            : signup
                              ? "Criar minha conta"
                              : "Entrar"}
                    </button>
                  </form>
                )
              )}
              {session.emailEnabled && (
                <div className="auth-links">
                  {!recovery && (
                    <Link
                      to={`/recuperar-acesso?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Esqueci minha senha
                    </Link>
                  )}
                  <Link
                    to={`${signup || recovery ? "/entrar" : "/cadastro"}?returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    {signup || recovery
                      ? "Já tenho conta. Entrar"
                      : "Ainda não tenho conta"}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
        <aside className="auth-editorial">
          <img src="/brand/mascot-black.svg" alt="" width="96" height="86" />
          <h2>O som também veste.</h2>
          <p>
            Salve seu pedido. Combine os detalhes com a gente. Acompanhe até
            chegar.
          </p>
          <Link to="/#o-drop">Conhecer as peças</Link>
        </aside>
      </div>
    </AccountShell>
  );
}

export function MfaPage() {
  const { refresh } = useCommerce();
  const [factors, setFactors] = useState<
    { id: string; status: string }[] | null
  >(null);
  const [enrollment, setEnrollment] = useState<{
    id: string;
    totp: { qr_code: string; secret: string };
  } | null>(null);
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ factors: { id: string; status: string }[] }>("auth/mfa")
      .then((r) => setFactors(r.factors))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const verified = factors?.find((f) => f.status === "verified");
  async function enroll() {
    setBusy(true);
    setError("");
    try {
      setEnrollment(await post("auth/mfa/enroll", {}));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("auth/mfa/verify", {
        factorId: verified?.id || enrollment?.id,
        code,
      });
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell
      title="Uma confirmação a mais."
      intro="O painel da equipe usa um código do seu aplicativo autenticador."
    >
      <section className="auth-card mfa-card">
        {error && <Notice error>{error}</Notice>}
        {factors === null && !error ? (
          <Busy />
        ) : !verified && !enrollment ? (
          <>
            <p>
              Configure o Google Authenticator ou outro aplicativo compatível
              para proteger seu acesso.
            </p>
            <button
              className="account-button primary"
              disabled={busy}
              onClick={enroll}
            >
              Configurar autenticador
            </button>
          </>
        ) : (
          <>
            {enrollment && (
              <>
                <img
                  className="mfa-qr"
                  src={
                    enrollment.totp.qr_code.startsWith("data:")
                      ? enrollment.totp.qr_code
                      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`
                  }
                  alt="Código QR para configurar seu autenticador"
                />
                <details>
                  <summary>Não consigo ler o QR</summary>
                  <code>{enrollment.totp.secret}</code>
                </details>
              </>
            )}
            <form onSubmit={verify}>
              <label>
                Código de 6 números
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <button
                className="account-button primary"
                disabled={busy || code.length !== 6}
              >
                {busy ? "Conferindo…" : "Confirmar acesso"}
              </button>
            </form>
          </>
        )}
      </section>
    </AccountShell>
  );
}
