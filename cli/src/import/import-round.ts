import { registerResult, type Db } from "@bolao/core";
import type { FootballDataMatch } from "../football-data/client.ts";
import { toMatchStatus } from "../football-data/status.ts";

export interface ImportRoundInput {
  season: number;
  matches: FootballDataMatch[];
}

export interface ImportSummary {
  teams: number;
  matches: number;
  scored: number;
}

type ApiTeam = FootballDataMatch["homeTeam"];

function uniqueTeams(matches: FootballDataMatch[]): ApiTeam[] {
  const teams = new Map<number, ApiTeam>();
  for (const match of matches) {
    teams.set(match.homeTeam.id, match.homeTeam);
    teams.set(match.awayTeam.id, match.awayTeam);
  }
  return [...teams.values()];
}

export async function importRound(
  db: Db,
  { season, matches }: ImportRoundInput,
): Promise<ImportSummary> {
  const teams = uniqueTeams(matches);

  const stored = await db.$transaction(async (tx) => {
    const finishedBefore = new Set(
      (
        await tx.match.findMany({
          where: {
            externalId: { in: matches.map((match) => match.id) },
            status: "finished",
          },
          select: { externalId: true },
        })
      ).map((match) => match.externalId),
    );

    const teamIds = new Map<number, number>();
    for (const team of teams) {
      const data = {
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crestUrl: team.crest ?? null,
      };
      const { id } = await tx.team.upsert({
        where: { externalId: team.id },
        create: { externalId: team.id, ...data },
        update: data,
        select: { id: true },
      });
      teamIds.set(team.id, id);
    }

    const teamIdOf = (team: ApiTeam) => {
      const id = teamIds.get(team.id);
      if (id === undefined) throw new Error(`Time ${team.tla} não foi gravado`);
      return id;
    };

    const result = [];
    for (const match of matches) {
      const data = {
        season,
        round: match.matchday,
        homeTeamId: teamIdOf(match.homeTeam),
        awayTeamId: teamIdOf(match.awayTeam),
        kickoffAt: new Date(match.utcDate),
        status: toMatchStatus(match.status),
        homeScore: match.score.fullTime.home,
        awayScore: match.score.fullTime.away,
      };
      const saved = await tx.match.upsert({
        where: { externalId: match.id },
        create: { externalId: match.id, ...data },
        update: data,
        select: { id: true, status: true, homeScore: true, awayScore: true },
      });
      if (finishedBefore.has(match.id) && saved.status !== "finished") {
        await tx.prediction.updateMany({
          where: { matchId: saved.id },
          data: { points: null },
        });
      }
      result.push(saved);
    }
    return result;
  });

  // Recalcula todo jogo encerrado da rodada: é idempotente e conserta uma
  // importação anterior que caiu depois de gravar o jogo e antes de pontuar.
  let scored = 0;
  for (const match of stored) {
    if (
      match.status !== "finished" ||
      match.homeScore === null ||
      match.awayScore === null
    ) {
      continue;
    }
    await registerResult(db, {
      matchId: match.id,
      score: { home: match.homeScore, away: match.awayScore },
    });
    scored++;
  }

  return { teams: teams.length, matches: stored.length, scored };
}
