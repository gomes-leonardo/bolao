import { describe, expect, it } from "vitest";
import { scorePrediction } from "./score-prediction.ts";

describe("scorePrediction", () => {
  it.each([
    { case: "placar exato com vitória do mandante", prediction: [2, 1], result: [2, 1], points: 3 },
    { case: "placar exato com empate", prediction: [0, 0], result: [0, 0], points: 3 },
    { case: "placar exato com vitória do visitante", prediction: [1, 3], result: [1, 3], points: 3 },
    { case: "acertou o vencedor mandante", prediction: [3, 0], result: [2, 1], points: 1 },
    { case: "acertou o vencedor visitante", prediction: [0, 1], result: [1, 4], points: 1 },
    { case: "acertou o empate com outro placar", prediction: [1, 1], result: [2, 2], points: 1 },
    { case: "errou o vencedor", prediction: [0, 1], result: [2, 1], points: 0 },
    { case: "apostou empate e teve vencedor", prediction: [1, 1], result: [2, 1], points: 0 },
    { case: "apostou vencedor e deu empate", prediction: [2, 1], result: [1, 1], points: 0 },
    { case: "placar invertido", prediction: [1, 2], result: [2, 1], points: 0 },
  ])("$case: $prediction contra $result vale $points", ({ prediction, result, points }) => {
    const [predictedHome = 0, predictedAway = 0] = prediction;
    const [home = 0, away = 0] = result;

    expect(
      scorePrediction({ home: predictedHome, away: predictedAway }, { home, away }),
    ).toBe(points);
  });
});
