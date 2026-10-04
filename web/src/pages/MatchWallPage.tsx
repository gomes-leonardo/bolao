import type { WallEntry, WallView } from "@bolao/core/contracts";
import { useParams } from "react-router";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { LiveBadge } from "../components/LiveBadge";
import { PageHeader } from "../components/PageHeader";
import { Paper } from "../components/Paper";
import { QueryError } from "../components/QueryError";
import { Stamp } from "../components/Stamp";
import { TeamCrest } from "../components/TeamCrest";
import { verdictOf } from "../features/matches/verdict";
import { useWall } from "../features/matches/useWall";
import { markOf, summarize, type WallMark } from "../features/matches/wall";

const marks: Record<WallMark, { label: string; swatch: string }> = {
  exact: { label: "cravando", swatch: "bg-fluor-orange" },
  outcome: { label: "na trave", swatch: "border-2 border-ink-blue" },
  miss: { label: "passando longe", swatch: "bg-line" },
  none: { label: "sem palpite", swatch: "" },
};

function Scoreboard({ wall }: { wall: WallView }) {
  const { match } = wall;
  const verdict = verdictOf(match);
  return (
    <Paper
      tilt="left"
      tape="left"
      className="mx-5 flex flex-col items-center gap-2.5 px-4 pt-4 pb-5"
    >
      {match.status === "live" ? (
        <LiveBadge />
      ) : (
        <span className="text-xs font-bold tracking-[0.1em] text-ink-muted">
          ENCERRADO
        </span>
      )}
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {[match.homeTeam, null, match.awayTeam].map((team) =>
          team ? (
            <div key={team.id} className="flex flex-col items-center gap-1.5">
              <TeamCrest tla={team.tla} size="lg" />
              <span className="text-[15px] font-bold">{team.shortName}</span>
            </div>
          ) : (
            <span
              key="score"
              className="font-display text-[84px] leading-[0.85] font-black tabular-nums [font-stretch:55%]"
            >
              {match.score ? `${match.score.home}–${match.score.away}` : "×"}
            </span>
          ),
        )}
      </div>
      <div className="flex items-center gap-2.5 text-sm text-ink-muted">
        {match.myPrediction ? (
          <span>
            Teu palpite{" "}
            <strong className="text-ink tabular-nums">
              {match.myPrediction.home}–{match.myPrediction.away}
            </strong>
          </span>
        ) : (
          <span>Tu não palpitou</span>
        )}
        {verdict && (
          <Stamp size="sm" tone={verdict.tone}>
            {verdict.label}
          </Stamp>
        )}
      </div>
    </Paper>
  );
}

function WallCard({
  entry,
  mark,
  index,
  isMe,
}: {
  entry: WallEntry;
  mark: WallMark;
  index: number;
  isMe: boolean;
}) {
  const onPaper = mark === "exact" || mark === "outcome";
  return (
    <li
      className={`flex items-center justify-between px-3 py-2.5 ${
        onPaper ? "bg-paper text-ink" : "bg-surface text-paper"
      } ${index % 2 === 0 ? "-rotate-[0.8deg]" : "rotate-[0.6deg]"} ${
        isMe ? "outline-2 outline-fluor-orange" : ""
      }`}
    >
      <span className="truncate font-bold">
        {isMe ? "Tu" : entry.user.name}
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`font-display text-[26px] font-black tabular-nums stretch-condensed ${onPaper ? "" : "text-muted"}`}
        >
          {entry.prediction
            ? `${entry.prediction.home}–${entry.prediction.away}`
            : "—"}
        </span>
        {marks[mark].swatch && (
          <span
            role="img"
            aria-label={marks[mark].label}
            className={`size-2.5 ${marks[mark].swatch}`}
          />
        )}
      </span>
    </li>
  );
}

export function MatchWallPage() {
  const params = useParams();
  const poolId = Number(params["poolId"]);
  const matchId = Number(params["matchId"]);
  const wall = useWall(poolId, matchId);
  const { user } = useAuth();

  if (
    wall.isError &&
    wall.error instanceof ApiRequestError &&
    wall.error.code === "PREDICTIONS_HIDDEN"
  ) {
    return (
      <>
        <PageHeader
          title="SEGURA AÍ"
          subtitle={wall.error.message}
          backTo="/rodada"
        />
      </>
    );
  }

  const data = wall.data;
  const summary = data ? summarize(data.entries, data.match.score) : null;

  return (
    <>
      <PageHeader title="O MURO DA GALERA" backTo="/rodada" />
      {wall.isPending && <p className="px-5 text-muted">Carregando o muro…</p>}
      {wall.isError && (
        <div className="px-5">
          <QueryError error={wall.error} onRetry={() => void wall.refetch()} />
        </div>
      )}
      {data && summary && (
        <div className="flex flex-col gap-5">
          <Scoreboard wall={data} />
          <section className="flex flex-col gap-3 px-5">
            <p className="text-[13px] text-muted">
              {data.match.status === "finished"
                ? "Fechou: "
                : "Se acabar assim: "}
              <strong className="text-tape">{summary.exact} cravam</strong>,{" "}
              {summary.outcome} na trave, {summary.miss} passam longe.
            </p>
            <ul className="grid grid-cols-2 gap-2.5">
              {data.entries.map((entry, index) => (
                <WallCard
                  key={entry.user.id}
                  entry={entry}
                  mark={markOf(entry, data.match.score)}
                  index={index}
                  isMe={entry.user.id === user?.id}
                />
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              {(["exact", "outcome", "miss"] as const).map((mark) => (
                <span key={mark} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`size-2.5 ${marks[mark].swatch}`}
                  />
                  {marks[mark].label}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
