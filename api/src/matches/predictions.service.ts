import { Inject, Injectable } from "@nestjs/common";
import type {
  PredictionView,
  UpsertPredictionInput,
  WallView,
} from "@bolao/core/contracts";
import {
  MEMBERSHIP,
  type Membership,
} from "../membership/membership.provider.js";
import { MatchesService } from "./matches.service.js";
import {
  PREDICTION_USE_CASES,
  type PredictionUseCases,
} from "./prediction-gateway.provider.js";

@Injectable()
export class PredictionsService {
  constructor(
    @Inject(PREDICTION_USE_CASES)
    private readonly predictions: PredictionUseCases,
    private readonly matches: MatchesService,
    @Inject(MEMBERSHIP) private readonly membership: Membership,
  ) {}

  /**
   * A trava do palpite é regra de domínio e mora no caso de uso; o SQL que a
   * torna indivisível mora no adapter (ADR 0004 e ADR 0008). Daqui só sai a
   * forma de resposta.
   */
  async upsert(
    userId: number,
    matchId: number,
    { home, away }: UpsertPredictionInput,
  ): Promise<PredictionView> {
    const placed = await this.predictions.place({
      userId,
      matchId,
      score: { home, away },
    });

    return {
      home: placed.score.home,
      away: placed.score.away,
      points: placed.points,
    };
  }

  /** O muro da galera: palpites dos membros do bolão, revelados depois do apito. */
  async wall(
    poolId: number,
    userId: number,
    matchId: number,
  ): Promise<WallView> {
    await this.membership.requireMember(poolId, userId);
    const match = await this.matches.byId(userId, matchId);
    // A mesma leitura de janela da gravação: um predicado, um relógio.
    await this.predictions.requireVisible(matchId);
    const entries = await this.matches.wallEntries(poolId, matchId);

    return { match, entries };
  }
}
