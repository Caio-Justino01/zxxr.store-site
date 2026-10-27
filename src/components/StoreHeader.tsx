import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useCommerce } from "../commerce/CommerceProvider";
import { accountDestination, mainNavigation } from "../config/storefront";
import { BagIcon } from "./Icons";

export function StoreHeader({ count }: { count: number }) {
  const { session, loading } = useCommerce();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);

  function close(restore = true) {
    setOpen(false);
    if (restore) toggle.current?.focus({ preventScroll: true });
  }
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    if (!open) return;
    navigation.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const focusOutside = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const resized = () => {
      if (desktop.matches) close(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    desktop.addEventListener("change", resized);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusOutside);
      desktop.removeEventListener("change", resized);
    };
  }, [open]);

  return (
    <header
      ref={root}
      className={`site-header storefront-header ${location.pathname === "/" ? "collection-header" : ""}`}
    >
      <button
        ref={toggle}
        type="button"
        className="store-menu-toggle"
        aria-expanded={open}
        aria-controls="store-navigation"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d={open ? "m6 6 12 12M6 18 18 6" : "M4 7h16M4 12h16M4 17h16"}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        Menu
      </button>
      <Link
        to="/"
        className="brand"
        aria-label="ZXXR Store, início"
        onClick={() => setOpen(false)}
      >
        <img
          src="/brand/store-black.svg"
          alt="ZXXR Store"
          width="112"
          height="55"
        />
      </Link>
      <nav
        ref={navigation}
        id="store-navigation"
        className="storefront-navigation"
        aria-label="Menu principal"
        data-open={open}
      >
        {mainNavigation.map((link) => {
          const hash = link.href.slice(1);
          const current =
            (location.pathname === "/" && location.hash === hash) ||
            (link.href === "/#o-drop" &&
              (location.pathname.startsWith("/produto/") ||
                (location.pathname === "/" &&
                  !["#som", "#como-funciona"].includes(location.hash))));
          return (
            <Link
              key={link.href}
              to={link.href}
              aria-current={current ? "location" : undefined}
              onClick={() => {
                if (open) close();
                if (location.pathname === "/")
                  document
                    .getElementById(hash.slice(1))
                    ?.scrollIntoView({ behavior: "instant", block: "start" });
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="header-account-actions">
        <NavLink
          to={accountDestination(!!session.user)}
          className="header-account-link"
          aria-label={
            loading ? "Minha conta" : session.user ? "Minha conta" : "Entrar"
          }
          onClick={() => setOpen(false)}
        >
          {loading ? "Minha conta" : session.user ? "Minha conta" : "Entrar"}
        </NavLink>
        <NavLink
          to="/sacola"
          className="bag-link"
          aria-label={`Sacola (${count})`}
          onClick={() => setOpen(false)}
        >
          <BagIcon />
          <span className="store-bag-label">Sacola</span>
          <span className="bag-count">({count})</span>
        </NavLink>
      </div>
    </header>
  );
}
