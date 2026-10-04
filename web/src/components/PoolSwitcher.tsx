import type { PoolSummary } from "@bolao/core/contracts";

interface PoolSwitcherProps {
  pools: PoolSummary[];
  value: number;
  onChange: (poolId: number) => void;
}

export function PoolSwitcher({ pools, value, onChange }: PoolSwitcherProps) {
  return (
    <label className="relative flex min-h-11 items-center bg-surface">
      <span className="sr-only">Bolão em foco</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 max-w-48 appearance-none truncate bg-transparent pr-8 pl-3.5 text-sm font-semibold text-paper"
      >
        {pools.map((pool) => (
          <option key={pool.id} value={pool.id} className="bg-surface">
            {pool.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
