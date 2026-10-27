import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router";
import { supportMascot } from "./guide";

const SupportContext = createContext<{
  open: boolean;
  setOpen: (value: boolean) => void;
} | null>(null);
export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  return (
    <SupportContext.Provider value={{ open, setOpen }}>
      {children}
    </SupportContext.Provider>
  );
}
export const useSupport = () => useContext(SupportContext);
export function SupportInlineButton() {
  const support = useSupport();
  if (!support) return <Link to="/ajuda">Precisa de ajuda?</Link>;
  return (
    <button
      type="button"
      className="support-inline-button"
      data-support-trigger
      aria-expanded={support.open}
      aria-controls={support.open ? "zxxr-support-panel" : undefined}
      aria-haspopup="dialog"
      onClick={() => support.setOpen(!support.open)}
    >
      <img src={supportMascot} width="27" height="23" alt="" />
      Precisa de ajuda?
    </button>
  );
}
