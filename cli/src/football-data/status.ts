import type { MatchStatus } from "@bolao/core";

export const apiStatuses = [
  "SCHEDULED",
  "TIMED",
  "IN_PLAY",
  "PAUSED",
  "SUSPENDED",
  "FINISHED",
  "AWARDED",
  "POSTPONED",
  "CANCELLED",
] as const;

export type ApiStatus = (typeof apiStatuses)[number];

// SUSPENDED: jogo interrompido segue "ao vivo" e não pontua até ter resultado final.
// AWARDED: W.O. pontua pelo placar oficial, como um jogo encerrado.
const statusMap = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  IN_PLAY: "live",
  PAUSED: "live",
  SUSPENDED: "live",
  FINISHED: "finished",
  AWARDED: "finished",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const satisfies Record<ApiStatus, MatchStatus>;

export const toMatchStatus = (status: ApiStatus): MatchStatus =>
  statusMap[status];
