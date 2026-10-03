import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { ApiError, ApiErrorCode } from "@bolao/core/contracts";
import type { Response } from "express";
import { AppError } from "./errors.js";

export interface ErrorResponse {
  status: number;
  body: ApiError;
}

const codeByStatus: Record<number, ApiErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  404: "NOT_FOUND",
};

export function toErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof AppError) {
    const error: ApiError["error"] = {
      code: exception.code,
      message: exception.message,
    };
    if (exception.details) error.details = exception.details;
    return { status: exception.status, body: { error } };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      body: {
        error: {
          code: codeByStatus[status] ?? "INTERNAL_ERROR",
          message: exception.message,
        },
      },
    };
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
