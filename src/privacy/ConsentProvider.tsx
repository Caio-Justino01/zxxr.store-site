import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CONSENT_KEY,
  readConsent,
  writeConsent,
  type ConsentChoices,
  type ConsentRecord,
} from "./consent";
import { stopAnalytics } from "../analytics/client";
import "./privacy.css";

type ConsentContextValue = {
  preferences: ConsentRecord | null;
  ready: boolean;
  openSettings: () => void;
  savePreferences: (choices: ConsentChoices) => boolean;
  rejectOptional: () => void;
};
const ConsentContext = createContext<ConsentContextValue | null>(null);
export function useConsent() {
  const value = useContext(ConsentContext);
  if (!value) throw new Error("ConsentProvider precisa envolver a página.");
  return value;
}
export function ConsentProvider({ children }: { children: ReactNode }) {
  // The server and first client render agree: optional processing is off.
  const [preferences, setPreferences] = useState<ConsentRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>({
    analytics: false,
    external: false,
  });
  const [storageError, setStorageError] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    try {
      setPreferences(readConsent(localStorage.getItem(CONSENT_KEY)));
    } catch {
      setStorageError(true);
    }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== CONSENT_KEY && event.key !== null) return;
      const next = readConsent(event.newValue);
      if (!next?.analytics) stopAnalytics(true);
      setPreferences(next);
      setDismissed(false);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const openSettings = useCallback(() => {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDraft({
      analytics: preferences?.analytics ?? false,
      external: preferences?.external ?? false,
    });
    setOpen(true);
  }, [preferences]);
  const closeSettings = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() =>
      returnFocus.current?.focus({ preventScroll: true }),
    );
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  const savePreferences = useCallback(
    (choices: ConsentChoices) => {
      let record: ConsentRecord | null = null;
      try {
        record = writeConsent(localStorage, choices);
      } catch {
        /* optional processing stays off */
      }
      if (!record) {
        try {
          localStorage.removeItem(CONSENT_KEY);
        } catch {
          /* storage may be entirely blocked */
        }
      }
      if (!record?.analytics) stopAnalytics(true);
      setPreferences(record);
      setStorageError(!record);
      setDismissed(true);
      closeSettings();
      return !!record;
    },
    [closeSettings],
  );
  const rejectOptional = useCallback(() => {
    savePreferences({ analytics: false, external: false });
  }, [savePreferences]);
  return (
    <ConsentContext.Provider
      value={{
        preferences,
        ready,
        openSettings,
        savePreferences,
        rejectOptional,
      }}
    >
      {children}
      {ready && !preferences && !dismissed && (
        <aside
          className="privacy-banner"
          aria-label="Suas escolhas de privacidade"
        >
          <div>
            <strong>Seu espaço. Suas escolhas.</strong>
            <p>
              O essencial mantém sua sacola e seu acesso. Você decide sobre
              estatísticas de uso e conteúdo do Spotify.{" "}
              <a href="/privacidade">Entenda a privacidade</a>.
            </p>
          </div>
          <div className="privacy-actions">
            <button
              type="button"
              onClick={() =>
                savePreferences({ analytics: true, external: true })
              }
            >
              Aceitar opcionais
            </button>
            <button type="button" onClick={rejectOptional}>
              Rejeitar opcionais
            </button>
            <button type="button" onClick={openSettings}>
              Personalizar
            </button>
          </div>
        </aside>
      )}
      <dialog
        ref={dialog}
        className="privacy-dialog"
        aria-labelledby="privacy-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeSettings();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="privacy-dialog-heading">
          <h2 id="privacy-dialog-title">Privacidade e cookies</h2>
          <button
            type="button"
            className="privacy-close"
            aria-label="Fechar preferências"
            onClick={closeSettings}
          >
            ×
          </button>
        </div>
        <p>
          O site funciona com os opcionais desligados. Sua escolha pode ser
          alterada a qualquer momento.
        </p>
        <div className="privacy-category">
          <div>
            <h3>Essenciais</h3>
            <p>
              Acesso à conta, segurança, sacola e repetição segura de pedidos.
            </p>
          </div>
          <span>Sempre ativos</span>
        </div>
        <label className="privacy-category">
          <div>
            <h3>Estatísticas de uso</h3>
            <p>
              Contagem de acessos e interações para melhorar a loja. Sem
              gravação da tela nem conteúdo dos seus formulários.
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.analytics}
            onChange={(e) =>
              setDraft((v) => ({ ...v, analytics: e.target.checked }))
            }
          />
        </label>
        <label className="privacy-category">
          <div>
            <h3>Conteúdo externo</h3>
            <p>
              Permite carregar o player do Spotify. O serviço pode receber dados
              e usar cookies próprios ao carregar.
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.external}
            onChange={(e) =>
              setDraft((v) => ({ ...v, external: e.target.checked }))
            }
          />
        </label>
        {storageError && (
          <p className="privacy-storage-error" role="status">
            Seu navegador não permitiu guardar a escolha. Os opcionais
            permanecem desligados.
          </p>
        )}
        <p className="privacy-fine-print">
          Lembretes de sacola pelo WhatsApp exigem uma autorização separada na
          sua conta. <a href="/privacidade">Ler a política de privacidade</a>.
        </p>
        <div className="privacy-actions">
          <button type="button" onClick={() => savePreferences(draft)}>
            Salvar escolhas
          </button>
          <button type="button" onClick={rejectOptional}>
            Rejeitar opcionais
          </button>
        </div>
      </dialog>
    </ConsentContext.Provider>
  );
}
export function ConsentSettingsButton({
  children = "Privacidade e cookies",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { openSettings } = useConsent();
  return (
    <button
      className={`privacy-settings-link ${className}`}
      type="button"
      onClick={openSettings}
    >
      {children}
    </button>
  );
}
