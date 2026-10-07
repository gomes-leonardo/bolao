import { describe, expect, it } from "vitest";
import {
  DEFAULT_BCRYPT_ROUNDS,
  hashPassword,
  verifyPassword,
} from "./password.ts";

describe("password", () => {
  it("guarda um hash diferente da senha, com o custo pedido", async () => {
    const passwordHash = await hashPassword("carimbou123", 5);

    expect(passwordHash).not.toBe("carimbou123");
    expect(passwordHash.split("$")[2]).toBe("05");
  });

  it("confere a senha certa e recusa a errada", async () => {
    const passwordHash = await hashPassword("carimbou123", 4);

    await expect(verifyPassword("carimbou123", passwordHash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("outra-senha", passwordHash)).resolves.toBe(
      false,
    );
  });

  it("o custo padrão é 12", () => {
    expect(DEFAULT_BCRYPT_ROUNDS).toBe(12);
  });
});
