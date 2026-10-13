import {
  AlreadyMemberError,
  CannotRemoveOtherMemberError,
  InviteCodeNotFoundError,
  MatchNotFoundError,
  NoMatchesImportedError,
  NotPoolOwnerError,
  OwnerCannotLeaveError,
  PoolMemberNotFoundError,
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
 * Um `ApiErrorCode` serve mais de um erro de domínio com mensagens diferentes,
 * e é por isso que cada fato tem a sua própria classe em vez de um campo
 * `reason`. Dois pares fazem isso de propósito:
 *
 * - `POOL_NOT_FOUND` responde "o bolão não está visível" e "não existe bolão
 *   com esse código de convite". O primeiro conflui não-membro com inexistente
 *   para não revelar existência; o segundo diz que foi o código, porque quem
 *   digitou um código errado merece saber.
 * - `NOT_OWNER` responde "só o dono faz isso" e "só o dono remove outros".
 *
 * Um erro genérico perderia a frase no caminho, e nenhum teste pegaria: os de
 * integração afirmam `error.code`, não a mensagem.
 *
 * `InviteCodeExhaustedError` **não** está aqui, e a omissão é deliberada — está
 * escrito no próprio erro por quê. Sem tradução ele cai em 500 com log, que é
 * onde um problema nosso tem que aparecer.
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

  if (error instanceof InviteCodeNotFoundError)
    return notFound("POOL_NOT_FOUND", "Nenhum bolão com esse código.");

  if (error instanceof NotPoolOwnerError)
    return forbidden("NOT_OWNER", "Só o dono do bolão pode fazer isso.");

  if (error instanceof CannotRemoveOtherMemberError)
    return forbidden(
      "NOT_OWNER",
      "Só o dono do bolão pode remover outros membros.",
    );

  if (error instanceof OwnerCannotLeaveError)
    return conflict(
      "OWNER_CANNOT_LEAVE",
      "O dono não sai do próprio bolão. Se quiser acabar com ele, apaga o bolão.",
    );

  if (error instanceof PoolMemberNotFoundError)
    return notFound("MEMBER_NOT_FOUND", "Essa pessoa não está no bolão.");

  if (error instanceof AlreadyMemberError)
    return conflict("ALREADY_MEMBER", "Tu já tá nesse bolão.");

  if (error instanceof PredictionLockedError)
    return conflict("PREDICTION_LOCKED", "Bola rolou, palpite trancado.");

  if (error instanceof PredictionsHiddenError)
    return conflict(
      "PREDICTIONS_HIDDEN",
      "Os palpites da galera aparecem quando a bola rolar.",
    );

  return undefined;
}
