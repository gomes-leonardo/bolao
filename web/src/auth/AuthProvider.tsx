import type {
  LoginInput,
  RegisterInput,
  UserView,
} from "@bolao/core/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiRequestError } from "../api/client";
import { api } from "../api/endpoints";
import {
  clearSession,
  readSession,
  type Session,
  writeSession,
} from "./session";

/**
 * anonymous     sem sessão, ou a API recusou a sessão (401)
 * loading       há sessão e o /me ainda não respondeu
 * authenticated o /me respondeu com o usuário
 * error         há sessão, mas o /me falhou por outro motivo (API fora, 500)
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export interface AuthContextValue {
  user: UserView | null;
  status: AuthStatus;
  error: unknown;
  retry: () => void;
  signInAsDevUser: (userId: number) => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const ME_QUERY_KEY = ["me"] as const;

const isUnauthorized = (error: unknown) =>
  error instanceof ApiRequestError && error.status === 401;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(readSession);

  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: api.me,
    enabled: session !== null,
  });

  const start = useCallback(
    (next: Session, user?: UserView) => {
      writeSession(next);
      setSession(next);
      queryClient.clear();
      if (user) queryClient.setQueryData(ME_QUERY_KEY, user);
    },
    [queryClient],
  );

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  // Sessão recusada pela API: o status já vira "anonymous" no render; o efeito só
  // apaga a credencial guardada (sistema externo) para não repetir o 401.
  const rejected = session !== null && isUnauthorized(me.error);
  useEffect(() => {
    if (rejected) clearSession();
  }, [rejected]);

  const signInAsDevUser = useCallback(
    async (userId: number) => {
      start({ kind: "dev", userId });
      try {
        await queryClient.fetchQuery({
          queryKey: ME_QUERY_KEY,
          queryFn: api.me,
        });
      } catch (error) {
        signOut();
        throw error;
      }
    },
    [queryClient, signOut, start],
  );

  const signIn = useCallback(
    async (input: LoginInput) => {
      const { user, accessToken } = await api.login(input);
      start({ kind: "token", accessToken }, user);
    },
    [start],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const { user, accessToken } = await api.register(input);
      start({ kind: "token", accessToken }, user);
    },
    [start],
  );

  const status: AuthStatus =
    session === null || rejected
      ? "anonymous"
      : me.data
        ? "authenticated"
        : me.isError
          ? "error"
          : "loading";

  const retry = useCallback(() => void me.refetch(), [me]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: status === "authenticated" ? (me.data ?? null) : null,
      status,
      error: status === "error" ? me.error : null,
      retry,
      signInAsDevUser,
      signIn,
      signUp,
      signOut,
    }),
    [
      me.data,
      me.error,
      status,
      retry,
      signInAsDevUser,
      signIn,
      signUp,
      signOut,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
