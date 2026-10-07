import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { DevAuthGuard } from "./dev-auth.guard.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import type { TokenService } from "./token.service.js";

function makeSut({
  isPublic = false,
  authorization,
}: { isPublic?: boolean; authorization?: string } = {}) {
  const reflector = mockDeep<Reflector>();
  reflector.getAllAndOverride.mockReturnValue(isPublic);
  const tokens = mockDeep<TokenService>();
  const dev = mockDeep<DevAuthGuard>();
  const request = {
    header: (name: string) =>
      name.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as Request;
  const context = mockDeep<ExecutionContext>();
  context.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => ({}),
    getNext: () => () => undefined,
  } as never);
  return {
    sut: new JwtAuthGuard(reflector, tokens, dev),
    tokens,
    dev,
    request,
    context,
  };
}

describe("JwtAuthGuard", () => {
  beforeEach(() => {
    process.env["AUTH_MODE"] = "dev";
  });
  afterEach(() => {
    delete process.env["AUTH_MODE"];
  });

  it("libera rota pública sem header", async () => {
    const { sut, context } = makeSut({ isPublic: true });

    await expect(sut.canActivate(context)).resolves.toBe(true);
  });

  it("preenche request.user com o sub de um Bearer válido", async () => {
    const { sut, tokens, request, context } = makeSut({
      authorization: "Bearer token-bom",
    });
    tokens.verify.mockResolvedValue(7);

    await expect(sut.canActivate(context)).resolves.toBe(true);
    expect(tokens.verify.mock.calls).toEqual([["token-bom"]]);
    expect(request.user).toEqual({ id: 7 });
  });

  it("recusa Bearer inválido sem cair para o header dev", async () => {
    const { sut, tokens, dev, context } = makeSut({
      authorization: "Bearer token-ruim",
    });
    tokens.verify.mockRejectedValue(new Error("assinatura não bate"));

    await expect(sut.canActivate(context)).rejects.toMatchObject({
      status: 401,
    });
    expect(dev.canActivate.mock.calls).toEqual([]);
  });

  it("recusa Authorization que não é Bearer", async () => {
    const { sut, dev, context } = makeSut({ authorization: "Basic abc" });

    await expect(sut.canActivate(context)).rejects.toMatchObject({
      status: 401,
    });
    expect(dev.canActivate.mock.calls).toEqual([]);
  });

  it("sem Authorization delega ao guard de desenvolvimento", async () => {
    const { sut, dev, context } = makeSut();
    dev.canActivate.mockResolvedValue(true);

    await expect(sut.canActivate(context)).resolves.toBe(true);
    expect(dev.canActivate.mock.calls).toEqual([[context]]);
  });
});
