import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/endpoints";

export function useRanking(poolId: number, round?: number) {
  return useQuery({
    queryKey: ["ranking", poolId, round ?? "season"],
    queryFn: () => api.ranking(poolId, round),
  });
}
