import {
  MatchNotFoundError,
  PredictionLockedError,
  PredictionsHiddenError,
} from "@bolao/core/domain";
import { conflict, notFound, type AppError } from "./errors.js";

/**
 * Traduz erro de domínio em erro de API.
 *
 * O domínio não conhece status HTTP nem `ApiErrorCode` — ele é compartilhado
 * com o CLI, que não tem código de resposta (ADR 0008). Quem conhece é aqui, e
 * é a mensagem **daqui** que vai para o cliente: a do erro de domínio serve
 * para log e para o CLI.
 *
 * Devolve `undefined` quando o erro não é de domínio, para o filtro seguir com
 * o tratamento que já tinha.
 */
export function toAppError(error: unknown): AppError | undefined {
  if (error instanceof MatchNotFoundError)
    return notFound("MATCH_NOT_FOUND", "Jogo não encontrado.");

  if (error instanceof PredictionLockedError)
    return conflict("PREDICTION_LOCKED", "Bola rolou, palpite trancado.");

  if (error instanceof PredictionsHiddenError)
    return conflict(
      "PREDICTIONS_HIDDEN",
      "Os palpites da galera aparecem quando a bola rolar.",
    );

  return undefined;
}
