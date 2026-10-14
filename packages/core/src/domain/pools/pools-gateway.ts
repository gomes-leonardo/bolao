/** O bolão como as leituras o devolvem. */
export interface PoolRecord {
  id: number;
  name: string;
  inviteCode: string;
  season: number;
  ownerId: number;
  memberCount: number;
}

/** Um membro do bolão, como a listagem o devolve. */
export interface MemberRecord {
  id: number;
  name: string;
  joinedAt: Date;
}

export interface CreatePoolCommand {
  ownerId: number;
  name: string;
  season: number;
  inviteCode: string;
}

export interface PoolsGateway {
  /**
   * Cria o bolão com o dono já como membro, ou devolve `null` quando o código
   * de convite colidiu.
   *
   * `null` em vez de erro, e pelo mesmo motivo do `placeWhileOpen`: a colisão
   * só é detectável na gravação. Quem chama não aprende que existe Prisma do
   * outro lado, nem que a detecção é um P2002 numa constraint com nome.
   */
  createWithInviteCode(
    command: CreatePoolCommand,
  ): Promise<{ id: number } | null>;

  findIdByInviteCode(inviteCode: string): Promise<number | null>;

  /**
   * Entra no bolão. `false` quando já era membro.
   *
   * Uma operação só, indivisível: dois cliques simultâneos não viram erro 500,
   * um entra e o outro recebe `false`.
   */
  addMember(poolId: number, userId: number): Promise<boolean>;

  /** Sai ou remove. `false` quando a pessoa não estava no bolão. */
  deleteMembership(poolId: number, userId: number): Promise<boolean>;

  rename(poolId: number, name: string): Promise<void>;

  deletePool(poolId: number): Promise<void>;

  poolsByIds(poolIds: readonly number[]): Promise<PoolRecord[]>;

  countMemberships(userId: number): Promise<number>;

  /** Ids dos bolões do usuário, do mais recente para o mais antigo. */
  membershipPoolIds(
    userId: number,
    skip: number,
    take: number,
  ): Promise<number[]>;

  countMembers(poolId: number): Promise<number>;

  listMembers(
    poolId: number,
    skip: number,
    take: number,
  ): Promise<MemberRecord[]>;
}
