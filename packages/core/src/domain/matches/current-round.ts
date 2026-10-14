import { NoMatchesImportedError } from "./match-errors.ts";
import type { MatchesGateway } from "./matches-gateway.ts";

/**
 * A rodada corrente: a do próximo jogo não encerrado; se a temporada acabou, a
 * última importada. `null` quando não há jogo nenhum.
 *
 * Não é exportado do barril de propósito. As duas formas públicas abaixo
 * discordam sobre o que fazer com `null`, e essa discordância é a regra: a tela
 * da rodada precisa de uma rodada e recusa sem ela; a conta de palpites
 * pendentes de uma temporada vazia é zero, não um erro.
 */
async function findCurrentRound(
  gateway: MatchesGateway,
  season: number,
): Promise<number | null> {
  const next = await gateway.firstUnfinishedRound(season);
  if (next !== null) return next;
  return await gateway.lastRound(season);
}

/** A rodada a exibir. Recusa quando nada foi importado ainda. */
export async function currentRoundOf(
  gateway: MatchesGateway,
  season: number,
): Promise<number> {
  const round = await findCurrentRound(gateway, season);
  if (round === null) throw new NoMatchesImportedError(season);
  return round;
}

/** Quantos jogos da rodada corrente ainda esperam o palpite deste usuário. */
export async function pendingPredictionsOf(
  gateway: MatchesGateway,
  userId: number,
  season: number,
): Promise<number> {
  const round = await findCurrentRound(gateway, season);
  if (round === null) return 0;
  return await gateway.countOpenWithoutPrediction(userId, season, round);
}
