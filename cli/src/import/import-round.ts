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

  const previous = await db.match.findMany({
    where: { externalId: { in: matches.map((match) => match.id) } },
    select: {
      externalId: true,
      status: true,
      homeScore: true,
      awayScore: true,
    },
  });
  const previousByExternalId = new Map(
    previous.map((match) => [match.externalId, match]),
  );

  const stored = await db.$transaction(async (tx) => {
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
      result.push(
        await tx.match.upsert({
          where: { externalId: match.id },
          create: { externalId: match.id, ...data },
          update: data,
          select: {
            id: true,
            externalId: true,
            status: true,
            homeScore: true,
            awayScore: true,
          },
        }),
      );
    }
    return result;
  });

  let scored = 0;
  for (const match of stored) {
    if (
      match.status !== "finished" ||
      match.homeScore === null ||
      match.awayScore === null
    ) {
      continue;
    }
    const before = previousByExternalId.get(match.externalId);
    const unchanged =
      before?.status === "finished" &&
      before.homeScore === match.homeScore &&
      before.awayScore === match.awayScore;
    if (unchanged) continue;

    await registerResult(db, {
      matchId: match.id,
      score: { home: match.homeScore, away: match.awayScore },
    });
    scored++;
  }

  return { teams: teams.length, matches: stored.length, scored };
}
