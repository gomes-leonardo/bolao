import { describe, expect, it } from "vitest";
import { formatKickoff, formatTimeLeft } from "./format";

describe("formatKickoff", () => {
  it("mostra dia da semana e hora de Brasília", () => {
    expect(formatKickoff("2026-10-17T21:30:00Z")).toBe("Sáb · 18:30");
    expect(formatKickoff("2026-10-19T00:30:00Z")).toBe("Dom · 21:30");
  });
});

describe("formatTimeLeft", () => {
  const minutes = (value: number) => value * 60_000;

  it.each([
    [minutes(60 * 24 * 3 + 5), "FECHA EM 3 DIAS"],
    [minutes(60 * 24 + 30), "FECHA EM 24H30"],
    [minutes(134), "FECHA EM 2H14"],
    [minutes(60), "FECHA EM 1H00"],
    [minutes(9), "FECHA EM 9MIN"],
    [20_000, "FECHA EM 1MIN"],
    [0, "FECHANDO"],
  ])("%i ms vira %s", (milliseconds, label) => {
    expect(formatTimeLeft(milliseconds)).toBe(label);
  });
});
