/**
 * O estado da janela de palpite de um jogo.
 *
 * `unknown-match` existe para separar "o jogo não existe" de "a janela está
 * aberta". O banco devolve ausência de linha nos dois casos, e tratá-los como a
 * mesma coisa trocaria um 404 por um 409.
 */
export type PredictionWindow = "open" | "closed" | "unknown-match";

/** O que a porta lê do jogo: trancado ou não, ou nada se o jogo não existe. */
export interface WindowReading {
  locked: boolean;
}

export function toPredictionWindow(
  reading: WindowReading | undefined,
): PredictionWindow {
  if (!reading) return "unknown-match";
  return reading.locked ? "closed" : "open";
}
