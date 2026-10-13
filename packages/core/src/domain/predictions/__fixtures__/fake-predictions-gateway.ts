import type { PredictionWindow } from "../prediction-window.ts";
import type {
  PlacePredictionCommand,
  PlacedPrediction,
  PredictionsGateway,
} from "../predictions-gateway.ts";

/**
 * Fake da porta, escrito à mão.
 *
 * Guarda as chamadas em vez de só devolver valores: o caso de uso promete não
 * consultar a janela quando a gravação deu certo, e isso só se prova olhando o
 * que foi chamado.
 */
export interface FakePredictionsGateway extends PredictionsGateway {
  readonly placeCalls: PlacePredictionCommand[];
  readonly windowCalls: number[];
}

export interface FakeGatewaySetup {
  /** O que a gravação devolve. Ausente ou `null` significa que nada foi gravado. */
  placed?: PlacedPrediction | null;
  /** O que a leitura da janela devolve, se chegar a ser chamada. */
  window?: PredictionWindow;
}

export function fakePredictionsGateway(
  setup: FakeGatewaySetup = {},
): FakePredictionsGateway {
  const placeCalls: PlacePredictionCommand[] = [];
  const windowCalls: number[] = [];

  return {
    placeCalls,
    windowCalls,
    placeWhileOpen(command) {
      placeCalls.push(command);
      return Promise.resolve(setup.placed ?? null);
    },
    windowOf(matchId) {
      windowCalls.push(matchId);
      return Promise.resolve(setup.window ?? "unknown-match");
    },
  };
}
