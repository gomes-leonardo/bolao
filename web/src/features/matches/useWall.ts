import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/endpoints";

const LIVE_REFRESH_MS = 30_000;

export function useWall(poolId: number, matchId: number) {
  return useQuery({
    queryKey: ["wall", poolId, matchId],
    queryFn: () => api.wall(poolId, matchId),
    refetchInterval: (query) =>
      query.state.data?.match.status === "live" ? LIVE_REFRESH_MS : false,
  });
}
