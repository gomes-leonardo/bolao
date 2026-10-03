import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { FullScreenMessage } from "../components/FullScreenMessage";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading")
    return <FullScreenMessage>Carregando…</FullScreenMessage>;
  if (status === "anonymous") {
    return (
      <Navigate to="/entrar" replace state={{ from: location.pathname }} />
    );
  }
  return children;
}
