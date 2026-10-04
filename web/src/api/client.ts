import type { ApiError, ApiErrorCode } from "@bolao/core/contracts";
import { authHeaders, readSession } from "../auth/session";
import { config } from "../config";

export type ClientErrorCode = ApiErrorCode | "NETWORK_ERROR";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly details: NonNullable<ApiError["error"]["details"]>;

  constructor(
    status: number,
    error: ApiError["error"] | { code: ClientErrorCode; message: string },
  ) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code;
    this.details = "details" in error && error.details ? error.details : [];
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  fetchImpl?: typeof fetch;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error &&
    "message" in value.error
  );
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, fetchImpl = fetch }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders(readSession()) };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetchImpl(`${config.apiUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiRequestError(0, {
      code: "NETWORK_ERROR",
      message: "Sem conexão com o servidor. Confere se a API está de pé.",
    });
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      isApiError(payload)
        ? payload.error
        : {
            code: "INTERNAL_ERROR",
            message: "Deu ruim do nosso lado. Tenta de novo.",
          },
    );
  }
  return payload as T;
}
