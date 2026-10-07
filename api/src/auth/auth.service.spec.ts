import type { Db } from "@bolao/core";
import { hashPassword, verifyPassword } from "@bolao/core/auth";
import { Prisma } from "@bolao/core/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { AuthService } from "./auth.service.js";
import type { TokenService } from "./token.service.js";

vi.mock("@bolao/core/auth", () => ({
  DEFAULT_BCRYPT_ROUNDS: 12,
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const hash = vi.mocked(hashPassword);
const verify = vi.mocked(verifyPassword);

const emailTakenError = () =>
  new Prisma.PrismaClientKnownRequestError("falhou", {
    code: "P2002",
    clientVersion: "7.10.0",
    meta: {
      driverAdapterError: {
        cause: { constraint: { index: "users_email_key" } },
      },
    },
  });

const leo = {
  id: 7,
  name: "Leo",
  email: "leo@carimbou.dev",
  passwordHash: "hash-do-leo",
};

function makeSut() {
  const db = mockDeep<Db>();
  const tokens = mockDeep<TokenService>();
  tokens.sign.mockResolvedValue("token-assinado");
  const sut = new AuthService(
    db,
    { accessSecret: "segredo", bcryptRounds: 4 },
    tokens,
  );
  return { sut, db, tokens };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hash.mockResolvedValue("sentinel-hash");
    verify.mockResolvedValue(false);
  });

  describe("login", () => {
    it("e-mail inexistente compara contra o sentinela, uma única vez", async () => {
      const { sut, db } = makeSut();
      await sut.onModuleInit();
      db.user.findUnique.mockResolvedValue(null);

      await expect(
        sut.login({ email: "ninguem@carimbou.dev", password: "senha1234" }),
      ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
      expect(verify.mock.calls).toEqual([["senha1234", "sentinel-hash"]]);
    });

    it("senha errada compara contra o hash do usuário, uma única vez", async () => {
      const { sut, db } = makeSut();
      await sut.onModuleInit();
      db.user.findUnique.mockResolvedValue(leo as never);

      await expect(
        sut.login({ email: leo.email, password: "senha-errada" }),
      ).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
      expect(verify.mock.calls).toEqual([["senha-errada", "hash-do-leo"]]);
    });

    it("devolve o mesmo erro nos dois ramos", async () => {
      const { sut, db } = makeSut();
      await sut.onModuleInit();
      db.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(leo as never);

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
      const { sut, db } = makeSut();
      await sut.onModuleInit();
      db.user.findUnique.mockResolvedValue(leo as never);
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
      const { sut, db } = makeSut();
      hash.mockResolvedValue("hash-gerado");
      db.user.create.mockResolvedValue({
        id: 9,
        name: "Bia",
        email: "bia@carimbou.dev",
      } as never);

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
      expect(db.user.create.mock.calls[0]?.[0].data).toMatchObject({
        name: "Bia",
        email: "bia@carimbou.dev",
        passwordHash: "hash-gerado",
      });
    });

    it("traduz a violação de e-mail único em EMAIL_TAKEN", async () => {
      const { sut, db } = makeSut();
      db.user.create.mockRejectedValue(emailTakenError());

      await expect(
        sut.register({
          name: "Leo",
          email: leo.email,
          password: "senha1234",
        }),
      ).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
    });

    it("propaga erros que não são de e-mail duplicado", async () => {
      const { sut, db } = makeSut();
      db.user.create.mockRejectedValue(new Error("banco fora"));

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
