import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router";
import { useCommerce } from "../commerce/CommerceProvider";
import {
  accountDestination,
  mainNavigation,
  storeNavigationGroups,
} from "../config/storefront";
import { useSupport } from "../support/context";
import { supportRoute } from "../support/guide";
import { BagIcon } from "./Icons";

export function StoreHeader({ count }: { count: number }) {
  const { session, catalog } = useCommerce();
  const support = useSupport();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const restore = useRef(true);
  function close(restoreFocus = true) {
    restore.current = restoreFocus;
    dialog.current?.close();
    setOpen(false);
  }
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--site-header-height",
        node.getBoundingClientRect().height + "px",
      );
    measure();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);
  useEffect(() => {
    close(false);
  }, [location.key]);
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0)
      document.body.style.paddingRight =
        parseFloat(getComputedStyle(document.body).paddingRight || "0") +
        scrollbar +
        "px";
    document.body.style.overflow = "hidden";
    node.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        node.querySelectorAll<HTMLElement>("a[href],button:not(:disabled)"),
      ).filter((el) => el.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1200px)");
    const resized = () => {
      if (desktop.matches) close(false);
    };
    document.addEventListener("keydown", key);
    desktop.addEventListener("change", resized);
    return () => {
      document.removeEventListener("keydown", key);
      desktop.removeEventListener("change", resized);
      node.close();
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (restore.current) toggle.current?.focus({ preventScroll: true });
    };
  }, [open]);
  const account = accountDestination(!!session.user);
  function follow(href: string) {
    close(false);
    if (location.pathname === "/" && href.startsWith("/#"))
      document
        .getElementById(href.slice(2))
        ?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  return (
    <>
      <header
        ref={root}
        className={
          "site-header storefront-header " +
          (location.pathname === "/" ? "collection-header" : "")
        }
      >
        <button
          ref={toggle}
          type="button"
          className="store-menu-toggle"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="store-mobile-menu"
          onClick={() => {
            restore.current = true;
            support?.setOpen(false);
            setOpen(true);
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          Menu
        </button>
        <Link to="/" className="brand" aria-label="ZXXR Store, início">
          <img
            src="/brand/store-black.svg"
            alt="ZXXR Store"
            width="112"
            height="55"
          />
        </Link>
        <nav
          id="store-navigation"
          className="storefront-navigation"
          aria-label="Menu principal"
        >
          {mainNavigation.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              aria-current={
                location.pathname + location.hash === link.href ||
                (link.href === "/#o-drop" &&
                  location.pathname.startsWith("/produto/"))
                  ? "location"
                  : undefined
              }
              onClick={() => follow(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-account-actions">
          <NavLink
            to={account}
            className="header-account-link"
            aria-label={session.user ? "Minha conta" : "Entrar"}
          >
            <span className="store-account-compact">Conta</span>
            <span className="store-account-wide">
              {session.user ? "Minha conta" : "Entrar"}
            </span>
          </NavLink>
          <NavLink
            to="/sacola"
            className="bag-link"
            aria-label={"Sacola (" + count + ")"}
          >
            <BagIcon />
            <span className="store-bag-label">Sacola</span>
            <span className="bag-count">({count})</span>
          </NavLink>
        </div>
      </header>
      {open &&
        createPortal(
          <dialog
            id="store-mobile-menu"
            ref={dialog}
            className="store-drawer"
            aria-labelledby="store-menu-title"
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              const box = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < box.left ||
                event.clientX > box.right ||
                event.clientY < box.top ||
                event.clientY > box.bottom
              )
                close();
            }}
          >
            <header className="store-drawer-heading">
              <h2 id="store-menu-title">Menu ZXXR</h2>
              <button
                ref={closeButton}
                type="button"
                aria-label="Fechar menu"
                onClick={() => close()}
              >
                ×
              </button>
            </header>
            <nav
              aria-label="Todos os destinos da loja"
              className="store-drawer-links"
            >
              {storeNavigationGroups(!!session.user, catalog?.contact).map(
                (group) => (
                  <section key={group.label}>
                    <h3>{group.label}</h3>
                    {group.items
                      .filter(
                        (item) =>
                          item.kind !== "support" ||
                          supportRoute(location.pathname) !== "hidden",
                      )
                      .map((item) =>
                        item.kind === "route" ? (
                          <Link
                            key={item.label}
                            to={item.href}
                            onClick={() => follow(item.href)}
                          >
                            {item.label}
                            <span aria-hidden="true">↗</span>
                          </Link>
                        ) : item.kind === "external" ? (
                          <a
                            key={item.label}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => close()}
                          >
                            {item.label}
                            <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              close(false);
                              toggle.current?.focus({ preventScroll: true });
                              support?.setOpen(true);
                            }}
                          >
                            {item.label}
                            <span aria-hidden="true">↗</span>
                          </button>
                        ),
                      )}
                  </section>
                ),
              )}
            </nav>
          </dialog>,
          document.body,
        )}
    </>
  );
}
