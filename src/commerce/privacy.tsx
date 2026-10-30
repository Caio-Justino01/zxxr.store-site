import { AccountShell } from "./ui";
import { useCommerce } from "./CommerceProvider";
import { ConsentSettingsButton } from "../privacy/ConsentProvider";
import { RecoveryPreference } from "../analytics/RecoveryCart";
export function PrivacyPage() {
  const { catalog } = useCommerce();
  return (
    <AccountShell
      title="Privacidade"
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
        <h2>Estatísticas com sua escolha.</h2>
        <p>Quando você permite as estatísticas, registramos visitas, origem de campanhas, tipo de dispositivo e interações com peças e seções. Usamos identificadores aleatórios de navegador e sessão; não gravamos sua tela, campos de formulário, senhas ou dados de cartão. Os eventos detalhados são mantidos por até 90 dias. São estimativas: bloqueadores, recusa de coleta e troca de dispositivo reduzem a cobertura.</p>
        <p>A operação usa Cloudflare para servir o site e Supabase para armazenar os dados. Os relatórios de analytics e recuperação ficam restritos ao proprietário autenticado em duas etapas. Pedidos e pagamentos são apurados pelos registros da loja; o clique no WhatsApp não confirma pagamento.</p>
        <h2>Spotify e conteúdo externo.</h2>
        <p>Fotos e capas da apresentação ficam hospedadas na loja. O player só é criado após sua autorização para conteúdo externo. Ao carregar, o Spotify pode receber informações da conexão e usar seus próprios cookies. Retirar a autorização impede novas cargas e remove o player; não podemos apagar cookies que esse serviço já tenha guardado no próprio domínio.</p>
        <h2>Lembrete de sacola.</h2>
        <p>Somente com uma autorização separada, associamos a sacola atual à sua conta e ao WhatsApp já cadastrado para ajudar a finalizar sua escolha. Uma sacola pode ser considerada abandonada após 24 horas sem atividade e sem pedido registrado. O lembrete é manual, sem inscrição automática em campanhas. A identificação de recuperação é encerrada após 30 dias sem atividade. Revogar impede novos contatos por essa finalidade; não apaga pedidos que precisam ser preservados.</p>
        <RecoveryPreference />
        <h2>Alterar suas escolhas.</h2>
        <p>Você pode aceitar, recusar ou retirar os opcionais abaixo. Ao retirar estatísticas, interrompemos a coleta e removemos os identificadores opcionais deste navegador. Login, segurança, sacola e pedidos continuam funcionando. Não enviamos retrospectivamente suas interações anteriores ao aceite.</p>
        <ConsentSettingsButton>Revisar privacidade e cookies</ConsentSettingsButton>
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
