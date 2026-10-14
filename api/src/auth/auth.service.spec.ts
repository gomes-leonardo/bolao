import { hashPassword, verifyPassword } from "@bolao/core/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import {
  fakeUsersGateway,
  type FakeUsersSetup,
} from "./__fixtures__/fake-users-gateway.js";
import { AuthService } from "./auth.service.js";
import type { TokenService } from "./token.service.js";

vi.mock("@bolao/core/auth", () => ({
  DEFAULT_BCRYPT_ROUNDS: 12,
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const hash = vi.mocked(hashPassword);
const verify = vi.mocked(verifyPassword);

const leo = {
  id: 7,
  name: "Leo",
  email: "leo@carimbou.dev",
  passwordHash: "hash-do-leo",
};

function makeSut(setup: FakeUsersSetup = {}) {
  const users = fakeUsersGateway(setup);
  const tokens = mockDeep<TokenService>();
  tokens.sign.mockResolvedValue("token-assinado");
  const sut = new AuthService(
    users,
    { accessSecret: "segredo", bcryptRounds: 4 },
    tokens,
  );
  return { sut, users, tokens };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hash.mockResolvedValue("sentinel-hash");
    verify.mockResolvedValue(false);
  });

  describe("login", () => {
    it("e-mail inexistente compara contra o sentinela, uma única vez", async () => {
      const { sut } = makeSut({ credentials: null });
      await sut.onModuleInit();

      await expect(
        sut.login({ email: "ninguem@carimbou.dev", password: "senha1234" }),
      ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
      expect(verify.mock.calls).toEqual([["senha1234", "sentinel-hash"]]);
    });

    it("senha errada compara contra o hash do usuário, uma única vez", async () => {
      const { sut } = makeSut({ credentials: leo });
      await sut.onModuleInit();

      await expect(
        sut.login({ email: leo.email, password: "senha-errada" }),
      ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
      expect(verify.mock.calls).toEqual([["senha-errada", "hash-do-leo"]]);
    });

    it("devolve o mesmo erro nos dois ramos", async () => {
      const { sut } = makeSut({ credentialsQueue: [null, leo] });
      await sut.onModuleInit();

      const miss = await sut
        .login({ email: "ninguem@carimbou.dev", password: "senha1234" })
        .catch((error: unknown) => error);
      const wrong = await sut
        .login({ email: leo.email, password: "senha-errada" })
        .catch((error: unknown) => error);

      expect(miss).toMatchObject({
        status: 401,
        code: "INVALID_CREDENTIALS",
      });
      expect({
        status: (miss as { status: number }).status,
        code: (miss as { code: string }).code,
        message: (miss as Error).message,
      }).toEqual({
        status: (wrong as { status: number }).status,
        code: (wrong as { code: string }).code,
        message: (wrong as Error).message,
      });
    });

    it("entra e devolve a sessão sem vazar o hash", async () => {
      const { sut } = makeSut({ credentials: leo });
      await sut.onModuleInit();
      verify.mockResolvedValue(true);

      const session = await sut.login({
        email: leo.email,
        password: "senha1234",
      });

      expect(session).toEqual({
        user: { id: 7, name: "Leo", email: leo.email },
        accessToken: "token-assinado",
      });
      expect(session.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("register", () => {
    it("cria com a senha hasheada e devolve a sessão", async () => {
      hash.mockResolvedValue("hash-gerado");
      const { sut, users } = makeSut({
        created: { id: 9, name: "Bia", email: "bia@carimbou.dev" },
      });

      const session = await sut.register({
        name: "Bia",
        email: "bia@carimbou.dev",
        password: "senha1234",
      });

      expect(session).toEqual({
        user: { id: 9, name: "Bia", email: "bia@carimbou.dev" },
        accessToken: "token-assinado",
      });
      expect(hash.mock.calls).toEqual([["senha1234", 4]]);
      expect(users.createCalls).toEqual([
        {
          name: "Bia",
          email: "bia@carimbou.dev",
          passwordHash: "hash-gerado",
        },
      ]);
    });

    it("traduz e-mail já usado em EMAIL_TAKEN", async () => {
      // A porta devolve `null`; saber que isso veio de um P2002 em
      // users_email_key é conhecimento do adapter, e para lá.
      const { sut } = makeSut({ created: null });

      await expect(
        sut.register({
          name: "Leo",
          email: leo.email,
          password: "senha1234",
        }),
      ).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
    });

    it("propaga erros que não são de e-mail duplicado", async () => {
      const { sut } = makeSut({ createThrows: new Error("banco fora") });

      await expect(
        sut.register({
          name: "Leo",
          email: leo.email,
          password: "senha1234",
        }),
      ).rejects.toThrow("banco fora");
    });
  });
});
