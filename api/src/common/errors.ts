import type { ApiError, ApiErrorCode } from "@bolao/core/contracts";

type ErrorDetails = NonNullable<ApiError["error"]["details"]>;

export class AppError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: ErrorDetails | undefined;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationFailed = (details: ErrorDetails) =>
  new AppError(
    400,
    "VALIDATION_FAILED",
    "Tem coisa errada no que foi enviado.",
    details,
  );

export const unauthenticated = (message = "Faz login pra continuar.") =>
  new AppError(401, "UNAUTHENTICATED", message);

export const forbidden = (code: ApiErrorCode, message: string) =>
  new AppError(403, code, message);

export const notFound = (code: ApiErrorCode, message: string) =>
  new AppError(404, code, message);

export const conflict = (code: ApiErrorCode, message: string) =>
  new AppError(409, code, message);
