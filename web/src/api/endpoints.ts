import type {
  AuthSession,
  CreatePoolInput,
  JoinPoolInput,
  LoginInput,
  Paginated,
  PoolSummary,
  PredictionView,
  RankingView,
  RegisterInput,
  RoundView,
  UpsertPredictionInput,
  UserView,
  WallView,
} from "@bolao/core/contracts";
import { apiRequest } from "./client";

const query = (params: Record<string, number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const api = {
  me: () => apiRequest<UserView>("/me"),
  register: (body: RegisterInput) =>
    apiRequest<AuthSession>("/auth/register", { method: "POST", body }),
  login: (body: LoginInput) =>
    apiRequest<AuthSession>("/auth/login", { method: "POST", body }),

  pools: (page = 1, pageSize = 20) =>
    apiRequest<Paginated<PoolSummary>>(`/pools${query({ page, pageSize })}`),
  createPool: (body: CreatePoolInput) =>
    apiRequest<PoolSummary>("/pools", { method: "POST", body }),
  joinPool: (body: JoinPoolInput) =>
    apiRequest<PoolSummary>("/pools/join", { method: "POST", body }),
  ranking: (poolId: number, round?: number) =>
    apiRequest<RankingView>(`/pools/${poolId}/ranking${query({ round })}`),
  wall: (poolId: number, matchId: number) =>
    apiRequest<WallView>(`/pools/${poolId}/matches/${matchId}/predictions`),

  round: (round?: number) =>
    apiRequest<RoundView>(`/matches${query({ round })}`),
  savePrediction: (matchId: number, body: UpsertPredictionInput) =>
    apiRequest<PredictionView>(`/matches/${matchId}/prediction`, {
      method: "PUT",
      body,
    }),
};
