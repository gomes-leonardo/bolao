import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type {
  PredictionView,
  UpsertPredictionInput,
  WallView,
} from "@bolao/core/contracts";
import {
  placePrediction,
  requirePredictionsVisible,
  type PredictionsGateway,
} from "@bolao/core/domain";
import { DB } from "../db/db.module.js";
import { MembershipService } from "../membership/membership.service.js";
import { predictionSelect, toPredictionView } from "./match-view.js";
import { MatchesService } from "./matches.service.js";
import { PREDICTION_GATEWAY } from "./prediction-gateway.provider.js";

@Injectable()
export class PredictionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PREDICTION_GATEWAY)
    private readonly predictions: PredictionsGateway,
    private readonly matches: MatchesService,
    private readonly membership: MembershipService,
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
    const placed = await placePrediction(this.predictions, {
      userId,
      matchId,
      score: { home, away },
    });

    return toPredictionView({
      homeScore: placed.score.home,
      awayScore: placed.score.away,
      points: placed.points,
    });
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
    await requirePredictionsVisible(this.predictions, matchId);

    const members = await this.db.poolMember.findMany({
      where: { poolId },
      orderBy: { user: { name: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            predictions: { where: { matchId }, select: predictionSelect },
          },
        },
      },
    });

    return {
      match,
      entries: members.map(({ user }) => {
        const [prediction] = user.predictions;
        return {
          user: { id: user.id, name: user.name },
          prediction: prediction ? toPredictionView(prediction) : null,
        };
      }),
    };
  }
}
