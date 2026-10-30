import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { api, ApiError, errorMessage } from "../commerce/client";
import { useCommerce } from "../commerce/CommerceProvider";
import { isAvailable, productById } from "../config/products";
import type { CartItem } from "../lib/cart";
import type {
  RecoveryCart as CartSnapshot,
  RecoveryPreferences,
} from "./contracts";
import "./analytics.css";

const RECOVERY_VERSION = "2026-10-29-v1";
const preferenceEvent = "zxxr:recovery-preference";
const preferenceSyncKey = "zxxr-recovery-preference-refresh-v1";
function useRecoveryPreference() {
  const { session } = useCommerce();
  const userId = session.user?.role === "customer" ? session.user.id : null;
  const [value, setValue] = useState<RecoveryPreferences | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setValue(null);
    setError("");
    if (!userId) return;
    let cancelled = false;
    const refresh = () => {
      void api<RecoveryPreferences>("recovery/preferences")
        .then((next) => {
          if (!cancelled) {
            setValue(next);
            setError("");
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setValue((known) => (known ? { ...known, enabled: false } : null));
            setError(errorMessage(e));
          }
        });
    };
    refresh();
    const crossTab = (event: StorageEvent) => {
      if (event.key !== preferenceSyncKey) return;
      setValue((known) => (known ? { ...known, enabled: false } : null));
      refresh();
    };
    const sync = (event: Event) => {
      const detail = (
        event as CustomEvent<{ userId: string; value: RecoveryPreferences }>
      ).detail;
      if (detail.userId === userId) setValue(detail.value);
    };
    window.addEventListener(preferenceEvent, sync);
    window.addEventListener("focus", refresh);
    window.addEventListener("zxxr:profile-updated", refresh);
    window.addEventListener("storage", crossTab);
    return () => {
      cancelled = true;
      window.removeEventListener(preferenceEvent, sync);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("zxxr:profile-updated", refresh);
      window.removeEventListener("storage", crossTab);
    };
  }, [userId]);
  const save = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      setBusy(true);
      setError("");
      try {
        const next = await api<RecoveryPreferences>("recovery/preferences", {
          method: "PUT",
          body: JSON.stringify({ enabled, version: RECOVERY_VERSION }),
        });
        setValue(next);
        window.dispatchEvent(
          new CustomEvent(preferenceEvent, {
            detail: { userId, value: next, explicit: true },
          }),
        );
        try {
          localStorage.setItem(preferenceSyncKey, String(Date.now()));
        } catch {
          /* Other tabs revalidate when focused. */
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [userId],
  );
  return { userId, value, error, busy, save };
}
function PreferenceControl({
  state,
}: {
  state: ReturnType<typeof useRecoveryPreference>;
}) {
  if (!state.userId) return null;
  return (
    <div className="recovery-preference">
      <h2>Ajuda para finalizar sua escolha</h2>
      <p>
        Se você deixar a sacola sem concluir, podemos ajudar pelo WhatsApp já
        salvo na sua conta. É opcional e separado das estatísticas.
      </p>
      {state.value && (
        <label>
          <input
            type="checkbox"
            checked={state.value.enabled}
            disabled={
              state.busy ||
              (!state.value.contactAvailable && !state.value.enabled)
            }
            onChange={(event) => void state.save(event.target.checked)}
          />
          <span>
            Autorizo a ZXXR a me chamar no WhatsApp sobre uma sacola que eu não
            finalizar.
          </span>
        </label>
      )}
      {state.value && !state.value.contactAvailable && (
        <p>
          Para receber esse lembrete, salve um WhatsApp válido em{" "}
          <a href="/conta/dados">Meus dados</a>.
        </p>
      )}
      {state.value?.enabled && (
        <p className="recovery-preference-note">
          Você pode desmarcar quando quiser. Não há inscrição automática em
          campanhas.
        </p>
      )}
      {state.busy && <p role="status">Salvando sua escolha…</p>}
      {state.error && (
        <p className="recovery-error" role="status">
          A preferência de lembrete está indisponível. Sua compra continua
          funcionando.
        </p>
      )}
    </div>
  );
}
export function RecoveryPreference() {
  const state = useRecoveryPreference();
  return <PreferenceControl state={state} />;
}

export function RecoveryCart({
  items,
  activityVersion,
}: {
  items: CartItem[];
  activityVersion: number;
}) {
  const state = useRecoveryPreference();
  const { pathname } = useLocation();
  const snapshot = useRef<CartSnapshot | null>(null);
  const currentItems = useRef(items);
  currentItems.current = items;
  const sequence = useRef(Promise.resolve());
  const generation = useRef(0);
  const previousActivity = useRef(activityVersion);
  const authorizationRequested = useRef(false);
  const [syncError, setSyncError] = useState(false);
  const userId = state.userId;
  const enabled = !!state.value?.enabled;
  const identity = useRef<string | null>(userId);
  identity.current = userId;
  const previousIdentity = useRef<string | null>(userId);
  const preference = useRef(enabled);
  preference.current = enabled;
  const synchronize = useCallback(
    (intent: "change" | "checkout" | "activity", lines: CartItem[]) => {
      if (!userId || !preference.current || !snapshot.current) return;
      const token = generation.current;
      const captured = lines
        .filter((item) => isAvailable(productById(item.productId)))
        .map(({ productId, size, quantity }) => ({
          productId,
          size,
          quantity,
        }));
      sequence.current = sequence.current.then(async () => {
        if (
          token !== generation.current ||
          identity.current !== userId ||
          !preference.current ||
          !snapshot.current
        )
          return;
        const known = snapshot.current;
        try {
          const next = await api<CartSnapshot>("recovery/cart", {
            method: "PUT",
            body: JSON.stringify({
              expectedVersion: known.version,
              cartId:
                known.status === "active" && known.cartId
                  ? known.cartId
                  : crypto.randomUUID(),
              intent,
              items: captured,
            }),
          });
          if (token === generation.current && identity.current === userId) {
            snapshot.current = next;
            setSyncError(false);
          }
        } catch (e) {
          if (token !== generation.current || identity.current !== userId)
            return;
          setSyncError(true);
          if (e instanceof ApiError && e.code === "version_conflict") {
            // Invalidate queued snapshots. A newly registered order in another tab wins.
            generation.current++;
            snapshot.current = null;
            try {
              const latest = await api<CartSnapshot>("recovery/cart");
              if (identity.current === userId) snapshot.current = latest;
            } catch {
              snapshot.current = null;
            }
          }
        }
      });
    },
    [userId],
  );
  useEffect(() => {
    if (previousIdentity.current !== userId) {
      authorizationRequested.current = false;
      previousIdentity.current = userId;
    }
    generation.current++;
    snapshot.current = null;
    setSyncError(false);
    previousActivity.current = activityVersion;
    if (!userId || !enabled) return;
    const token = generation.current;
    void api<CartSnapshot>("recovery/cart")
      .then((next) => {
        if (token === generation.current && identity.current === userId) {
          snapshot.current = next;
          if (authorizationRequested.current) {
            authorizationRequested.current = false;
            synchronize("change", currentItems.current);
          }
        }
      })
      .catch(() => {
        if (token === generation.current) setSyncError(true);
      });
    return () => {
      generation.current++;
      snapshot.current = null;
    };
    // Restoring a bag or logging in is not shopping activity.
  }, [userId, enabled]);
  useEffect(() => {
    if (previousActivity.current === activityVersion) return;
    previousActivity.current = activityVersion;
    synchronize("change", items);
  }, [activityVersion, items, synchronize]);
  useEffect(() => {
    const checkout = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "checkout_step" || detail?.type === "begin_checkout")
        synchronize("checkout", currentItems.current);
    };
    const authorized = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          userId: string;
          value: RecoveryPreferences;
          explicit?: boolean;
        }>
      ).detail;
      if (detail.userId !== userId || !detail.explicit || !detail.value.enabled)
        return;
      // The checkbox is an explicit request to remember this current selection.
      authorizationRequested.current = true;
      if (!enabled) return; // The preference effect will fetch the initial version.
      const token = ++generation.current;
      preference.current = true;
      void api<CartSnapshot>("recovery/cart")
        .then((next) => {
          if (token !== generation.current || identity.current !== userId)
            return;
          snapshot.current = next;
          authorizationRequested.current = false;
          synchronize("change", currentItems.current);
        })
        .catch(() => setSyncError(true));
    };
    window.addEventListener("zxxr:analytics", checkout);
    window.addEventListener(preferenceEvent, authorized);
    return () => {
      window.removeEventListener("zxxr:analytics", checkout);
      window.removeEventListener(preferenceEvent, authorized);
    };
  }, [userId, enabled, synchronize]);
  if (!["/sacola", "/conta/dados"].includes(pathname)) return null;
  return (
    <>
      <PreferenceControl state={state} />
      {enabled && syncError && (
        <p className="recovery-error" role="status">
          Não foi possível atualizar o lembrete. Sua sacola e o pedido continuam
          disponíveis.
        </p>
      )}
    </>
  );
}
