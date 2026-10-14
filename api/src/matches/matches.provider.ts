import { createPrismaMatchesGateway, type Db } from "@bolao/core";
import {
  currentRoundOf,
  pendingPredictionsOf,
  type MatchRow,
  type WallRow,
} from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const MATCHES = Symbol("MATCHES");

export interface Matches {
  currentRound(season: number): Promise<number>;
  pendingPredictions(userId: number, season: number): Promise<number>;
  matchesOfRound(
    userId: number,
    season: number,
    round: number,
  ): Promise<MatchRow[]>;
  matchById(userId: number, matchId: number): Promise<MatchRow | null>;
  wallEntriesOf(poolId: number, matchId: number): Promise<WallRow[]>;
}

/**
 * Liga a porta de jogos ao adapter do Prisma.
 *
 * A resolução da rodada entra como caso de uso, não como os dois métodos crus
 * da porta: chamar `firstUnfinishedRound` e esquecer o fallback para a última
 * rodada muda o comportamento em silêncio, e a temporada vazia tem respostas
 * diferentes dependendo de quem pergunta. Fora do alcance da borda, não tem
 * como dar errado por engano — é o mesmo argumento do `windowOf` (ADR 0008).
 *
 * As leituras de jogo passam direto, porque não existe decisão nelas.
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const matchesProvider: Provider = {
  provide: MATCHES,
  inject: [DB],
  useFactory: (db: Db): Matches => {
    const gateway = createPrismaMatchesGateway(db);
    return {
      currentRound: (season) => currentRoundOf(gateway, season),
      pendingPredictions: (userId, season) =>
        pendingPredictionsOf(gateway, userId, season),
      matchesOfRound: (userId, season, round) =>
        gateway.matchesOfRound(userId, season, round),
      matchById: (userId, matchId) => gateway.matchById(userId, matchId),
      wallEntriesOf: (poolId, matchId) =>
        gateway.wallEntriesOf(poolId, matchId),
    };
  },
};
