import { useCommerce } from "../commerce/CommerceProvider";
import { offeredPayments, storeContactLink } from "../config/storefront";

export function PaymentIcon({ kind }: { kind: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {kind === "pix" ? (
        <path
          d="m12 3 9 9-9 9-9-9 9-9Zm-5 5 3 3a3 3 0 0 0 4 0l3-3M7 16l3-3a3 3 0 0 1 4 0l3 3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ) : kind === "credit" ? (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="1.4" />
        </>
      ) : (
        <path
          d="M4 5v14M7 5v14M11 5v14M14 5v14M16 5v14M20 5v14"
          stroke="currentColor"
          strokeWidth="1.4"
        />
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
          <PaymentIcon kind={method.id} />
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
