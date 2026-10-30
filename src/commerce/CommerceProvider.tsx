import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, errorMessage, post } from "./client";
import type { Access, Catalog } from "./contracts";
import { products } from "../config/products";
import { preorder } from "../config/preorder";
type Session = {
  configured: boolean;
  user: Access | null;
  captchaSiteKey: string | null;
  emailEnabled: boolean;
  googleEnabled: boolean;
};
const CommerceContext = createContext<{
  session: Session;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  catalog: Catalog | null;
  catalogError: string;
  refreshCatalog: () => Promise<void>;
}>(null!);
export function CommerceProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    configured: false,
    user: null,
    captchaSiteKey: null,
    emailEnabled: false,
    googleEnabled: false,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [catalogError, setCatalogError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const value = await api<Session>("auth/session");
      if (current === generation.current) {
        setSession(value);
        setError("");
      }
    } catch (e) {
      if (current === generation.current) {
        setSession({
          configured: false,
          user: null,
          captchaSiteKey: null,
          emailEnabled: false,
          googleEnabled: false,
        });
        setError(errorMessage(e));
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  const refreshCatalog = useCallback(async () => {
    try {
      const value = await api<Catalog>("catalog");
      // Existing editorial components share these five records. Only commercial fields change.
      for (const p of products) {
        const variant = value.variants.find((v) => v.product_id === p.id);
        if (variant && p.releaseStatus === "available") p.price = variant.price_cents / 100;
      }
      preorder.open = value.open;
      setCatalog(value);
      setCatalogError("");
    } catch (e) {
      setCatalog(null);
      setCatalogError(errorMessage(e));
    }
  }, []);
  const logout = useCallback(async () => {
    await post("auth/logout", {});
    generation.current++;
    setSession((s) => ({ ...s, user: null }));
    // No tokens or addresses are stored in browser storage. Remove the request retry key only.
    try {
      sessionStorage.removeItem("zxxr-order-request");
    } catch {
      /* storage optional */
    }
    window.dispatchEvent(new Event("zxxr:logout"));
  }, []);
  useEffect(() => {
    void refresh();
    void refreshCatalog();
    const onFocus = () => {
      void refresh();
      void refreshCatalog();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      generation.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, refreshCatalog]);
  return (
    <CommerceContext.Provider
      value={{
        session,
        loading,
        error,
        refresh,
        logout,
        catalog,
        catalogError,
        refreshCatalog,
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
}
export const useCommerce = () => useContext(CommerceContext);
