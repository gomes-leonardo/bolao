import {
  MatchNotFoundError,
  NoMatchesImportedError,
  NotPoolOwnerError,
  PoolNotVisibleError,
  PredictionLockedError,
  PredictionsHiddenError,
} from "@bolao/core/domain";
import { conflict, forbidden, notFound, type AppError } from "./errors.js";

/**
 * Traduz erro de domínio em erro de API.
 *
 * O domínio não conhece status HTTP nem `ApiErrorCode` — ele é compartilhado
 * com o CLI, que não tem código de resposta (ADR 0008). Quem conhece é aqui, e
 * é a mensagem **daqui** que vai para o cliente: a do erro de domínio serve
 * para log e para o CLI.
 *
 * Um `ApiErrorCode` pode servir mais de um erro de domínio com mensagens
 * diferentes, e é por isso que cada fato tem a sua própria classe em vez de um
 * campo `reason`: `POOL_NOT_FOUND` responde tanto "o bolão não está visível"
 * quanto "não existe bolão com esse código de convite", e as duas frases são
 * diferentes. Um erro genérico perderia a frase no caminho, e nenhum teste
 * pegaria — os de integração afirmam `error.code`, não a mensagem.
 *
 * Devolve `undefined` quando o erro não é de domínio, para o filtro seguir com
 * o tratamento que já tinha.
 */
export function toAppError(error: unknown): AppError | undefined {
  if (error instanceof MatchNotFoundError)
    return notFound("MATCH_NOT_FOUND", "Jogo não encontrado.");

  if (error instanceof NoMatchesImportedError)
    return notFound(
      "NOT_FOUND",
      `Nenhum jogo de ${error.season} importado ainda. Rode o CLI.`,
    );

  if (error instanceof PoolNotVisibleError)
    return notFound("POOL_NOT_FOUND", "Bolão não encontrado.");

  if (error instanceof NotPoolOwnerError)
    return forbidden("NOT_OWNER", "Só o dono do bolão pode fazer isso.");

  if (error instanceof PredictionLockedError)
    return conflict("PREDICTION_LOCKED", "Bola rolou, palpite trancado.");

  if (error instanceof PredictionsHiddenError)
    return conflict(
      "PREDICTIONS_HIDDEN",
      "Os palpites da galera aparecem quando a bola rolar.",
    );

  return undefined;
}
