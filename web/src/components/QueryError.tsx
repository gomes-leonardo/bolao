import { ApiRequestError } from "../api/client";
import { Button } from "./Button";

interface QueryErrorProps {
  error: unknown;
  onRetry?: () => void;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : "Deu ruim. Tenta de novo.";
}

export function QueryError({ error, onRetry }: QueryErrorProps) {
  return (
    <div role="alert" className="flex flex-col gap-3 bg-surface p-4">
      <p className="text-[15px]">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          TENTA DE NOVO
        </Button>
      )}
    </div>
  );
}
