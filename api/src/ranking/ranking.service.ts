import { Inject, Injectable } from "@nestjs/common";
import type { RankingEntry } from "@bolao/core/contracts";
import { rankStandings, type RankingGateway } from "@bolao/core/domain";
import { RANKING_GATEWAY } from "./ranking.provider.js";

/**
 * A classificação dos bolões.
 *
 * Daqui não sai regra: a porta agrega e `rankStandings` ordena e atribui
 * posição. O que sobra é agrupar por bolão e garantir que um bolão sem nenhuma
 * talha apareça com tabela vazia em vez de faltar do mapa.
 *
 * O retorno é anotado com `RankingEntry`, o tipo de fio, e recebe `Standing`,
 * o tipo de domínio, direto. Os dois são estruturalmente idênticos de
 * propósito: se o contrato mudar, o typecheck quebra aqui, que é a borda, e não
 * dentro da regra.
 */
@Injectable()
export class RankingService {
  constructor(
    @Inject(RANKING_GATEWAY) private readonly ranking: RankingGateway,
  ) {}

  async standings(
    poolIds: number[],
    round?: number,
  ): Promise<Map<number, RankingEntry[]>> {
    const byPool = new Map<number, RankingEntry[]>(
      poolIds.map((id) => [id, []]),
    );
    if (poolIds.length === 0) return byPool;

    const tallies = await this.ranking.talliesOf(poolIds, round);
    for (const [poolId, group] of Map.groupBy(
      tallies,
      (tally) => tally.poolId,
    )) {
      byPool.set(poolId, rankStandings(group));
    }
    return byPool;
  }
}
