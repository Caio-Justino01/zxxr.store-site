import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { CartItem } from "../lib/cart";
import { productById } from "../config/products";
import { preorder } from "../config/preorder";
import { formatPrice } from "../lib/format-price";
import {
  buildPreorderMessage, buildWhatsappLink, formatCep,
  summarizePreorder, validateCustomer,
} from "../lib/preorder";
import { Arrow, BagIcon } from "./Icons";
import "../preorder.css";

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4.3 19.7 1-3.5a8.4 8.4 0 1 1 3 2.8l-4 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7.9c-.5-.2-.8.1-1 .7-.4 1.7 2.9 5.2 5 5.6.7.2 1.6-.6 1.7-1.2.1-.4-1.5-1.2-1.8-1.1-.3.1-.6.7-1 .6-.7-.3-1.9-1.4-2.2-2.1-.2-.4.5-.8.5-1.1 0-.3-.8-1.3-1.2-1.4Z" fill="currentColor"/></svg>;
}

export function PreorderCheckout({ items }: { items: CartItem[] }) {
  const [name, setName] = useState("");
  const [cep, setCep] = useState("");
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const cepInput = useRef<HTMLInputElement>(null);
  const summary = useMemo(() => {
    try { return summarizePreorder(items); } catch { return null; }
  }, [items]);
  const customer = { name, cep, note };
  const valid = validateCustomer(customer);
  const message = useMemo(() => {
    if (!summary || !valid.name || !valid.cep || !valid.note) return "";
    return buildPreorderMessage(summary, { name, cep, note }, preorder.testMode);
  }, [summary, name, cep, note, valid.name, valid.cep, valid.note]);
  const whatsappUrl = buildWhatsappLink(preorder.whatsapp ?? undefined, message);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!valid.name || !valid.cep || !valid.note || !whatsappUrl || !preorder.open) {
      event.preventDefault();
      setAttempted(true);
      if (!valid.name) nameInput.current?.focus();
      else if (!valid.cep) cepInput.current?.focus();
    }
  }

  if (!summary) return (
    <main id="top" className="preorder-page">
      <Link to="/sacola" className="back-link"><Arrow back /> Voltar à sacola</Link>
      <div className="empty-bag"><BagIcon /><h1>Vamos escolher sua peça?</h1>
        <p>Adicione uma camiseta à sacola para começar seu pedido.</p>
        <Link to="/#o-drop" className="add-button">Explorar o drop <Arrow /></Link>
      </div>
    </main>
  );

  return (
    <main id="top" className="preorder-page">
      <Link to="/sacola" className="back-link"><Arrow back /> Revisar minha sacola</Link>
      <header className="preorder-heading">
        <h1 tabIndex={-1}>Seu pedido.</h1>
        <p>A sua seleção, com atendimento de perto. Confira as peças e converse com a ZXXR para combinar a entrega.</p>
      </header>
      {preorder.testMode && <p className="preorder-test" role="note"><span aria-hidden="true" />Pré-venda em teste. A mensagem será identificada como teste.</p>}
      <div className="preorder-layout">
        <section className="preorder-contact liquid-glass" aria-labelledby="preorder-contact-title">
          <div className="preorder-section-heading"><WhatsAppIcon /><h2 id="preorder-contact-title">Vamos conversar.</h2></div>
          <p>Seu nome e o CEP ajudam a loja a preparar o atendimento e confirmar o frete.</p>
          <form action={preorder.whatsapp ? `https://wa.me/${preorder.whatsapp}` : undefined} method="get" target="_blank" rel="noopener noreferrer" onSubmit={submit} noValidate>
            <input type="hidden" name="text" value={message} />
            <label htmlFor="preorder-name">Seu nome</label>
            <input ref={nameInput} id="preorder-name" value={name} autoComplete="name" maxLength={80} required
              onChange={(event) => setName(event.target.value)}
              aria-invalid={attempted && !valid.name} aria-describedby={attempted && !valid.name ? "preorder-name-error" : undefined}
              placeholder="Como podemos te chamar?" />
            {attempted && !valid.name && <p className="preorder-field-error" id="preorder-name-error" role="alert">Informe seu nome, com pelo menos 2 caracteres.</p>}
            <label htmlFor="preorder-cep">CEP de entrega</label>
            <input ref={cepInput} id="preorder-cep" value={cep} inputMode="numeric" autoComplete="postal-code" maxLength={9} required
              onChange={(event) => setCep(formatCep(event.target.value))}
              aria-invalid={attempted && !valid.cep} aria-describedby={attempted && !valid.cep ? "preorder-cep-error" : "preorder-cep-hint"}
              placeholder="00000-000" />
            {attempted && !valid.cep ? <p className="preorder-field-error" id="preorder-cep-error" role="alert">Informe os 8 números do CEP de entrega.</p>
              : <p id="preorder-cep-hint" className="preorder-field-hint">O valor e as opções de envio serão confirmados no atendimento.</p>}
            <label htmlFor="preorder-note">Quer acrescentar algo? <span>Opcional</span></label>
            <textarea id="preorder-note" value={note} maxLength={280} rows={3} onChange={(event) => setNote(event.target.value)} placeholder="Deixe uma observação para a loja." />
            {!preorder.open ? <p className="preorder-unavailable" role="status">As encomendas deste lote estão encerradas.</p>
              : !preorder.whatsapp && <p className="preorder-unavailable" role="status">O atendimento de pedidos está indisponível no momento. Sua sacola continua salva.</p>}
            <button type="submit" className="add-button preorder-submit" disabled={!preorder.whatsapp || !preorder.open}>
              <span>{preorder.testMode ? "Testar pedido no WhatsApp" : "Continuar no WhatsApp"}</span><WhatsAppIcon />
            </button>
            <p className="preorder-privacy">Ao continuar, seu nome, CEP e seleção serão incluídos na mensagem do WhatsApp. Revise e envie a mensagem para iniciar o atendimento.</p>
          </form>
          <details className="preorder-message"><summary>Conferir mensagem <span aria-hidden="true">+</span></summary>
            <pre>{message || "Preencha seu nome e o CEP para conferir a mensagem com suas peças."}</pre>
          </details>
        </section>
        <aside className="preorder-summary liquid-glass" aria-labelledby="preorder-summary-title">
          <div className="preorder-summary-heading"><h2 id="preorder-summary-title">Suas peças.</h2><span>{summary.quantity} {summary.quantity === 1 ? "peça" : "peças"}</span></div>
          <ul className="preorder-lines">{summary.lines.map((line) => <li key={`${line.productId}:${line.size}`}>
            <div className="preorder-line-image"><img src={productById(line.productId)!.front} alt="" width={72} height={84} /></div>
            <div><h3>{line.name}</h3><p>{line.color} · {line.size}</p><small>{line.quantity} × {formatPrice(line.unitCents / 100)}</small></div>
            <strong>{formatPrice(line.totalCents / 100)}</strong>
          </li>)}</ul>
          <dl className="preorder-totals"><div><dt>Subtotal das peças</dt><dd>{formatPrice(summary.subtotalCents / 100)}</dd></div>
            <div><dt>Frete</dt><dd>A confirmar</dd></div><div><dt>Total com frete</dt><dd>No atendimento</dd></div>
          </dl>
          <p className="preorder-production"><span aria-hidden="true">↗</span>Feita sob encomenda. Confirme o frete e o prazo de produção com a loja antes de pagar.</p>
          <Link className="preorder-edit" to="/sacola">Editar minha seleção <Arrow /></Link>
        </aside>
      </div>
    </main>
  );
}
