import { describe, expect, it } from "vitest";
import { MatchNotFoundError } from "../matches/match-errors.ts";
import { fakePredictionsGateway } from "./__fixtures__/fake-predictions-gateway.ts";
import { placePrediction } from "./place-prediction.ts";
import { PredictionLockedError } from "./prediction-errors.ts";

const command = { userId: 7, matchId: 980011, score: { home: 2, away: 1 } };

describe("placePrediction", () => {
  it("devolve o palpite gravado quando a janela estava aberta", async () => {
    const gateway = fakePredictionsGateway({
      placed: { score: { home: 2, away: 1 }, points: null },
    });

    await expect(placePrediction(gateway, command)).resolves.toEqual({
      score: { home: 2, away: 1 },
      points: null,
    });
    expect(gateway.placeCalls).toEqual([command]);
  });

  it("não consulta a janela quando a gravação deu certo", async () => {
    const gateway = fakePredictionsGateway({
      placed: { score: { home: 0, away: 0 }, points: null },
    });

    await placePrediction(gateway, command);

    // A trava do ADR 0004 vale porque a janela é avaliada DENTRO da gravação.
    // Uma leitura a mais aqui seria inofensiva, mas uma leitura ANTES não, e
    // este caso é o que impede o desenho de escorregar para lá.
    expect(gateway.windowCalls).toEqual([]);
  });

  it("janela fechada tranca o palpite", async () => {
    const gateway = fakePredictionsGateway({ window: "closed" });

    await expect(placePrediction(gateway, command)).rejects.toBeInstanceOf(
      PredictionLockedError,
    );
  });

  it("jogo que não existe é 404, não palpite trancado", async () => {
    const gateway = fakePredictionsGateway({ window: "unknown-match" });

    await expect(placePrediction(gateway, command)).rejects.toBeInstanceOf(
      MatchNotFoundError,
    );
  });

  it("a gravação é a autoridade: janela que voltou aberta ainda tranca", async () => {
    // Corrida real: a gravação não pegou linha e, no instante seguinte, a
    // leitura diz que a janela está aberta. Confiar na leitura deixaria gravar
    // um palpite que o comando de escrita já recusou.
    const gateway = fakePredictionsGateway({ placed: null, window: "open" });

    await expect(placePrediction(gateway, command)).rejects.toBeInstanceOf(
      PredictionLockedError,
    );
  });
});
