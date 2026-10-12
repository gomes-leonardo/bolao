import type { Score } from "../../scoring/score-prediction.ts";
import type { PredictionWindow } from "./prediction-window.ts";

export interface PlacePredictionCommand {
  userId: number;
  matchId: number;
  score: Score;
}

export interface PlacedPrediction {
  score: Score;
  points: number | null;
}

/**
 * A porta do palpite. Quem implementa fala com o banco; quem consome não sabe
 * que banco existe.
 *
 * As duas operações não são simétricas, e é de propósito: `placeWhileOpen`
 * grava e `windowOf` só lê. A separação em `findMatch()` + `savePrediction()`,
 * que seria o desenho óbvio, é exatamente o que o ADR 0004 proíbe — deixaria
 * uma janela entre checar o horário e gravar o palpite.
 */
export interface PredictionsGateway {
  /**
   * Grava o palpite num comando indivisível: a janela é avaliada dentro da
   * mesma operação da escrita (ADR 0004).
   *
   * Devolve `null` quando nada foi gravado, sem dizer por quê — classificar o
   * motivo é decisão do caso de uso, não da porta.
   */
  placeWhileOpen(
    command: PlacePredictionCommand,
  ): Promise<PlacedPrediction | null>;

  /**
   * Lê o estado da janela pelo mesmo predicado e pelo mesmo relógio da escrita,
   * que é o do Postgres.
   *
   * Nunca autoriza uma gravação: só classifica uma que já falhou e decide se o
   * muro da galera pode aparecer.
   */
  windowOf(matchId: number): Promise<PredictionWindow>;
}
