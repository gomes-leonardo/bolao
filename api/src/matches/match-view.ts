import type { MatchStatus } from "@bolao/core";
import type {
  MatchView,
  PredictionView,
  TeamView,
} from "@bolao/core/contracts";

export const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  tla: true,
  crestUrl: true,
} as const;

export const predictionSelect = {
  homeScore: true,
  awayScore: true,
  points: true,
} as const;

interface MatchRecord {
  id: number;
  season: number;
  round: number;
  kickoffAt: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamView;
  awayTeam: TeamView;
}

interface PredictionRecord {
  homeScore: number;
  awayScore: number;
  points: number | null;
}

export const isLocked = (
  match: { status: string; kickoffAt: Date },
  now: Date,
) => match.status !== "scheduled" || match.kickoffAt <= now;

export const toPredictionView = (
  prediction: PredictionRecord,
): PredictionView => ({
  home: prediction.homeScore,
  away: prediction.awayScore,
  points: prediction.points,
});

export function toMatchView(
  match: MatchRecord,
  myPrediction: PredictionRecord | undefined,
  now: Date,
): MatchView {
  return {
    id: match.id,
    season: match.season,
    round: match.round,
    kickoffAt: match.kickoffAt.toISOString(),
    status: match.status as MatchStatus,
    locked: isLocked(match, now),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score:
      match.homeScore === null || match.awayScore === null
        ? null
        : { home: match.homeScore, away: match.awayScore },
    myPrediction: myPrediction ? toPredictionView(myPrediction) : null,
  };
}
