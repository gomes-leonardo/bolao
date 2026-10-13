import { MatchNotFoundError } from "../matches/match-errors.ts";
import { PredictionsHiddenError } from "./prediction-errors.ts";
import type { PredictionsGateway } from "./predictions-gateway.ts";

/**
 * Deixa o muro da galera aparecer, ou recusa.
 *
 * Usa a mesma leitura de janela da gravação, pelo mesmo predicado e pelo mesmo
 * relógio — o do Postgres. Se o muro usasse o relógio da aplicação e ele
 * adiantasse, daria para espiar os palpites dos outros e ainda ter tempo de
 * editar o próprio (ADR 0004).
 */
export async function requirePredictionsVisible(
  gateway: PredictionsGateway,
  matchId: number,
): Promise<void> {
  const window = await gateway.windowOf(matchId);
  if (window === "unknown-match") throw new MatchNotFoundError(matchId);
  if (window === "open") throw new PredictionsHiddenError(matchId);
}
