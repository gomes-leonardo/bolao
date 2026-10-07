import { afterEach, describe, expect, it } from "vitest";
import { loadAuthConfig } from "./auth-config.js";

const KEYS = ["JWT_ACCESS_SECRET", "BCRYPT_ROUNDS"] as const;
const saved = new Map(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("loadAuthConfig", () => {
  it("derruba o boot sem JWT_ACCESS_SECRET", () => {
    delete process.env["JWT_ACCESS_SECRET"];

    expect(() => loadAuthConfig()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("usa 12 rounds quando BCRYPT_ROUNDS não está definida", () => {
    process.env["JWT_ACCESS_SECRET"] = "segredo";
    delete process.env["BCRYPT_ROUNDS"];

    expect(loadAuthConfig()).toEqual({
      accessSecret: "segredo",
      bcryptRounds: 12,
    });
  });

  it("lê BCRYPT_ROUNDS quando definida", () => {
    process.env["JWT_ACCESS_SECRET"] = "segredo";
    process.env["BCRYPT_ROUNDS"] = "4";

    expect(loadAuthConfig().bcryptRounds).toBe(4);
  });

  it.each(["3", "abc", "4.5", "", "32", "256", "1000"])(
    "recusa BCRYPT_ROUNDS inválido: %s",
    (rounds) => {
      process.env["JWT_ACCESS_SECRET"] = "segredo";
      process.env["BCRYPT_ROUNDS"] = rounds;

      expect(() => loadAuthConfig()).toThrow(/BCRYPT_ROUNDS/);
    },
  );

  it("aceita o limite superior de 31", () => {
    process.env["JWT_ACCESS_SECRET"] = "segredo";
    process.env["BCRYPT_ROUNDS"] = "31";

    expect(loadAuthConfig().bcryptRounds).toBe(31);
  });
});
