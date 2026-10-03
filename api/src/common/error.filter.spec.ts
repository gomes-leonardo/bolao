import {
  type ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { ErrorFilter, toErrorResponse } from "./error.filter.js";
import { conflict, validationFailed } from "./errors.js";

describe("toErrorResponse", () => {
  it("usa status, código e mensagem do AppError", () => {
    expect(toErrorResponse(conflict("PREDICTION_LOCKED", "Trancado."))).toEqual(
      {
        status: 409,
        body: { error: { code: "PREDICTION_LOCKED", message: "Trancado." } },
      },
    );
  });

  it("inclui os detalhes de validação", () => {
    const { body } = toErrorResponse(
      validationFailed([{ path: "home", message: "Inválido." }]),
    );

    expect(body.error.details).toEqual([
      { path: "home", message: "Inválido." },
    ]);
  });

  it.each([
    [new NotFoundException("Cannot GET /api/nada"), 404, "NOT_FOUND"],
    [new BadRequestException("Unexpected token"), 400, "VALIDATION_FAILED"],
  ])("traduz exceções do Nest: %s", (exception, status, code) => {
    const response = toErrorResponse(exception);

    expect(response.status).toBe(status);
    expect(response.body.error.code).toBe(code);
  });

  it("não vaza detalhes de erro inesperado", () => {
    expect(
      toErrorResponse(new Error("connection refused at 10.0.0.3")),
    ).toEqual({
      status: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Deu ruim do nosso lado. Tenta de novo.",
        },
      },
    });
  });
});

describe("ErrorFilter", () => {
  it("escreve a resposta padronizada", () => {
    const host = mockDeep<ArgumentsHost>();
    const response = mockDeep<Response>();
    response.status.mockReturnValue(response);
    host.switchToHttp.mockReturnValue({
      getResponse: () => response,
      getRequest: () => ({}),
      getNext: () => () => undefined,
    } as never);

    new ErrorFilter().catch(conflict("ALREADY_MEMBER", "Já tá."), host);

    expect(response.status.mock.calls).toEqual([[409]]);
    expect(response.json.mock.calls).toEqual([
      [
        {
          error: { code: "ALREADY_MEMBER", message: "Já tá." },
        },
      ],
    ]);
  });
});
