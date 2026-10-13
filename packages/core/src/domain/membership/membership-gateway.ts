/** O que a autorização precisa saber de um bolão, e nada além disso. */
export interface PoolAccess {
  id: number;
  ownerId: number;
  season: number;
}

/**
 * A porta da autorização de bolão.
 *
 * Um método só, e ele devolve `null` tanto para "o bolão não existe" quanto
 * para "quem pediu não é membro". A conflação é a regra de não revelar
 * existência, e ela está no contrato em vez de num comentário: quem implementa
 * esta porta não tem como devolver os dois casos separados, então nenhum caso
 * de uso tem como vazar a diferença.
 */
export interface MembershipGateway {
  findVisiblePool(poolId: number, userId: number): Promise<PoolAccess | null>;
}
