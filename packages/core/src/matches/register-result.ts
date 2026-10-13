import type { Db } from "../db.ts";
import { MatchNotFoundError } from "../domain/matches/match-errors.ts";
import { Prisma } from "../prisma.ts";
import { scorePrediction, type Score } from "../scoring/score-prediction.ts";

/** O erro mora no domínio (ADR 0008); segue exportado aqui por compatibilidade. */
export { MatchNotFoundError };

export interface RegisterResultInput {
  matchId: number;
  score: Score;
}

const isRecordNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";

export async function registerResult(
  db: Db,
  { matchId, score }: RegisterResultInput,
): Promise<{ scored: number }> {
  try {
    return await db.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "finished",
          homeScore: score.home,
          awayScore: score.away,
        },
      });

      const predictions = await tx.prediction.findMany({
        where: { matchId },
        select: { id: true, homeScore: true, awayScore: true },
      });
      const byPoints = Map.groupBy(predictions, (prediction) =>
        scorePrediction(
          { home: prediction.homeScore, away: prediction.awayScore },
          score,
        ),
      );
      for (const [points, group] of byPoints) {
        await tx.prediction.updateMany({
          where: { id: { in: group.map((prediction) => prediction.id) } },
          data: { points },
        });
      }

      return { scored: predictions.length };
    });
  } catch (error) {
    if (isRecordNotFound(error)) throw new MatchNotFoundError(matchId);
    throw error;
  }
}
