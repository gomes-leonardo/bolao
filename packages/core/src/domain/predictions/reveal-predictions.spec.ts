import { describe, expect, it } from "vitest";
import { MatchNotFoundError } from "../matches/match-errors.ts";
import { fakePredictionsGateway } from "./__fixtures__/fake-predictions-gateway.ts";
import { PredictionsHiddenError } from "./prediction-errors.ts";
import { requirePredictionsVisible } from "./reveal-predictions.ts";

const matchId = 980011;

describe("requirePredictionsVisible", () => {
  it("esconde o muro enquanto a janela está aberta", async () => {
    const gateway = fakePredictionsGateway({ window: "open" });

    await expect(
      requirePredictionsVisible(gateway, matchId),
    ).rejects.toBeInstanceOf(PredictionsHiddenError);
  });

  it("libera o muro depois do apito", async () => {
    const gateway = fakePredictionsGateway({ window: "closed" });

    await expect(
      requirePredictionsVisible(gateway, matchId),
    ).resolves.toBeUndefined();
    expect(gateway.windowCalls).toEqual([matchId]);
  });

  it("jogo que não existe é 404, não muro escondido", async () => {
    const gateway = fakePredictionsGateway({ window: "unknown-match" });

    await expect(
      requirePredictionsVisible(gateway, matchId),
    ).rejects.toBeInstanceOf(MatchNotFoundError);
  });
});
