import { Link } from "react-router";
import { useEffect, useState, type ReactNode } from "react";
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

function FooterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile ? (
    <details className="store-footer-group">
      <summary>
        {title}
        <span aria-hidden="true">+</span>
      </summary>
      <nav aria-label={title}>{children}</nav>
    </details>
  ) : (
    <nav className="store-footer-group" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </nav>
  );
}

export function StoreFooter() {
  const { session } = useCommerce();
  const account = accountDestination(!!session.user);
  return (
    <footer className="site-footer storefront-footer">
      <div className="store-service-strip" aria-label="Comprar na ZXXR">
        <Link to="/ajuda#como-comprar">
          <span aria-hidden="true">01</span>
          <div>
            <strong>Feitas sob encomenda</strong>
            <p>Escolha sua estampa e seu tamanho.</p>
          </div>
        </Link>
        <Link to="/ajuda#pagamento">
          <span aria-hidden="true">02</span>
          <div>
            <strong>Pagamento pelo atendimento</strong>
            <p>Frete e prazo confirmados antes de pagar.</p>
          </div>
        </Link>
        <Link to={account}>
          <span aria-hidden="true">03</span>
          <div>
            <strong>Acompanhe na sua conta</strong>
            <p>Veja seu pedido em cada etapa.</p>
          </div>
        </Link>
      </div>
      <div className="store-footer-grid">
        <section
          className="store-footer-brand"
          aria-labelledby="footer-brand-title"
        >
          <Link to="/" aria-label="ZXXR Store, voltar ao início">
            <img
              src="/brand/store-black.svg"
              alt="ZXXR Store"
              width="144"
              height="72"
            />
          </Link>
          <h2 id="footer-brand-title" className="ps-sr-only">
            ZXXR Store
          </h2>
          <p>
            Camisetas criadas por Razz.
            <br />
            Da música para a rua.
          </p>
          <a
            className="store-instagram"
            href={storefront.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {storefront.instagram.label}
            <span aria-hidden="true">↗</span>
          </a>
        </section>
        <FooterGroup title="Comprar">
          <Link to={storefront.camisetas}>Camisetas</Link>
          <Link to={storefront.guia}>Como comprar</Link>
          <Link to={storefront.sacola}>Minha sacola</Link>
        </FooterGroup>
        <FooterGroup title="Minha conta">
          <Link to={account}>Minha conta</Link>
          <Link to={account}>Acompanhar pedido</Link>
          <Link to={accountDestination(!!session.user, storefront.dados)}>
            Meus dados
          </Link>
        </FooterGroup>
        <FooterGroup title="Ajuda">
          {helpTopics
            .filter((topic) => topic.id !== "como-comprar")
            .map((topic) => (
              <Link to={`/ajuda#${topic.id}`} key={topic.id}>
                {topic.label}
              </Link>
            ))}
          <Link to={storefront.privacidade}>Privacidade</Link>
        </FooterGroup>
      </div>
      <div className="store-footer-bottom">
        <div className="store-footer-payments">
          <h2>Pagamento no atendimento</h2>
          <PaymentMethods />
          <p>Combine com a loja pelo WhatsApp.</p>
        </div>
        <div className="store-footer-contact">
          <StoreContact />
          <StoreTestNotice />
        </div>
      </div>
      <div className="store-footer-legal">
        <small>
          © {new Date().getFullYear()} ZXXR Store · Uma criação de Razz.
        </small>
        <a href="#top">
          Voltar ao topo <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}
