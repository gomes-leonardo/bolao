import type { MatchView } from "@bolao/core/contracts";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { MatchCard } from "../components/MatchCard";
import { PageHeader } from "../components/PageHeader";
import { PoolSwitcher } from "../components/PoolSwitcher";
import { QueryError } from "../components/QueryError";
import { RoundNav } from "../components/RoundNav";
import { formatTimeLeft } from "../features/matches/format";
import { useNow } from "../features/matches/useNow";
import { usePredictionDraft } from "../features/matches/usePredictionDraft";
import { useRound } from "../features/matches/useRound";
import { useCurrentPool } from "../features/pools/useCurrentPool";

const tilts = ["left", "right", "slight"] as const;

interface MatchCardContainerProps {
  match: MatchView;
  index: number;
  now: Date;
  poolId: number | undefined;
}

function MatchCardContainer({
  match,
  index,
  now,
  poolId,
}: MatchCardContainerProps) {
  const { draft, setDraft, submit, saving, error } = usePredictionDraft(match);
  return (
    <MatchCard
      match={match}
      draft={draft}
      onDraftChange={setDraft}
      onSave={submit}
      saving={saving}
      error={error}
      tilt={tilts[index % tilts.length]}
      timeLeft={formatTimeLeft(
        new Date(match.kickoffAt).getTime() - now.getTime(),
      )}
      wallHref={
        poolId && match.locked
          ? `/boloes/${poolId}/jogos/${match.id}`
          : undefined
      }
    />
  );
}

function useSelectedRound(): number | undefined {
  const [params] = useSearchParams();
  const value = Number(params.get("rodada"));
  return Number.isInteger(value) && value >= 1 && value <= 38
    ? value
    : undefined;
}

function subtitleOf(matches: MatchView[]): ReactNode {
  const missing = matches.filter(
    (match) => !match.locked && !match.myPrediction,
  ).length;
  if (missing > 0) {
    return (
      <>
        Cola teu palpite aí:{" "}
        <strong className="text-tape">{missing} jogos</strong> ainda sem papel.
      </>
    );
  }
  if (matches.every((match) => match.status === "finished")) {
    return "Rodada fechada, muro atualizado.";
  }
  return "Palpites colados. Agora é com eles.";
}

export function RoundPage() {
  const round = useRound(useSelectedRound());
  const { pool, pools, selectPool } = useCurrentPool();
  const now = useNow();

  return (
    <>
      <PageHeader
        title={round.data ? `RODADA ${round.data.round}` : "RODADA"}
        subtitle={round.data ? subtitleOf(round.data.matches) : null}
        action={
          pool && pools.length > 0 ? (
            <PoolSwitcher pools={pools} value={pool.id} onChange={selectPool} />
          ) : null
        }
      />
      {round.data && <RoundNav round={round.data.round} />}
      <div className="flex flex-col gap-4 px-[18px]">
        {round.isPending && <p className="text-muted">Carregando a rodada…</p>}
        {round.isError && (
          <QueryError
            error={round.error}
            onRetry={() => void round.refetch()}
          />
        )}
        {round.data?.matches.map((match, index) => (
          <MatchCardContainer
            key={match.id}
            match={match}
            index={index}
            now={now}
            poolId={pool?.id}
          />
        ))}
      </div>
    </>
  );
}
