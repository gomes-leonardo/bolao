import { describe, expect, it } from "vitest";
import { generateInviteCode } from "./invite-code.js";

describe("generateInviteCode", () => {
  it("gera 8 caracteres sem letras ou números que se confundem", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(
        /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/,
      );
    }
  });

  it("usa a fonte de aleatoriedade recebida", () => {
    expect(generateInviteCode(() => 0)).toBe("AAAAAAAA");
    expect(generateInviteCode((max) => max - 1)).toBe("99999999");
  });
});
