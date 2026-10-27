# Operação da ZXXR

## Acesso e responsabilidades

Cliente acessa somente os próprios pedidos. Funcionário precisa de convite do dono e código de autenticador. A equipe consulta os pedidos, assume atendimento, confere dados e prepara produção/envio. Só o dono libera total/link de pagamento, confirma dinheiro recebido, cancelamento e estorno, altera catálogo e acessos.

Nunca compartilhe uma conta entre funcionários. Para desligar alguém: Painel → Equipe → Desativar. O bloqueio é verificado no servidor a cada operação; o histórico anterior permanece.

## Atendimento de um pedido

1. Abra Pedidos do drop. Pedidos identificados como teste nunca devem ser cobrados nem produzidos.
2. Assuma o atendimento e confira as peças, tamanhos, contato e endereço com o cliente. Marque a conferência do endereço.
3. Calcule o frete fora do sistema e registre o valor e o prazo combinado de produção/entrega. Não invente previsão.
4. O dono confere o total e libera as condições. Se houver link do provedor de pagamento, ele o registra nessa etapa. A cobrança é integral e acontece fora do site.
5. Revise a mensagem e clique em Preparar mensagem no WhatsApp. O site abre o texto; VOCÊ precisa enviar. Marcar atendimento realizado é uma declaração sua, não uma confirmação de entrega/leitura do WhatsApp.
6. O dono confere o pagamento no banco/provedor antes de Confirmar recebimento. Abrir link, receber comprovante ou retornar ao site não confirma dinheiro recebido.
7. Confira peças e tamanhos para produção. Depois de pago, inicie produção e preparação de envio.
8. Confira a embalagem e registre código e referência da postagem. Insira apenas links oficiais HTTPS para rastreamento.
9. Confirme a entrega após verificá-la. Avise o cliente manualmente quando necessário.

Os e-mails da loja são somente de acesso: confirmar cadastro, recuperar senha e convidar funcionário. Não há e-mail automático de status, WhatsApp automático ou cobrança automática.

## Alterações e divergências

As solicitações chegam pelo WhatsApp. Registre o motivo ao alterar endereço, peças ou tamanhos. Antes de pagar, uma alteração invalida as condições liberadas e pede nova conferência de frete/total. Após pagamento, somente o dono pode alterar dados/seleção; o subtotal pago não pode ser alterado silenciosamente. Para diferença de valor, combine cancelamento/estorno e um novo pedido.

Notas internas nunca aparecem para o cliente nem entram automaticamente nas mensagens. As mensagens prontas usam apenas informações públicas do pedido. Revise qualquer texto que você acrescentar.

Se outra pessoa tiver atualizado o pedido, o site bloqueia a gravação. Recarregue, confira o novo histórico e repita a ação correta. Não repita confirmação financeira sem conferir o resultado anterior.

Cancelar um pedido pago gera estorno pendente. O dono só marca o estorno depois de verificá-lo no provedor. A loja não envia dinheiro por esse botão.

## Fechamento do lote

1. Dono → Loja e catálogo → Encerrar novas encomendas. Pedidos existentes permanecem acessíveis.
2. Concilie pagamentos pendentes antes de fechar a quantidade de produção.
3. Exporte produção paga, conferindo filtros de data/status. O CSV conta peças efetivamente pagas; pedidos pendentes e estornados ficam fora.
4. Exporte separadamente os pedidos necessários à operação. O arquivo contém dados pessoais: guarde em pasta privada e nunca no GitHub, grupos ou links públicos.
5. Revise etiquetas, embalagem e prazo com o fornecedor antes do envio. Não há integração automática com transportadora.

## Backup e recuperação

Ao final de cada dia com pedidos, exporte a seleção completa sem filtros. Esse JSON é um registro operacional, não inclui senhas e não substitui o backup do banco.

O responsável técnico deve exportar o banco com `supabase db dump --linked --data-only` para uma pasta privada fora do repositório, mantendo migrations e usuários Auth necessários à restauração. Faça uma exportação antes de qualquer mudança de schema. A senha do banco é inserida pelo dono, nunca em texto no Git ou em comandos versionados.

Restauração deve ser validada em ambiente separado: aplicar migrations, restaurar os dados e vínculos de usuários, verificar contagens, totais, amostras de pedidos e permissões. Nunca testar restauração sobre a loja ativa. Exportação operacional e dump não recuperam automaticamente identidades de um projeto diferente.

O Supabase gratuito pode pausar após inatividade. Se isso acontecer, retome pelo painel da conta dona; a vitrine continua estática, mas login e pedidos devem exibir indisponibilidade, sem fingir confirmação.

## Recuperação de acesso da equipe

Use recuperação de senha para a senha da conta; ela não remove a exigência do autenticador. Se perder o autenticador, interrompa o acesso e peça ao dono para desativar o funcionário. O responsável técnico valida a identidade fora do site, remove o fator perdido pelo painel seguro do Supabase e orienta novo cadastro do autenticador. Mantenha a conta proprietária do Supabase protegida por MFA. Não existe botão público para se tornar dono ou desligar a proteção.
