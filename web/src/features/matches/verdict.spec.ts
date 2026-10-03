import type { MatchView } from "@bolao/core/contracts";
import { describe, expect, it } from "vitest";
import { buildMatch } from "../../test/factories";
import { verdictOf } from "./verdict";

const finishedWith = (points: number | null): MatchView =>
  buildMatch({
    status: "finished",
    locked: true,
    score: { home: 2, away: 1 },
    myPrediction: points === null ? null : { home: 2, away: 1, points },
  });

describe("verdictOf", () => {
  it.each([
    [3, "CRAVOU +3"],
    [1, "NA TRAVE +1"],
    [0, "PASSOU LONGE"],
    [null, "SEM PALPITE"],
  ])("jogo encerrado com %s pontos carimba %s", (points, label) => {
    expect(verdictOf(finishedWith(points))?.label).toBe(label);
  });

  it("carimba TRANCADO no jogo que já começou", () => {
    expect(verdictOf(buildMatch({ status: "live", locked: true }))).toEqual({
      label: "TRANCADO",
      tone: "pink",
    });
  });

  it("não carimba o jogo aberto para palpite", () => {
    expect(verdictOf(buildMatch())).toBeNull();
  });

  it.each([
    ["postponed", "ADIADO"],
    ["cancelled", "CANCELADO"],
  ] as const)("jogo %s carimba %s", (status, label) => {
    expect(verdictOf(buildMatch({ status, locked: true }))?.label).toBe(label);
  });
});
