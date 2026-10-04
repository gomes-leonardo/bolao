import { describe, expect, it } from "vitest";
import { isTabActive } from "./BottomNav";

describe("isTabActive", () => {
  it.each([
    ["/rodada", "/rodada", true],
    ["/ranking", "/boloes/3/ranking", true],
    ["/boloes", "/boloes/3/ranking", false],
    ["/boloes", "/boloes/3/jogos/9", true],
    ["/boloes", "/boloes/entrar", true],
    ["/ranking", "/boloes", false],
  ])("aba %s em %s: %s", (tab, pathname, active) => {
    expect(isTabActive(tab, pathname)).toBe(active);
  });
});
