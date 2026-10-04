import type { Db } from "@bolao/core";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { DevAuthGuard } from "./dev-auth.guard.js";

function makeSut({
  isPublic = false,
  header,
}: { isPublic?: boolean; header?: string } = {}) {
  const reflector = mockDeep<Reflector>();
  reflector.getAllAndOverride.mockReturnValue(isPublic);
  const db = mockDeep<Db>();
  const request = { header: () => header } as unknown as Request;
  const context = mockDeep<ExecutionContext>();
  context.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => ({}),
    getNext: () => () => undefined,
  } as never);
  return { sut: new DevAuthGuard(reflector, db), db, request, context };
}

describe("DevAuthGuard", () => {
  beforeEach(() => {
    process.env["AUTH_MODE"] = "dev";
  });
  afterEach(() => {
    delete process.env["AUTH_MODE"];
  });

  it("deixa passar rota pública sem header", async () => {
    const { sut, context } = makeSut({ isPublic: true });

    await expect(sut.canActivate(context)).resolves.toBe(true);
  });

  it("recusa tudo quando AUTH_MODE não é dev", async () => {
    delete process.env["AUTH_MODE"];
    const { sut, context } = makeSut({ header: "1" });

    const result = sut.canActivate(context);

    await expect(result).rejects.toMatchObject({ status: 401 });
    await expect(result).rejects.toThrow(/AUTH_MODE=dev/);
  });

  it.each([undefined, "", "abc", "0", "-3", "1.5", "99999999999"])(
    "recusa header inválido: %s",
    async (header) => {
      const { sut, context } = makeSut(header === undefined ? {} : { header });

      await expect(sut.canActivate(context)).rejects.toMatchObject({
        status: 401,
      });
    },
  );

  it("recusa usuário que não existe", async () => {
    const { sut, db, context } = makeSut({ header: "42" });
    db.user.findUnique.mockResolvedValue(null);

    await expect(sut.canActivate(context)).rejects.toMatchObject({
      status: 401,
      message: "Usuário 42 não existe.",
    });
  });

  it("preenche request.user com o usuário do header", async () => {
    const { sut, db, request, context } = makeSut({ header: "7" });
    db.user.findUnique.mockResolvedValue({ id: 7 } as never);

    await expect(sut.canActivate(context)).resolves.toBe(true);
    expect(db.user.findUnique.mock.calls).toEqual([
      [{ where: { id: 7 }, select: { id: true } }],
    ]);
    expect(request.user).toEqual({ id: 7 });
  });
});
