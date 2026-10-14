/** O usuário como o resto do sistema o vê: sem hash de senha, nunca. */
export interface UserIdentity {
  id: number;
  name: string;
  email: string;
}

/** A identidade mais o que só o login precisa ver. */
export interface UserCredentials extends UserIdentity {
  passwordHash: string;
}

export interface CreateUserCommand {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * A porta das contas.
 *
 * Diferente das outras portas do domínio, esta não tem caso de uso em cima
 * dela, e é de propósito: a regra da autenticação é gastar o mesmo tempo nos
 * dois ramos do login e devolver a mesma resposta, o que depende do hash do
 * sentinela e da função de verificação de senha. Isso é costura de borda (ADR
 * 0005), não regra de bolão, e trazer para cá exigiria uma porta de hashing
 * para nada. A porta existe para o `auth.service.ts` parar de conhecer o
 * Prisma, não para mover a decisão de lugar.
 */
export interface UsersGateway {
  /**
   * Cria a conta, ou devolve `null` quando o e-mail já tem uma.
   *
   * `null` em vez de erro pelo mesmo motivo do `placeWhileOpen`: a colisão só é
   * detectável na gravação, e quem detecta é o adapter. Checar antes de criar
   * deixaria uma janela entre a checagem e a escrita.
   */
  createUnlessEmailTaken(
    command: CreateUserCommand,
  ): Promise<UserIdentity | null>;

  /** Inclui o hash, porque é o login que compara. Nenhum outro caminho usa. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;

  findById(id: number): Promise<UserIdentity | null>;

  /** Só a existência: o guard de desenvolvimento não precisa de mais nada. */
  exists(id: number): Promise<boolean>;
}
