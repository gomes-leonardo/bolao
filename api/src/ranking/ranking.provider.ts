import { createPrismaRankingGateway, type Db } from "@bolao/core";
import type { RankingGateway } from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const RANKING_GATEWAY = Symbol("RANKING_GATEWAY");

/**
 * Liga a porta da classificação ao adapter do Prisma.
 *
 * É a única linha que muda quando o ranking passar a vir de um Sorted Set do
 * Redis: a regra de ordenação e empate não é tocada, porque ela não está aqui.
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const rankingGatewayProvider: Provider = {
  provide: RANKING_GATEWAY,
  inject: [DB],
  useFactory: (db: Db): RankingGateway => createPrismaRankingGateway(db),
};
