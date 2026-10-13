import type { Db } from "../../db.ts";
import type {
  MatchRow,
  MatchesGateway,
  TeamRecord,
  WallRow,
} from "../../domain/matches/matches-gateway.ts";
import { Prisma } from "../../prisma.ts";
import { openWindow } from "./prediction-window.sql.ts";

const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  tla: true,
  crestUrl: true,
} as const;

const predictionSelect = {
  homeScore: true,
  awayScore: true,
  points: true,
} as const;

interface PredictionRow {
  homeScore: number;
  awayScore: number;
  points: number | null;
}

interface MatchRecord {
  id: number;
  season: number;
  round: number;
  kickoffAt: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamRecord;
  awayTeam: TeamRecord;
  predictions: PredictionRow[];
}

const toPrediction = (prediction: PredictionRow | undefined) =>
  prediction
    ? {
        home: prediction.homeScore,
        away: prediction.awayScore,
        points: prediction.points,
      }
    : null;

export function createPrismaMatchesGateway(db: Db): MatchesGateway {
  const includeFor = (userId: number) =>
    ({
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      predictions: { where: { userId }, select: predictionSelect },
    }) as const;

  /**
   * A flag `locked` de cada jogo, pelo fragmento compartilhado.
   *
   * É uma query a mais, depois da leitura, porque precisa dos ids. O preço é
   * `locked` poder estar milissegundos velho, e isso é aceitável: `locked` é
   * exibição, e a autoridade sobre gravar ou não continua sendo o comando de
   * escrita (ADR 0004). O que não era aceitável era escrever o predicado uma
   * segunda vez, em TypeScript e com o relógio da aplicação.
   */
  async function lockedFlags(
    matchIds: readonly number[],
  ): Promise<Map<number, boolean>> {
    if (matchIds.length === 0) return new Map();
    const rows = await db.$queryRaw<{ id: number; locked: boolean }[]>(
      Prisma.sql`
        SELECT m.id, NOT (${openWindow}) AS locked
          FROM matches m
         WHERE m.id = ANY(${[...matchIds]}::int[])`,
    );
    return new Map(rows.map((row) => [row.id, row.locked]));
  }

  const toRow = (match: MatchRecord, locked: boolean): MatchRow => ({
    id: match.id,
    season: match.season,
    round: match.round,
    kickoffAt: match.kickoffAt,
    status: match.status,
    locked,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    myPrediction: toPrediction(match.predictions[0]),
  });

  return {
    async firstUnfinishedRound(season) {
      const next = await db.match.findFirst({
        where: { season, status: { in: ["scheduled", "live"] } },
        orderBy: { kickoffAt: "asc" },
        select: { round: true },
      });
      return next?.round ?? null;
    },

    async lastRound(season) {
      const last = await db.match.findFirst({
        where: { season },
        orderBy: { round: "desc" },
        select: { round: true },
      });
      return last?.round ?? null;
    },

    async matchesOfRound(userId, season, round) {
      const matches = await db.match.findMany({
        where: { season, round },
        orderBy: [{ kickoffAt: "asc" }, { id: "asc" }],
        include: includeFor(userId),
      });
      const flags = await lockedFlags(matches.map((match) => match.id));
      // Flag ausente vira trancado: falhar fechado. Um jogo exibido como
      // destrancado por engano convida a palpitar e a gravação recusa.
      return matches.map((match) => toRow(match, flags.get(match.id) ?? true));
    },

    async matchById(userId, matchId) {
      const match = await db.match.findUnique({
        where: { id: matchId },
        include: includeFor(userId),
      });
      if (!match) return null;
      const flags = await lockedFlags([match.id]);
      return toRow(match, flags.get(match.id) ?? true);
    },

    async countOpenWithoutPrediction(userId, season, round) {
      // O mesmo fragmento da gravação: esta conta e a trava não têm como
      // discordar. Antes o predicado estava reescrito aqui, com o relógio da
      // aplicação.
      const rows = await db.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count
          FROM matches m
         WHERE m.season = ${season}
           AND m.round = ${round}
           AND ${openWindow}
           AND NOT EXISTS (SELECT 1
                             FROM predictions pr
                            WHERE pr.match_id = m.id
                              AND pr.user_id = ${userId})`);
      return rows[0]?.count ?? 0;
    },

    async wallEntriesOf(poolId, matchId) {
      const members = await db.poolMember.findMany({
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
      return members.map(({ user }): WallRow => ({
        user: { id: user.id, name: user.name },
        prediction: toPrediction(user.predictions[0]),
      }));
    },
  };
}
