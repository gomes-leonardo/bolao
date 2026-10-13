import type { MatchView } from "@bolao/core/contracts";
import type { MatchRow } from "@bolao/core/domain";

/**
 * Do jogo do domínio para o formato de fio.
 *
 * Não calcula mais nada. `locked` já vem avaliado pelo adapter, pelo mesmo
 * fragmento SQL da gravação e com o relógio do Postgres. O `isLocked` que
 * morava aqui era a terceira cópia da regra da janela, em TypeScript e com o
 * relógio da aplicação — inofensivo enquanto só exibia, e bug no dia em que
 * autorizasse algo (ADR 0008).
 *
 * `myPrediction` passa direto: o `PredictionRecord` do domínio e o
 * `PredictionView` do contrato são estruturalmente idênticos, e se o contrato
 * mudar o typecheck quebra aqui, na borda.
 */
export function toMatchView(match: MatchRow): MatchView {
  return {
    id: match.id,
    season: match.season,
    round: match.round,
    kickoffAt: match.kickoffAt.toISOString(),
    status: match.status,
    locked: match.locked,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score:
      match.homeScore === null || match.awayScore === null
        ? null
        : { home: match.homeScore, away: match.awayScore },
    myPrediction: match.myPrediction,
  };
}
