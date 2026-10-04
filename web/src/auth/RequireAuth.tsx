import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { FullScreenMessage } from "../components/FullScreenMessage";
import { QueryError } from "../components/QueryError";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullScreenMessage>Carregando…</FullScreenMessage>;
  }
  if (status === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
        <QueryError error={error} onRetry={retry} />
      </div>
    );
  }
  if (status === "anonymous") {
    return (
      <Navigate to="/entrar" replace state={{ from: location.pathname }} />
    );
  }
  return children;
}
