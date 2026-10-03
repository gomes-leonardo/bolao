import type {
  MatchView,
  PredictionView,
  RoundView,
  UpsertPredictionInput,
} from "@bolao/core/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/endpoints";
import { POOLS_KEY } from "../pools/usePools";

// Sem WebSocket/SSE nesta etapa: enquanto houver jogo ao vivo, a rodada é buscada de novo.
const LIVE_REFRESH_MS = 30_000;

export const roundKey = (round?: number) =>
  ["round", round ?? "current"] as const;

export function useRound(round?: number) {
  return useQuery({
    queryKey: roundKey(round),
    queryFn: () => api.round(round),
    refetchInterval: (query) =>
      query.state.data?.matches.some((match) => match.status === "live")
        ? LIVE_REFRESH_MS
        : false,
  });
}

function withPrediction(
  round: RoundView,
  matchId: number,
  prediction: PredictionView,
): RoundView {
  return {
    ...round,
    matches: round.matches.map((match): MatchView =>
      match.id === matchId ? { ...match, myPrediction: prediction } : match,
    ),
  };
}

export function useSavePrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      ...input
    }: UpsertPredictionInput & { matchId: number }) =>
      api.savePrediction(matchId, input),
    onSuccess: (prediction, { matchId }) => {
      queryClient.setQueriesData<RoundView>({ queryKey: ["round"] }, (round) =>
        round ? withPrediction(round, matchId, prediction) : round,
      );
      void queryClient.invalidateQueries({ queryKey: POOLS_KEY });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["round"] }),
  });
}
