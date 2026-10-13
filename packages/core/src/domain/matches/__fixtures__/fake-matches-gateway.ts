import type { MatchRow, MatchesGateway, WallRow } from "../matches-gateway.ts";

/**
 * Fake da porta de jogos, escrito à mão.
 *
 * Guarda as chamadas porque a regra da rodada corrente é uma promessa sobre
 * ordem e sobre o que **não** é consultado: com uma rodada em aberto, a última
 * rodada não deve ser buscada.
 */
export interface FakeMatchesGateway extends MatchesGateway {
  readonly firstUnfinishedCalls: number[];
  readonly lastRoundCalls: number[];
  readonly countCalls: { userId: number; season: number; round: number }[];
}

export interface FakeMatchesSetup {
  firstUnfinishedRound?: number | null;
  lastRound?: number | null;
  openWithoutPrediction?: number;
  matches?: MatchRow[];
  match?: MatchRow | null;
  wall?: WallRow[];
}

export function fakeMatchesGateway(
  setup: FakeMatchesSetup = {},
): FakeMatchesGateway {
  const firstUnfinishedCalls: number[] = [];
  const lastRoundCalls: number[] = [];
  const countCalls: { userId: number; season: number; round: number }[] = [];

  return {
    firstUnfinishedCalls,
    lastRoundCalls,
    countCalls,
    firstUnfinishedRound(season) {
      firstUnfinishedCalls.push(season);
      return Promise.resolve(setup.firstUnfinishedRound ?? null);
    },
    lastRound(season) {
      lastRoundCalls.push(season);
      return Promise.resolve(setup.lastRound ?? null);
    },
    countOpenWithoutPrediction(userId, season, round) {
      countCalls.push({ userId, season, round });
      return Promise.resolve(setup.openWithoutPrediction ?? 0);
    },
    matchesOfRound() {
      return Promise.resolve(setup.matches ?? []);
    },
    matchById() {
      return Promise.resolve(setup.match ?? null);
    },
    wallEntriesOf() {
      return Promise.resolve(setup.wall ?? []);
    },
  };
}
