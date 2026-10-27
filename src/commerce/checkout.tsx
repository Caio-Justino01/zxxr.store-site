import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import type { CartItem } from "../lib/cart";
import { productById } from "../config/products";
import { api, ApiError, errorMessage, post } from "./client";
import {
  brl,
  orderInputSchema,
  orderMessage,
  profileSchema,
  addressSchema,
  type Address,
  type Order,
} from "./contracts";
import { useCommerce } from "./CommerceProvider";
import { AccountShell, Notice, Protected } from "./ui";
import { AddressFields, emptyAddress, useCep } from "./address";
type Form = {
  name: string;
  phone: string;
  address: Address;
  paymentPreference: "pix" | "credit" | "boleto";
  note: string;
  saveAddress: boolean;
};
export function CheckoutPage({
  items,
  onRegistered,
}: {
  items: CartItem[];
  onRegistered: (lines: CartItem[]) => void;
}) {
  return (
    <Protected>
      <Checkout items={items} onRegistered={onRegistered} />
    </Protected>
  );
}
function Checkout({
  items,
  onRegistered,
}: {
  items: CartItem[];
  onRegistered: (lines: CartItem[]) => void;
}) {
  const { session, catalog, catalogError, refreshCatalog } = useCommerce();
  const navigate = useNavigate();
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const requestKey = useRef<{ signature: string; key: string } | null>(null);
  const stepHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{stepHeading.current?.focus({preventScroll:true});},[step]);
  const form = useForm<Form>({
    defaultValues: {
      name: "",
      phone: "",
      address: emptyAddress,
      paymentPreference: "pix",
      note: "",
      saveAddress: false,
    },
  });
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = form;
  const cep = useCep((values) => {
    for (const [key, value] of Object.entries(values))
      setValue(`address.${key}` as any, value as string);
  });
  useEffect(() => {
    let live = true;
    api<{ profile: { name: string; phone: string }; addresses: Address[] }>(
      "profile",
    )
      .then((data) => {
        if (!live) return;
        setValue("name", data.profile.name);
        setValue("phone", data.profile.phone);
        setAddresses(data.addresses);
        if (data.addresses[0]) setValue("address", data.addresses[0]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [session.user?.id, setValue]);
  const lines = items.map((item) => ({
    ...item,
    variant: catalog?.variants.find(
      (v) => v.product_id === item.productId && v.size === item.size,
    ),
  }));
  const subtotal = lines.reduce(
    (n, i) => n + (i.variant?.price_cents ?? 0) * i.quantity,
    0,
  );
  async function submit(values: Form) {
    setError("");
    if (step === 0) {
      const parsed = profileSchema.safeParse({
        name: values.name,
        phone: values.phone,
      });
      if (!parsed.success) {
        for (const [index,i] of parsed.error.issues.entries())
          fieldError(
            i.path[0] as "name" | "phone",
            { message: i.message },
            { shouldFocus: index===0 },
          );
        return;
      }
      if (!values.address.recipient)
        setValue("address.recipient", parsed.data.name);
      setStep(1);
      return;
    }
    if (step === 1) {
      const parsed = addressSchema.safeParse(values.address);
      if (!parsed.success) {
        for (const [index,i] of parsed.error.issues.entries())
          fieldError(
            `address.${String(i.path[0])}` as any,
            { message: i.message },
            { shouldFocus: index===0 },
          );
        return;
      }
      setValue("address", parsed.data);
      setStep(2);
      return;
    }
    if (!catalog || !catalog.open || lines.some((l) => !l.variant?.active)) {
      setError("Confira a disponibilidade das peças antes de registrar.");
      return;
    }
    const parsed = orderInputSchema.safeParse({
      customer: { name: values.name, phone: values.phone },
      address: values.address,
      paymentPreference: values.paymentPreference,
      note: values.note,
      saveAddress: values.saveAddress,
      items: lines.map((l) => ({
        productId: l.productId,
        size: l.size,
        quantity: l.quantity,
        expectedUnitCents: l.variant!.price_cents,
      })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const signature = JSON.stringify([session.user!.id, items]);
    if (!requestKey.current || requestKey.current.signature !== signature) {
      let saved: null | { signature: string; key: string } = null;
      try {
        saved = JSON.parse(
          sessionStorage.getItem("zxxr-order-request") ?? "null",
        );
      } catch {}
      requestKey.current =
        saved?.signature === signature
          ? saved
          : { signature, key: crypto.randomUUID() };
      try {
        sessionStorage.setItem(
          "zxxr-order-request",
          JSON.stringify(requestKey.current),
        );
      } catch {}
    }
    try {
      const snapshot = items.map((i) => ({ ...i }));
      const order = await post<Order>("orders", parsed.data, {
        "Idempotency-Key": requestKey.current.key,
      });
      onRegistered(snapshot);
      try {
        sessionStorage.removeItem("zxxr-order-request");
      } catch {}
      navigate(`/conta/pedidos/${order.id}?registrado=1`);
      if (catalog.contact)
        window.open(
          `https://wa.me/${catalog.contact}?text=${encodeURIComponent(orderMessage(order, window.location.origin))}`,
          "_blank",
          "noopener,noreferrer",
        );
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.code === "price_changed")
        void refreshCatalog();
    }
  }
  if (!items.length)
    return (
      <AccountShell title="Vamos escolher sua peça?">
        <p>Sua sacola está vazia.</p>
        <Link className="account-button primary" to="/#o-drop">
          Explorar o drop
        </Link>
      </AccountShell>
    );
  return (
    <AccountShell
      title="Quase sua."
      intro="Registre suas escolhas. A gente confirma os detalhes com você."
    >
      {catalog?.testMode && (
        <Notice>
          Ambiente de teste. Nenhuma cobrança ou produção será iniciada.
        </Notice>
      )}
      <ol className="checkout-steps" aria-label="Etapas do pedido">
        {["Seus dados", "Entrega", "Revisão"].map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <span>{i < step ? "✓" : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="account-two-columns">
        <section className="account-card">
          <form onSubmit={handleSubmit(submit)} noValidate>
            {error && <Notice error>{error}</Notice>}
            {step === 0 && (
              <>
                <h2 ref={stepHeading} tabIndex={-1}>Como falamos com você?</h2>
                <label>
                  Seu nome
                  <input
                    autoComplete="name"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <small role="alert">{errors.name.message}</small>
                  )}
                </label>
                <label>
                  E-mail
                  <input
                    value={session.user?.email ?? ""}
                    readOnly
                    type="email"
                  />
                  <small>Vinculado à sua conta.</small>
                </label>
                <label>
                  WhatsApp com DDD
                  <input
                    autoComplete="tel"
                    type="tel"
                    {...register("phone")}
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && (
                    <small role="alert">{errors.phone.message}</small>
                  )}
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <h2 ref={stepHeading} tabIndex={-1}>Onde sua peça chega?</h2>
                {addresses.length > 0 && (
                  <label>
                    Usar endereço salvo
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const a = addresses.find(
                          (a) => a.id === e.target.value,
                        );
                        if (a) setValue("address", a);
                      }}
                    >
                      <option value="">Preencher ou conferir abaixo</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.street}, {a.number} — {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <AddressFields
                  register={register}
                  errors={errors}
                  prefix="address"
                  lookup={() => void cep.lookup(getValues("address.cep"))}
                />
                {cep.hint && <Notice>{cep.hint}</Notice>}
                <label className="account-check">
                  <input type="checkbox" {...register("saveAddress")} />
                  Salvar este endereço na minha conta
                </label>
                <Notice>
                  O frete e o prazo serão confirmados no atendimento antes de
                  pagar.
                </Notice>
              </>
            )}
            {step === 2 && (
              <>
                <h2 ref={stepHeading} tabIndex={-1}>Confira sua escolha.</h2>
                <div className="account-review">
                  <p>
                    <strong>{getValues("name")}</strong>
                    <br />
                    {getValues("phone")}
                  </p>
                  <p>
                    {getValues("address.recipient")}
                    <br />
                    {getValues("address.street")}, {getValues("address.number")}{" "}
                    {getValues("address.complement")}
                    <br />
                    {getValues("address.neighborhood")} ·{" "}
                    {getValues("address.city")}/{getValues("address.state")}
                    <br />
                    CEP {getValues("address.cep")}
                  </p>
                </div>
                <fieldset className="payment-options">
                  <legend>Como prefere pagar?</legend>
                  {[
                    ["pix", "Pix"],
                    ["credit", "Cartão de crédito"],
                    ...(catalog?.paymentMethods.includes("boleto")
                      ? [["boleto", "Boleto"]]
                      : []),
                  ].map(([value, label]) => (
                    <label key={value}>
                      <input
                        {...register("paymentPreference")}
                        value={value}
                        type="radio"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <p className="account-muted">
                  A cobrança é combinada no WhatsApp. Esta escolha ainda não
                  realiza um pagamento.
                </p>
                <label>
                  Observação (opcional)
                  <textarea maxLength={280} rows={3} {...register("note")} />
                </label>
              </>
            )}
            <div className="account-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="account-button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                  }}
                >
                  Voltar
                </button>
              )}
              <button
                className="account-button primary"
                disabled={isSubmitting || (step === 2 && !catalog?.open)}
              >
                {isSubmitting
                  ? "Registrando…"
                  : step < 2
                    ? "Continuar"
                    : "Criar pedido e continuar no WhatsApp"}
              </button>
            </div>
            {step === 2 && (
              <p className="account-muted">
                Primeiro salvamos seu pedido. Depois você revisa e envia a
                mensagem para a loja.
              </p>
            )}
          </form>
        </section>
        <aside className="account-card order-summary">
          <h2>Sua seleção.</h2>
          {lines.map((line) => (
            <div
              className="account-order-line"
              key={`${line.productId}:${line.size}`}
            >
              <img
                src={productById(line.productId)?.front}
                alt=""
                width="60"
                height="72"
              />
              <div>
                <strong>{productById(line.productId)?.name}</strong>
                <p>
                  {line.size} · {line.quantity}{" "}
                  {line.quantity === 1 ? "peça" : "peças"}
                </p>
                {line.variant && (
                  <span>{brl(line.variant.price_cents * line.quantity)}</span>
                )}
              </div>
            </div>
          ))}
          {catalog ? (
            <dl className="account-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(subtotal)}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd>A confirmar</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>Após atendimento</dd>
              </div>
            </dl>
          ) : (
            <Notice error>{catalogError || "Consultando valores…"}</Notice>
          )}
          {!catalog && (
            <button
              className="account-button"
              onClick={() => void refreshCatalog()}
            >
              Consultar novamente
            </button>
          )}
          {catalog && !catalog.open && (
            <Notice error>
              As novas encomendas estão indisponíveis no momento. Sua sacola
              continua salva.
            </Notice>
          )}
          <Link to="/sacola">Editar minha sacola</Link>
        </aside>
      </div>
    </AccountShell>
  );
}
