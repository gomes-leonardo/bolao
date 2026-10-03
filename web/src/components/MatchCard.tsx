import type { MatchView, TeamView } from "@bolao/core/contracts";
import { Link } from "react-router";
import { formatKickoff } from "../features/matches/format";
import { verdictOf } from "../features/matches/verdict";
import { Button } from "./Button";
import { LiveBadge } from "./LiveBadge";
import { Paper } from "./Paper";
import { ScoreStepper } from "./ScoreStepper";
import { Stamp } from "./Stamp";
import { TeamCrest } from "./TeamCrest";

export interface Draft {
  home: number;
  away: number;
}

interface MatchCardProps {
  match: MatchView;
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onSave: () => void;
  saving?: boolean | undefined;
  error?: string | undefined;
  timeLeft?: string | undefined;
  wallHref?: string | undefined;
  tilt?: "left" | "right" | "slight" | undefined;
}

function StatusLine({
  match,
  timeLeft,
}: {
  match: MatchView;
  timeLeft?: string | undefined;
}) {
  const label =
    match.status === "live" ? (
      <LiveBadge />
    ) : match.status === "finished" ? (
      <span className="font-bold tracking-[0.1em] text-ink-muted">
        ENCERRADO
      </span>
    ) : match.locked ? null : (
      <span className="font-bold tracking-[0.1em] text-fluor-orange-ink">
        {timeLeft}
      </span>
    );
  return (
    <div className="flex items-center justify-between text-xs">
      {label ?? <span />}
      <span className="text-ink-muted">{formatKickoff(match.kickoffAt)}</span>
    </div>
  );
}

function TeamName({ team, align }: { team: TeamView; align: "start" | "end" }) {
  return (
    <div
      className={`flex items-center gap-2 ${align === "end" ? "flex-row-reverse" : ""}`}
    >
      <TeamCrest tla={team.tla} />
      <span className="truncate text-[15px] font-bold">{team.shortName}</span>
    </div>
  );
}

function LockedBody({
  match,
  wallHref,
}: {
  match: MatchView;
  wallHref?: string | undefined;
}) {
  const verdict = verdictOf(match);
  const prediction = match.myPrediction;
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
        <TeamName team={match.homeTeam} align="start" />
        <span className="font-display text-[44px] leading-none font-black tabular-nums stretch-condensed">
          {match.score ? `${match.score.home}–${match.score.away}` : "×"}
        </span>
        <TeamName team={match.awayTeam} align="end" />
      </div>
      <div className="flex min-h-10 items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-ink-muted">
            {prediction ? (
              <>
                Teu palpite{" "}
                <strong className="text-ink tabular-nums">
                  {prediction.home}–{prediction.away}
                </strong>
              </>
            ) : (
              "Tu não palpitou"
            )}
          </span>
          {wallHref && (
            <Link
              to={wallHref}
              className="text-sm font-bold text-fluor-orange-ink underline"
            >
              Ver o muro da galera
            </Link>
          )}
        </div>
        {verdict && <Stamp tone={verdict.tone}>{verdict.label}</Stamp>}
      </div>
    </>
  );
}

function OpenBody({
  match,
  draft,
  onDraftChange,
  onSave,
  saving,
  error,
}: Pick<
  MatchCardProps,
  "match" | "draft" | "onDraftChange" | "onSave" | "saving" | "error"
>) {
  const saved = match.myPrediction;
  const unchanged =
    saved !== null && saved.home === draft.home && saved.away === draft.away;
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5">
        <ScoreStepper
          team={match.homeTeam.shortName}
          value={draft.home}
          onChange={(home) => onDraftChange({ ...draft, home })}
          disabled={saving}
        />
        <span
          aria-hidden
          className="font-display text-xl font-black text-muted"
        >
          ×
        </span>
        <ScoreStepper
          team={match.awayTeam.shortName}
          value={draft.away}
          onChange={(away) => onDraftChange({ ...draft, away })}
          disabled={saving}
        />
      </div>
      <Button onClick={onSave} disabled={saving || unchanged}>
        {saving
          ? "COLANDO…"
          : unchanged
            ? `COLADO: ${saved.home}–${saved.away}`
            : saved
              ? "TROCA O PALPITE"
              : "COLA TEU PALPITE"}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-fluor-pink-ink">
          {error}
        </p>
      )}
    </>
  );
}

export function MatchCard({
  match,
  tilt = "slight",
  timeLeft,
  wallHref,
  ...open
}: MatchCardProps) {
  return (
    <Paper
      tilt={tilt}
      tape={match.locked ? undefined : "right"}
      highlighted={!match.locked && match.myPrediction === null}
      className="flex flex-col gap-3 px-4 py-3.5"
    >
      <article
        aria-label={`${match.homeTeam.name} x ${match.awayTeam.name}`}
        className="contents"
      >
        <StatusLine match={match} timeLeft={timeLeft} />
        {match.locked ? (
          <LockedBody match={match} wallHref={wallHref} />
        ) : (
          <OpenBody match={match} {...open} />
        )}
      </article>
    </Paper>
  );
}
