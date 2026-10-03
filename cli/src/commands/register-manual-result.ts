import {
  MatchNotFoundError,
  registerResult,
  type Db,
  type Score,
} from "@bolao/core";

export class MatchNotStartedError extends Error {
  constructor(externalId: number, kickoffAt: Date) {
    super(
      `Jogo ${externalId} ainda não começou (início em ${kickoffAt.toISOString()}).`,
    );
    this.name = "MatchNotStartedError";
  }
}

export interface ManualResultInput {
  externalId: number;
  score: Score;
  now?: Date;
}

export async function registerManualResult(
  db: Db,
  { externalId, score, now = new Date() }: ManualResultInput,
): Promise<{ scored: number }> {
  const match = await db.match.findUnique({
    where: { externalId },
    select: { id: true, kickoffAt: true },
  });
  if (!match) throw new MatchNotFoundError(externalId);
  if (match.kickoffAt > now)
    throw new MatchNotStartedError(externalId, match.kickoffAt);

  return registerResult(db, { matchId: match.id, score });
}
