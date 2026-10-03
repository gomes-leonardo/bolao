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

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: UserView | null;
  status: AuthStatus;
  signInAsDevUser: (userId: number) => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const ME_QUERY_KEY = ["me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(readSession);

  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: api.me,
    enabled: session !== null,
    retry: (failures, error) =>
      !(error instanceof ApiRequestError && error.status === 401) &&
      failures < 2,
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

  const unauthorized =
    me.error instanceof ApiRequestError && me.error.status === 401;
  const status: AuthStatus =
    session === null || unauthorized
      ? "anonymous"
      : me.data
        ? "authenticated"
        : "loading";

  const value = useMemo<AuthContextValue>(
    () => ({
      user: status === "authenticated" ? (me.data ?? null) : null,
      status,
      signInAsDevUser,
      signIn,
      signUp,
      signOut,
    }),
    [me.data, status, signInAsDevUser, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
