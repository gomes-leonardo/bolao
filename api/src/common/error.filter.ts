import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { ApiError } from "@bolao/core/contracts";
import type { Response } from "express";
import { AppError } from "./errors.js";

export interface ErrorResponse {
  status: number;
  body: ApiError;
}

const clientErrors: Record<number, ApiError["error"]> = {
  400: { code: "VALIDATION_FAILED", message: "JSON inválido." },
  401: { code: "UNAUTHENTICATED", message: "Faz login pra continuar." },
  404: { code: "NOT_FOUND", message: "Rota não encontrada." },
  413: {
    code: "PAYLOAD_TOO_LARGE",
    message: "Corpo da requisição grande demais.",
  },
};

/** Status de erros do Nest e dos erros "expostos" do body-parser (JSON grande, por exemplo). */
function clientStatusOf(exception: unknown): number | undefined {
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : typeof exception === "object" &&
          exception !== null &&
          "expose" in exception &&
          exception.expose === true &&
          "status" in exception &&
          typeof exception.status === "number"
        ? exception.status
        : undefined;
  return status !== undefined && status >= 400 && status < 500
    ? status
    : undefined;
}

export function toErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof AppError) {
    const error: ApiError["error"] = {
      code: exception.code,
      message: exception.message,
    };
    if (exception.details) error.details = exception.details;
    return { status: exception.status, body: { error } };
  }
  const status = clientStatusOf(exception);
  if (status !== undefined) {
    const error = clientErrors[status] ?? {
      code: "BAD_REQUEST",
      message: "Requisição inválida.",
    };
    return { status, body: { error } };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Deu ruim do nosso lado. Tenta de novo.",
      },
    },
  };
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : exception,
      );
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}
