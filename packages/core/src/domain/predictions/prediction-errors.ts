/**
 * A bola rolou: o palpite não pode mais ser criado nem editado.
 *
 * Quem decide isso é a gravação, não uma checagem anterior a ela (ADR 0004).
 */
export class PredictionLockedError extends Error {
  readonly matchId: number;

  constructor(matchId: number) {
    super(`Palpite do jogo ${matchId} está trancado`);
    this.name = "PredictionLockedError";
    this.matchId = matchId;
  }
}

/**
 * O muro da galera foi pedido antes do apito.
 *
 * Revelar palpite com a janela aberta deixaria copiar o palpite de quem já
 * palpitou, e ainda haveria tempo de editar o próprio.
 */
export class PredictionsHiddenError extends Error {
  readonly matchId: number;

  constructor(matchId: number) {
    super(`Palpites do jogo ${matchId} ainda não foram revelados`);
    this.name = "PredictionsHiddenError";
    this.matchId = matchId;
  }
}
