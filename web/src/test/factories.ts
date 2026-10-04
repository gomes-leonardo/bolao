import type { MatchView, PoolSummary, TeamView } from "@bolao/core/contracts";

const team = (tla: string, name: string): TeamView => ({
  id: tla.charCodeAt(0),
  name,
  shortName: name,
  tla,
  crestUrl: null,
});

export function buildMatch(overrides: Partial<MatchView> = {}): MatchView {
  return {
    id: 1,
    season: 2026,
    round: 28,
    kickoffAt: "2026-10-17T21:30:00.000Z",
    status: "scheduled",
    locked: false,
    homeTeam: team("COR", "Corinthians"),
    awayTeam: team("SAO", "São Paulo"),
    score: null,
    myPrediction: null,
    ...overrides,
  };
}

export function buildPool(overrides: Partial<PoolSummary> = {}): PoolSummary {
  return {
    id: 1,
    name: "Resenha do Trampo",
    inviteCode: "RSNH2026",
    season: 2026,
    isOwner: true,
    memberCount: 8,
    myPosition: 3,
    myPoints: 41,
    pendingPredictions: 2,
    ...overrides,
  };
}
