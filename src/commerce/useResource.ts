import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./client";
import { useCommerce } from "./CommerceProvider";
export function useResource<T>(path: string) {
  const { session } = useCommerce();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const n = ++sequence.current;
    if (!session.user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const value = await api<T>(path);
      if (n === sequence.current) {
        setData(value);
        setError("");
      }
    } catch (e) {
      if (n === sequence.current) {
        setData(null);
        setError(errorMessage(e));
      }
    } finally {
      if (n === sequence.current) setLoading(false);
    }
  }, [path, session.user?.id, session.user?.mfa]);
  useEffect(() => {
    setData(null);
    void reload();
    const clear = () => {
      sequence.current++;
      setData(null);
    };
    // Editable staff/profile forms must keep their original version until an explicit reload.
    const followCustomerOrder = path === "orders" || path.startsWith("orders/");
    if (followCustomerOrder) window.addEventListener("focus", reload);
    window.addEventListener("zxxr:logout", clear);
    return () => {
      sequence.current++;
      window.removeEventListener("focus", reload);
      window.removeEventListener("zxxr:logout", clear);
    };
  }, [reload, path]);
  return { data, setData, error, loading, reload };
}
