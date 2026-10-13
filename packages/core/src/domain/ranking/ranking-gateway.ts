/** Soma e cravadas de um membro, sem ordem e sem posição. */
export interface MemberTally {
  user: { id: number; name: string };
  points: number;
  exactHits: number;
}

/** A mesma talha, com o bolão de onde ela veio. */
export interface PoolTally extends MemberTally {
  poolId: number;
}

/**
 * A porta da classificação.
 *
 * Ela devolve talha, não tabela: soma e cravadas por membro, sem ordenar e sem
 * atribuir posição. O corte é o mesmo que o ADR 0008 fez na trava do palpite,
 * só do outro lado — ali a regra era inseparável do comando de escrita e ficou
 * no adapter; aqui a agregação é acesso a dado e a ordenação é regra, então ela
 * sobe para `rankStandings`.
 *
 * É esse corte que faz o ranking em Redis ser um adapter novo em vez de uma
 * reescrita: quem implementar isto com um Sorted Set descobre duas coisas na
 * própria assinatura — que `round` precisa de chave por rodada, e que
 * `exactHits` tem de ser guardado também, porque o desempate depende dele.
 */
export interface RankingGateway {
  talliesOf(poolIds: readonly number[], round?: number): Promise<PoolTally[]>;
}
