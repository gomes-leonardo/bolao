import { idParamSchema, joinPoolSchema } from "@bolao/core/contracts";
import { describe, expect, it } from "vitest";
import { AppError } from "./errors.js";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

const makeSut = () => new ZodValidationPipe(joinPoolSchema);

describe("ZodValidationPipe", () => {
  it("devolve o valor já transformado pelo schema", () => {
    expect(makeSut().transform({ inviteCode: " abcd2345 " })).toEqual({
      inviteCode: "ABCD2345",
    });
  });

  it("falha com VALIDATION_FAILED e o caminho de cada problema", () => {
    const error: unknown = (() => {
      try {
        return makeSut().transform({ inviteCode: "curto" });
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
      details: [
        { path: "inviteCode", message: "O código tem 8 letras ou números." },
      ],
    });
  });

  it("prefixa o caminho com o nome do parâmetro da rota", () => {
    const pipe = new ZodValidationPipe(idParamSchema);

    expect(() => pipe.transform("abc", { type: "param", data: "id" })).toThrow(
      expect.objectContaining({
        details: [{ path: "id", message: "Id inválido." }],
      }),
    );
  });
});
