import type { PoolSummary } from "@bolao/core/contracts";
import { Link } from "react-router";
import { ButtonLink } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Paper } from "../components/Paper";
import { QueryError } from "../components/QueryError";
import { Stamp } from "../components/Stamp";
import { usePools } from "../features/pools/usePools";

const tilts = ["left", "right", "slight"] as const;

function PoolCard({ pool, index }: { pool: PoolSummary; index: number }) {
  return (
    <Link to={`/boloes/${pool.id}/ranking`} className="block">
      <Paper
        tilt={tilts[index % tilts.length]}
        {...(index % 2 === 0 ? { tape: "left" as const } : {})}
        className="flex flex-col gap-2.5 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="line-clamp-2 font-display text-[22px] leading-none font-black uppercase stretch-semi">
              {pool.name}
            </span>
            <span className="text-[13px] text-ink-muted">
              {pool.memberCount} na roda{pool.isOwner ? " · tu é o dono" : ""}
            </span>
          </div>
          {pool.pendingPredictions > 0 ? (
            <span className="shrink-0 bg-fluor-pink px-1.5 py-0.5 text-xs font-bold tracking-[0.06em] text-ink">
              {pool.pendingPredictions} SEM PALPITE
            </span>
          ) : pool.myPosition === 1 && pool.memberCount > 1 ? (
            <Stamp size="sm">LÍDER</Stamp>
          ) : null}
        </div>
        <div className="flex items-end justify-between">
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-5xl leading-[0.85] font-black tabular-nums stretch-condensed">
              {pool.myPosition}º
            </span>
            <span className="text-[13px] text-ink-muted">
              de {pool.memberCount}
            </span>
          </span>
          <span className="flex flex-col items-end">
            <span className="font-display text-3xl leading-none font-black tabular-nums stretch-condensed">
              {pool.myPoints}
            </span>
            <span className="text-xs text-ink-muted">pontos</span>
          </span>
        </div>
      </Paper>
    </Link>
  );
}

export function PoolsPage() {
  const pools = usePools();
  const list = pools.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="TEUS BOLÕES"
        subtitle={
          pools.data && list.length === 0
            ? "Tu ainda não tá em nenhum bolão. Cria um ou cola o código da galera."
            : null
        }
      />
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-5">
        <ButtonLink to="/boloes/entrar?criar=1" className="px-2 text-[15px]">
          CRIAR
        </ButtonLink>
        <ButtonLink
          to="/boloes/entrar"
          variant="outline"
          className="px-2 text-[15px] whitespace-nowrap"
        >
          TENHO CÓDIGO
        </ButtonLink>
      </div>
      <div className="flex flex-col gap-4 px-5">
        {pools.isPending && <p className="text-muted">Carregando…</p>}
        {pools.isError && (
          <QueryError
            error={pools.error}
            onRetry={() => void pools.refetch()}
          />
        )}
        {list.map((pool, index) => (
          <PoolCard key={pool.id} pool={pool} index={index} />
        ))}
      </div>
    </>
  );
}
