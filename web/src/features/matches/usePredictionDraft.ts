import type { MatchView } from "@bolao/core/contracts";
import { useCallback, useState } from "react";
import { errorMessage } from "../../components/QueryError";
import type { Draft } from "../../components/MatchCard";
import { useSavePrediction } from "./useRound";

/** Rascunho do placar de um jogo e a gravação dele. */
export function usePredictionDraft(match: MatchView) {
  const [draft, setDraft] = useState<Draft>(() => ({
    home: match.myPrediction?.home ?? 0,
    away: match.myPrediction?.away ?? 0,
  }));
  const save = useSavePrediction();

  const submit = useCallback(() => {
    save.mutate({ matchId: match.id, ...draft });
  }, [draft, match.id, save]);

  return {
    draft,
    setDraft,
    submit,
    saving: save.isPending,
    error: save.error ? errorMessage(save.error) : undefined,
  };
}
