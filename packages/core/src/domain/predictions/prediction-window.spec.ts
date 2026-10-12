import { describe, expect, it } from "vitest";
import { toPredictionWindow } from "./prediction-window.ts";

describe("toPredictionWindow", () => {
  it("sem linha lida é jogo que não existe, não janela aberta", () => {
    expect(toPredictionWindow(undefined)).toBe("unknown-match");
  });

  it("linha trancada fecha a janela", () => {
    expect(toPredictionWindow({ locked: true })).toBe("closed");
  });

  it("linha destrancada abre a janela", () => {
    expect(toPredictionWindow({ locked: false })).toBe("open");
  });
});
