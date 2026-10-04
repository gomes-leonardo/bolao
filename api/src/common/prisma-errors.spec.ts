import { Prisma } from "@bolao/core/prisma";
import { describe, expect, it } from "vitest";
import { violatedUniqueConstraint } from "./prisma-errors.js";

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("falhou", {
    code,
    clientVersion: "7.10.0",
    ...(meta ? { meta } : {}),
  });

describe("violatedUniqueConstraint", () => {
  it("lê o nome da constraint no formato do adapter-pg", () => {
    const error = prismaError("P2002", {
      driverAdapterError: {
        cause: { constraint: { index: "pools_invite_code_key" } },
      },
    });

    expect(violatedUniqueConstraint(error)).toBe("pools_invite_code_key");
  });

  it("ignora outros códigos de erro do Prisma", () => {
    expect(violatedUniqueConstraint(prismaError("P2025"))).toBeUndefined();
  });

  it("ignora erros que não são do Prisma", () => {
    expect(
      violatedUniqueConstraint(new Error("pools_invite_code_key")),
    ).toBeUndefined();
  });
});
