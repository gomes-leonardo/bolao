import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { fakeUsersGateway } from "./__fixtures__/fake-users-gateway.js";
import { DevAuthGuard } from "./dev-auth.guard.js";

function makeSut({
  isPublic = false,
  header,
  exists = false,
}: { isPublic?: boolean; header?: string; exists?: boolean } = {}) {
  const reflector = mockDeep<Reflector>();
  reflector.getAllAndOverride.mockReturnValue(isPublic);
  const users = fakeUsersGateway({ exists });
  const request = { header: () => header } as unknown as Request;
  const context = mockDeep<ExecutionContext>();
  context.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => ({}),
    getNext: () => () => undefined,
  } as never);
  return { sut: new DevAuthGuard(reflector, users), users, request, context };
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
      const { sut, users, context } = makeSut(
        header === undefined ? {} : { header },
      );

      await expect(sut.canActivate(context)).rejects.toMatchObject({
        status: 401,
      });
      // Header inválido nem chega ao banco.
      expect(users.existsCalls).toEqual([]);
    },
  );

  it("recusa usuário que não existe", async () => {
    const { sut, context } = makeSut({ header: "42", exists: false });

    await expect(sut.canActivate(context)).rejects.toMatchObject({
      status: 401,
      message: "Usuário 42 não existe.",
    });
  });

  it("preenche request.user com o usuário do header", async () => {
    const { sut, users, request, context } = makeSut({
      header: "7",
      exists: true,
    });

    await expect(sut.canActivate(context)).resolves.toBe(true);
    expect(users.existsCalls).toEqual([7]);
    expect(request.user).toEqual({ id: 7 });
  });
});
