import { AccountShell } from "./ui";
import { useCommerce } from "./CommerceProvider";
export function PrivacyPage() {
  const { catalog } = useCommerce();
  return (
    <AccountShell
      title="Seus dados, com cuidado."
      intro="Como a ZXXR usa as informações da sua conta e dos seus pedidos."
    >
      <article className="account-card privacy-copy">
        <h2>Para cuidar do seu pedido.</h2>
        <p>
          Guardamos nome, e-mail, contato, endereço e a seleção de peças para
          registrar a encomenda, atender você e acompanhar a produção e a
          entrega. O endereço de cada pedido é preservado mesmo que você altere
          seu cadastro depois.
        </p>
        <h2>Acesso à conta.</h2>
        <p>
          Você pode entrar com Google ou e-mail e senha. A autenticação é
          processada pelo Supabase. O login Google solicita informações de
          identidade, e-mail e perfil; não solicita acesso a Gmail, contatos ou
          agenda. Os e-mails de acesso são enviados pela Brevo.
        </p>
        <h2>Quem pode consultar.</h2>
        <p>
          Você consulta seus próprios pedidos. A equipe autorizada da ZXXR
          consulta as informações necessárias ao atendimento e mantém um
          histórico das alterações. Notas internas ficam reservadas à equipe.
        </p>
        <h2>WhatsApp e pagamento.</h2>
        <p>
          O botão do WhatsApp prepara uma mensagem para você revisar e enviar.
          Ao enviar, o conteúdo também passa a fazer parte da conversa nesse
          serviço. Entrega e cobrança são combinadas no atendimento. O site não
          recebe nem guarda os dados do seu cartão.
        </p>
        <h2>Armazenamento no navegador.</h2>
        <p>
          Usamos uma sessão protegida para manter o acesso e armazenamento local
          para sua sacola. Não há inscrição automática em campanhas de
          marketing. Ao sair da conta, o acesso aos dados privados é encerrado.
        </p>
        <h2>Converse com a loja.</h2>
        <p>
          Você pode conferir seus dados na conta e solicitar correções ou
          esclarecimentos pelo atendimento. Informações necessárias ao histórico
          dos pedidos e à operação são preservadas.
        </p>
        {catalog?.contact && (
          <a
            className="account-button"
            href={`https://wa.me/${catalog.contact}?text=${encodeURIComponent("Olá! Quero falar sobre os dados da minha conta na ZXXR.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com a ZXXR
          </a>
        )}
      </article>
    </AccountShell>
  );
}
