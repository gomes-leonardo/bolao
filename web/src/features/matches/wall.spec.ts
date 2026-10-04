import type { WallEntry } from "@bolao/core/contracts";
import { describe, expect, it } from "vitest";
import { markOf, summarize } from "./wall";

const entry = (
  name: string,
  prediction: [number, number] | null,
): WallEntry => ({
  user: { id: name.length, name },
  prediction: prediction
    ? { home: prediction[0], away: prediction[1], points: null }
    : null,
});

const entries = [
  entry("Bia", [1, 1]),
  entry("Duda", [1, 1]),
  entry("Rafa", [0, 0]),
  entry("Lu", [2, 2]),
  entry("Caio", [3, 1]),
  entry("Nina", null),
];

describe("markOf", () => {
  it.each([
    ["Bia", "exact"],
    ["Rafa", "outcome"],
    ["Caio", "miss"],
    ["Nina", "none"],
  ])("%s com o jogo em 1-1 está %s", (name, mark) => {
    const found = entries.find((candidate) => candidate.user.name === name);
    expect(found && markOf(found, { home: 1, away: 1 })).toBe(mark);
  });
});

describe("summarize", () => {
  it("conta quem crava, quem está na trave e quem passa longe", () => {
    expect(summarize(entries, { home: 1, away: 1 })).toEqual({
      exact: 2,
      outcome: 2,
      miss: 1,
    });
  });

  it("sem placar ainda, ninguém pontua", () => {
    expect(summarize(entries, null)).toEqual({ exact: 0, outcome: 0, miss: 5 });
  });
});
