import { useCommerce } from "../commerce/CommerceProvider";
import { offeredPayments, storeContactLink } from "../config/storefront";

export function PaymentIcon({ kind }: { kind: string }) {
  if (kind === "pix") {
    return (
      <img
        className="store-pix-logo"
        src="/brand/payments/pix-oficial.png"
        width="540"
        height="190"
        alt=""
      />
    );
  }
  return (
    <svg
      width="72"
      height="44"
      viewBox="0 0 72 44"
      fill="none"
      aria-hidden="true"
    >
      {kind === "credit" ? (
        <>
          <rect x="4" y="3" width="64" height="39" rx="6" fill="#DCE2EB" />
          <rect x="3" y="1" width="64" height="39" rx="6" fill="#24324B" />
          <path
            d="M43 1h18a6 6 0 0 1 6 6v27a6 6 0 0 1-6 6H23L43 1Z"
            fill="#344766"
          />
          <rect x="11" y="12" width="15" height="12" rx="2.5" fill="#E8CF8F" />
          <path
            d="M16 12v12m5-12v12M11 18h15"
            stroke="#A78A4C"
            strokeWidth=".8"
          />
          <path
            d="M12 31h10m5 0h10m5 0h10"
            stroke="#EDF1F7"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M49 12a5 5 0 0 1 0 7m4-10a9 9 0 0 1 0 13"
            stroke="#EDF1F7"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path d="M15 3h34l8 8v29H15V3Z" fill="#ECE9E2" />
          <path d="M13 1h34l10 10v29H13V1Z" fill="#FFF" stroke="#D4D0C7" />
          <path d="M47 1v10h10" fill="#EAE7E0" />
          <path
            d="M20 9h19M20 14h12"
            stroke="#B3ADA1"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 21v12m3-12v12m4-12v12m3-12v12m5-12v12m3-12v12m4-12v12m3-12v12m5-12v12"
            stroke="#202020"
            strokeWidth="1.4"
          />
          <path
            d="M24 21v12m9-12v12m7-12v12m7-12v12"
            stroke="#202020"
            strokeWidth=".6"
          />
        </>
      )}
    </svg>
  );
}

export function PaymentMethods() {
  const { catalog, catalogError } = useCommerce();
  const methods = offeredPayments(catalog?.paymentMethods);
  return methods.length ? (
    <ul
      className="store-payment-methods"
      aria-label="Formas de pagamento no atendimento"
    >
      {methods.map((method) => (
        <li key={method.id}>
          <span className="store-payment-mark" aria-hidden="true">
            <PaymentIcon kind={method.id} />
          </span>
          <span>{method.label}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="store-muted">
      {!catalog && !catalogError
        ? "Consultando formas de pagamento…"
        : "Formas de pagamento indisponíveis no momento. Confirme com o atendimento."}
    </p>
  );
}

export function StoreContact({
  message = "Olá! Tenho uma dúvida sobre as camisetas da ZXXR.",
  label = "Falar no WhatsApp",
}: {
  message?: string;
  label?: string;
}) {
  const { catalog, catalogError } = useCommerce();
  const href = storeContactLink(catalog?.contact, message);
  return href ? (
    <a
      className="store-contact-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <p className="store-muted">
      {!catalog && !catalogError
        ? "Consultando atendimento…"
        : "O atendimento pelo WhatsApp está indisponível no momento. Tente novamente mais tarde."}
    </p>
  );
}

export function StoreTestNotice() {
  const { catalog } = useCommerce();
  return catalog?.testMode ? (
    <p className="store-test-notice">
      Loja em teste. Nenhuma cobrança ou produção será iniciada.
    </p>
  ) : null;
}
