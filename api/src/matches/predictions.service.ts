import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type {
  PredictionView,
  UpsertPredictionInput,
  WallView,
} from "@bolao/core/contracts";
import { conflict, notFound } from "../common/errors.js";
import { DB } from "../db/db.module.js";
import { MembershipService } from "../membership/membership.service.js";
import { isLocked, predictionSelect, toPredictionView } from "./match-view.js";
import { MatchesService } from "./matches.service.js";

interface UpsertedRow {
  home_score: number;
  away_score: number;
  points: number | null;
}

@Injectable()
export class PredictionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly matches: MatchesService,
    private readonly membership: MembershipService,
  ) {}

  /**
   * A trava mora no próprio SQL: o palpite só é gravado se, no mesmo comando,
   * o jogo ainda está agendado e o apito não soou. Checar antes e gravar depois
   * deixaria uma janela para palpitar com o jogo já começado.
   * O FOR SHARE conflita com o lock do registerResult, que encerra o jogo.
   */
  async upsert(
    userId: number,
    matchId: number,
    { home, away }: UpsertPredictionInput,
  ): Promise<PredictionView> {
    const rows = await this.db.$queryRaw<UpsertedRow[]>`
      INSERT INTO predictions (user_id, match_id, home_score, away_score)
      SELECT ${userId}, m.id, ${home}, ${away}
        FROM matches m
       WHERE m.id = ${matchId}
         AND m.status = 'scheduled'
         AND m.kickoff_at > now()
         FOR SHARE
      ON CONFLICT (user_id, match_id) DO UPDATE
         SET home_score = EXCLUDED.home_score,
             away_score = EXCLUDED.away_score,
             updated_at = now()
      RETURNING home_score, away_score, points`;

    const [saved] = rows;
    if (saved) {
      return toPredictionView({
        homeScore: saved.home_score,
        awayScore: saved.away_score,
        points: saved.points,
      });
    }

    const exists = await this.db.match.count({ where: { id: matchId } });
    if (!exists) throw notFound("MATCH_NOT_FOUND", "Jogo não encontrado.");
    throw conflict("PREDICTION_LOCKED", "Bola rolou, palpite trancado.");
  }

  /** O muro da galera: palpites dos membros do bolão, revelados depois do apito. */
  async wall(
    poolId: number,
    userId: number,
    matchId: number,
  ): Promise<WallView> {
    await this.membership.requireMember(poolId, userId);
    const match = await this.matches.byId(userId, matchId);
    if (
      !isLocked(
        { status: match.status, kickoffAt: new Date(match.kickoffAt) },
        new Date(),
      )
    ) {
      throw conflict(
        "PREDICTIONS_HIDDEN",
        "Os palpites da galera aparecem quando a bola rolar.",
      );
    }

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
