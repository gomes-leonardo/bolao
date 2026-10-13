import { MatchNotFoundError } from "../matches/match-errors.ts";
import { PredictionLockedError } from "./prediction-errors.ts";
import type {
  PlacePredictionCommand,
  PlacedPrediction,
  PredictionsGateway,
} from "./predictions-gateway.ts";

/**
 * Grava o palpite, ou diz por que não deu.
 *
 * A ordem importa: a gravação vem primeiro e é a autoridade. A janela só é
 * consultada depois, e só para escolher entre "jogo não existe" e "palpite
 * trancado" — nunca para decidir se pode gravar. Inverter isso reabriria a
 * janela que o ADR 0004 fechou.
 */
export async function placePrediction(
  gateway: PredictionsGateway,
  command: PlacePredictionCommand,
): Promise<PlacedPrediction> {
  const placed = await gateway.placeWhileOpen(command);
  if (placed) return placed;

  const window = await gateway.windowOf(command.matchId);
  if (window === "unknown-match") throw new MatchNotFoundError(command.matchId);
  throw new PredictionLockedError(command.matchId);
}
