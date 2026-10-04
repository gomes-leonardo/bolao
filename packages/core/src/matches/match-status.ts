export const matchStatuses = [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
] as const;

export type MatchStatus = (typeof matchStatuses)[number];
