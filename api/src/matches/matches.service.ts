import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type { MatchView, RoundView } from "@bolao/core/contracts";
import { notFound } from "../common/errors.js";
import { currentSeason } from "../common/season.js";
import { DB } from "../db/db.module.js";
import { predictionSelect, teamSelect, toMatchView } from "./match-view.js";

@Injectable()
export class MatchesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Rodada do próximo jogo ainda não encerrado; se a temporada acabou, a última. */
  async findCurrentRound(season: number): Promise<number | null> {
    const next = await this.db.match.findFirst({
      where: { season, status: { in: ["scheduled", "live"] } },
      orderBy: { kickoffAt: "asc" },
      select: { round: true },
    });
    if (next) return next.round;

    const last = await this.db.match.findFirst({
      where: { season },
      orderBy: { round: "desc" },
      select: { round: true },
    });
    return last?.round ?? null;
  }

  async currentRound(season: number): Promise<number> {
    const round = await this.findCurrentRound(season);
    if (round === null) {
      throw notFound(
        "NOT_FOUND",
        `Nenhum jogo de ${season} importado ainda. Rode o CLI.`,
      );
    }
    return round;
  }

  async round(userId: number, round?: number): Promise<RoundView> {
    const season = currentSeason();
    const selected = round ?? (await this.currentRound(season));
    const matches = await this.db.match.findMany({
      where: { season, round: selected },
      orderBy: [{ kickoffAt: "asc" }, { id: "asc" }],
      include: this.includeFor(userId),
    });
    const now = new Date();
    return {
      season,
      round: selected,
      matches: matches.map((match) =>
        toMatchView(match, match.predictions[0], now),
      ),
    };
  }

  async byId(userId: number, matchId: number): Promise<MatchView> {
    const match = await this.db.match.findUnique({
      where: { id: matchId },
      include: this.includeFor(userId),
    });
    if (!match) throw notFound("MATCH_NOT_FOUND", "Jogo não encontrado.");
    return toMatchView(match, match.predictions[0], new Date());
  }

  /** Jogos da rodada atual que ainda aceitam palpite e o usuário não palpitou. */
  async pendingPredictions(userId: number, season: number): Promise<number> {
    const round = await this.findCurrentRound(season);
    if (round === null) return 0;
    return this.db.match.count({
      where: {
        season,
        round,
        status: "scheduled",
        kickoffAt: { gt: new Date() },
        predictions: { none: { userId } },
      },
    });
  }

  private includeFor(userId: number) {
    return {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      predictions: { where: { userId }, select: predictionSelect },
    } as const;
  }
}
