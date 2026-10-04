import type {
  CreatePoolInput,
  JoinPoolInput,
  PoolSummary,
} from "@bolao/core/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/endpoints";

export const POOLS_KEY = ["pools"] as const;

export function usePools() {
  return useQuery({ queryKey: POOLS_KEY, queryFn: () => api.pools(1, 50) });
}

export function useCreatePool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePoolInput) => api.createPool(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POOLS_KEY }),
  });
}

export function useJoinPool() {
  const queryClient = useQueryClient();
  return useMutation<PoolSummary, Error, JoinPoolInput>({
    mutationFn: (input) => api.joinPool(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POOLS_KEY }),
  });
}
