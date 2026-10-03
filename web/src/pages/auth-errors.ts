import { ApiRequestError } from "../api/client";
import { errorMessage } from "../components/QueryError";

/** Enquanto a fase 4 não existe, /auth/* responde 404: explica em vez de mostrar "rota não encontrada". */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 404) {
    return "Login com senha chega com a autenticação JWT. Por enquanto, entra pelo modo dev.";
  }
  return errorMessage(error);
}
