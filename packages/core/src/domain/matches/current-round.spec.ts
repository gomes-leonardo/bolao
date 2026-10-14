import { describe, expect, it } from "vitest";
import { currentRoundOf, pendingPredictionsOf } from "./current-round.ts";
import { fakeMatchesGateway } from "./__fixtures__/fake-matches-gateway.ts";
import { NoMatchesImportedError } from "./match-errors.ts";

describe("currentRoundOf", () => {
  it("devolve a rodada do próximo jogo não encerrado", async () => {
    const gateway = fakeMatchesGateway({ firstUnfinishedRound: 27 });

    await expect(currentRoundOf(gateway, 2026)).resolves.toBe(27);
  });

  it("não procura a última rodada quando existe uma em aberto", async () => {
    const gateway = fakeMatchesGateway({ firstUnfinishedRound: 27 });

    await currentRoundOf(gateway, 2026);

    expect(gateway.lastRoundCalls).toEqual([]);
  });

  it("temporada encerrada devolve a última rodada", async () => {
    const gateway = fakeMatchesGateway({
      firstUnfinishedRound: null,
      lastRound: 38,
    });

    await expect(currentRoundOf(gateway, 2026)).resolves.toBe(38);
  });

  it("temporada sem jogo importado recusa", async () => {
    const gateway = fakeMatchesGateway({
      firstUnfinishedRound: null,
      lastRound: null,
    });

    await expect(currentRoundOf(gateway, 2026)).rejects.toBeInstanceOf(
      NoMatchesImportedError,
    );
  });

  it("a rodada zero é uma rodada, não uma ausência", async () => {
    // `if (next)` em vez de `if (next !== null)` trataria a rodada 0 como
    // ausente e cairia na última rodada da temporada.
    const gateway = fakeMatchesGateway({ firstUnfinishedRound: 0 });

    await expect(currentRoundOf(gateway, 2026)).resolves.toBe(0);
    expect(gateway.lastRoundCalls).toEqual([]);
  });
});

describe("pendingPredictionsOf", () => {
  it("conta na rodada corrente", async () => {
    const gateway = fakeMatchesGateway({
      firstUnfinishedRound: 27,
      openWithoutPrediction: 4,
    });

    await expect(pendingPredictionsOf(gateway, 7, 2026)).resolves.toBe(4);
    expect(gateway.countCalls).toEqual([
      { userId: 7, season: 2026, round: 27 },
    ]);
  });

  it("temporada sem jogo importado conta zero, sem recusar", async () => {
    // Diferente do currentRoundOf de propósito: o resumo do bolão aparece com
    // zero pendências numa temporada vazia, em vez de derrubar a listagem.
    const gateway = fakeMatchesGateway({
      firstUnfinishedRound: null,
      lastRound: null,
    });

    await expect(pendingPredictionsOf(gateway, 7, 2026)).resolves.toBe(0);
    expect(gateway.countCalls).toEqual([]);
  });

  it("temporada encerrada conta na última rodada", async () => {
    const gateway = fakeMatchesGateway({
      firstUnfinishedRound: null,
      lastRound: 38,
      openWithoutPrediction: 0,
    });

    await pendingPredictionsOf(gateway, 7, 2026);

    expect(gateway.countCalls).toEqual([
      { userId: 7, season: 2026, round: 38 },
    ]);
  });
});
