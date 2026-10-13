/**
 * Erro de domínio: o jogo não existe.
 *
 * Mora aqui, e não na borda HTTP, porque o CLI também o lança pelo
 * `registerResult` — e o CLI não tem código de resposta. Quem traduz para 404 é
 * a borda, em `api/src/common/domain-errors.ts` (ADR 0008).
 *
 * O campo é atribuído no corpo do construtor: `erasableSyntaxOnly` está ligado
 * no `packages/core/tsconfig.json` e proíbe parameter properties.
 */
export class MatchNotFoundError extends Error {
  readonly matchId: number;

  constructor(matchId: number) {
    super(`Jogo ${matchId} não encontrado`);
    this.name = "MatchNotFoundError";
    this.matchId = matchId;
  }
}

/**
 * A temporada não tem jogo nenhum importado.
 *
 * Distinto do `MatchNotFoundError`: ali um jogo específico não existe; aqui o
 * banco está vazio para a temporada e a ação do usuário é rodar o CLI. A borda
 * traduz os dois para 404, com mensagens diferentes.
 */
export class NoMatchesImportedError extends Error {
  readonly season: number;

  constructor(season: number) {
    super(`Nenhum jogo de ${season} importado`);
    this.name = "NoMatchesImportedError";
    this.season = season;
  }
}
