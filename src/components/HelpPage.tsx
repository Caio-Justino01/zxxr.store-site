import { Link } from "react-router";
import { helpContent } from "../config/help-content";
import { useCommerce } from "../commerce/CommerceProvider";
import {
  accountDestination,
  helpTopics,
  storefront,
} from "../config/storefront";
import {
  PaymentMethods,
  StoreContact,
  StoreTestNotice,
} from "./StoreInformation";

export function HelpPage() {
  const { session } = useCommerce();
  return (
    <main id="top" className="store-help-page">
      <header className="store-help-heading">
        <Link to={storefront.camisetas} className="back-link">
          ← Ver camisetas
        </Link>
        <h1 tabIndex={-1}>Central de ajuda</h1>
        <p>Da escolha da camiseta ao acompanhamento do seu pedido.</p>
        <StoreTestNotice />
      </header>
      <div className="store-help-layout">
        <nav
          className="store-help-topics"
          aria-label="Assuntos da Central de ajuda"
        >
          {helpTopics.map((topic) => (
            <Link key={topic.id} to={`/ajuda#${topic.id}`}>
              {topic.label}
            </Link>
          ))}
        </nav>
        <div className="store-help-content">
          <section id="como-comprar" aria-labelledby="help-buy-title">
            <h2 id="help-buy-title">Como comprar</h2>
            <ol className="store-buy-steps">
              <li>
                <strong>Escolha suas camisetas.</strong> Veja frente, costas e
                fotos do ensaio. Selecione o tamanho e adicione à sacola.
              </li>
              <li>
                <strong>Preencha seus dados.</strong> Entre ou crie sua conta,
                informe contato e endereço e confira sua seleção.
              </li>
              <li>
                <strong>Registre o pedido.</strong> O botão “Criar pedido e
                continuar no WhatsApp” salva o pedido antes de abrir a conversa.
              </li>
              <li>
                <strong>Conclua o atendimento.</strong> Revise e envie a
                mensagem. A loja confirma frete, prazo e pagamento com você.
              </li>
            </ol>
            <p>
              Se o WhatsApp não abrir, seu pedido continua salvo. Na conta, você
              pode copiar a mensagem ou retomar o atendimento.
            </p>
            <Link className="account-button primary" to={storefront.camisetas}>
              Ver camisetas
            </Link>
          </section>
          <section id="pagamento" aria-labelledby="help-payment-title">
            <h2 id="help-payment-title">Pagamento</h2>
            <PaymentMethods />
            <p>{helpContent.payment}</p>
            <p>{helpContent.paymentTotal}</p>
            <p>O site não recebe nem guarda os dados do seu cartão.</p>
          </section>
          <section id="entrega" aria-labelledby="help-delivery-title">
            <h2 id="help-delivery-title">Entrega e acompanhamento</h2>
            <p>{helpContent.delivery}</p>
            <p>
              Frete a confirmar não significa frete grátis. Confira as condições
              com a loja antes de pagar.
            </p>
            <p>{helpContent.tracking}</p>
            <Link
              className="store-inline-link"
              to={accountDestination(!!session.user)}
            >
              Acompanhar meu pedido
            </Link>
          </section>
          <section id="tamanhos" aria-labelledby="help-size-title">
            <h2 id="help-size-title">Tamanhos e caimento</h2>
            <p>{helpContent.sizes}</p>
            <p>{helpContent.sizeAdvice}</p>
            <StoreContact
              message="Olá! Quero ajuda para escolher o tamanho de uma camiseta da ZXXR."
              label="Tirar dúvida sobre tamanho"
            />
          </section>
          <section id="trocas" aria-labelledby="help-returns-title">
            <h2 id="help-returns-title">Trocas e devoluções</h2>
            <p>{helpContent.returns}</p>
            <p>{helpContent.returnsNext}</p>
            <p>{helpContent.address}</p>
            <Link
              className="store-inline-link"
              to={accountDestination(!!session.user)}
            >
              Acessar meus pedidos
            </Link>
          </section>
          <section id="atendimento" aria-labelledby="help-contact-title">
            <h2 id="help-contact-title">Atendimento</h2>
            <p>
              Para conversar sobre um pedido, use “Continuar atendimento” nos
              detalhes dele: a mensagem já inclui a referência certa. Para
              outras dúvidas, fale com a ZXXR pelo botão abaixo.
            </p>
            <StoreContact />
            <p>
              Você também encontra a marca no{" "}
              <a
                className="store-inline-link"
                href={storefront.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram · @zxxr.store
              </a>
              .
            </p>
            <Link className="store-inline-link" to={storefront.privacidade}>
              Como cuidamos dos seus dados
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
