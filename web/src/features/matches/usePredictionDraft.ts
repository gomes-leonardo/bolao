import type { MatchView, PredictionView } from "@bolao/core/contracts";
import { useCallback, useState } from "react";
import type { Draft } from "../../components/MatchCard";
import { errorMessage } from "../../components/QueryError";
import { useSavePrediction } from "./useRound";

const draftFrom = (prediction: PredictionView | null): Draft => ({
  home: prediction?.home ?? 0,
  away: prediction?.away ?? 0,
});

const sameScore = (a: Draft, b: Draft) =>
  a.home === b.home && a.away === b.away;

/** Rascunho do placar de um jogo e a gravação dele. */
export function usePredictionDraft(match: MatchView) {
  const seed = draftFrom(match.myPrediction);
  const [state, setState] = useState({ draft: seed, seed });
  const save = useSavePrediction();

  // O palpite do servidor mudou (outra aba, refetch): segue ele se o usuário não editou.
  // Ajuste durante o render, sem efeito: https://react.dev/learn/you-might-not-need-an-effect
  if (!sameScore(state.seed, seed)) {
    const untouched = sameScore(state.draft, state.seed);
    setState({ draft: untouched ? seed : state.draft, seed });
  }

  const setDraft = useCallback(
    (draft: Draft) => {
      setState((previous) => ({ ...previous, draft }));
    },
    [setState],
  );

  const { draft } = state;
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
