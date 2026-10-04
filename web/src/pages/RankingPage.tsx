import type { RankingEntry } from "@bolao/core/contracts";
import { Navigate, useParams, useSearchParams } from "react-router";
import { ButtonLink } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Paper } from "../components/Paper";
import { QueryError } from "../components/QueryError";
import { useAuth } from "../auth/useAuth";
import { useRound } from "../features/matches/useRound";
import { useCurrentPool } from "../features/pools/useCurrentPool";
import { usePools } from "../features/pools/usePools";
import { useRanking } from "../features/ranking/useRanking";

function Leader({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <Paper
      tilt="left"
      tape="left"
      className="mx-5 flex items-center gap-3.5 p-4"
    >
      <span className="font-display text-[76px] leading-[0.8] font-black text-fluor-orange-ink tabular-nums [font-stretch:55%]">
        {entry.position}º
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-2xl leading-none font-black uppercase stretch-semi">
          {isMe ? "Tu" : entry.user.name}
        </span>
        <span className="text-[13px] text-ink-muted">
          {entry.exactHits} cravadas
        </span>
      </div>
      <span className="flex flex-col items-end">
        <span className="font-display text-[40px] leading-none font-black tabular-nums stretch-condensed">
          {entry.points}
        </span>
        <span className="text-xs text-ink-muted">pts</span>
      </span>
    </Paper>
  );
}

function Row({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <li
      className={`grid min-h-[52px] grid-cols-[40px_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-3 ${
        isMe
          ? "animate-paste bg-paper text-ink outline-[3px] -outline-offset-[3px] outline-fluor-orange"
          : "bg-surface"
      }`}
    >
      <span
        className={`font-display text-[26px] font-black tabular-nums stretch-condensed ${isMe ? "" : "text-muted"}`}
      >
        {entry.position}º
      </span>
      <span className="truncate text-base font-bold">
        {isMe ? "Tu" : entry.user.name}
      </span>
      <span className={`text-[13px] ${isMe ? "text-ink-muted" : "text-muted"}`}>
        {entry.exactHits} cravadas
      </span>
      <span className="font-display text-[26px] font-black tabular-nums stretch-condensed">
        {entry.points}
      </span>
    </li>
  );
}

export function RankingPage() {
  const poolId = Number(useParams()["poolId"]);
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const currentRound = useRound().data?.round;
  const byRound = params.get("rodada") === "1" && currentRound !== undefined;
  const ranking = useRanking(poolId, byRound ? currentRound : undefined);
  const pool = usePools().data?.data.find(
    (candidate) => candidate.id === poolId,
  );

  const [leader, ...rest] = ranking.data?.entries ?? [];
  const tab = (active: boolean) =>
    `min-h-11 font-display text-sm font-black tracking-[0.04em] stretch-semi ${
      active ? "bg-paper text-ink" : "text-paper"
    }`;

  return (
    <>
      <PageHeader title="RANKING" subtitle={pool?.name} backTo="/boloes" />
      <div
        role="group"
        aria-label="Período"
        className="mx-5 mb-5 grid grid-cols-2 border-2 border-paper"
      >
        <button
          aria-pressed={!byRound}
          className={tab(!byRound)}
          onClick={() => setParams({})}
        >
          TEMPORADA
        </button>
        <button
          aria-pressed={byRound}
          className={tab(byRound)}
          onClick={() => setParams({ rodada: "1" })}
        >
          {currentRound ? `RODADA ${currentRound}` : "RODADA"}
        </button>
      </div>
      {ranking.isPending && <p className="px-5 text-muted">Carregando…</p>}
      {ranking.isError && (
        <div className="px-5">
          <QueryError
            error={ranking.error}
            onRetry={() => void ranking.refetch()}
          />
        </div>
      )}
      {leader && <Leader entry={leader} isMe={leader.user.id === user?.id} />}
      <ol className="mt-4 flex flex-col gap-1.5 px-5">
        {rest.map((entry) => (
          <Row
            key={entry.user.id}
            entry={entry}
            isMe={entry.user.id === user?.id}
          />
        ))}
        {ranking.data && (
          <li className="px-0.5 pt-1.5 text-xs text-muted">
            Empate em pontos: desempata quem cravou mais.
          </li>
        )}
      </ol>
    </>
  );
}

/** /ranking: abre o ranking do bolão em foco. */
export function CurrentPoolRanking() {
  const { pool, isLoading, error } = useCurrentPool();
  if (isLoading) return <p className="p-5 text-muted">Carregando…</p>;
  if (pool) return <Navigate to={`/boloes/${pool.id}/ranking`} replace />;
  return (
    <>
      <PageHeader
        title="RANKING"
        subtitle="Entra num bolão pra ter com quem disputar."
      />
      <div className="flex flex-col gap-3 px-5">
        {error ? <QueryError error={error} /> : null}
        <ButtonLink to="/boloes/entrar">BORA PRO BOLÃO</ButtonLink>
      </div>
    </>
  );
}
