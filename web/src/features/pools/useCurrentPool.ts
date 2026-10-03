import type { PoolSummary } from "@bolao/core/contracts";
import { useCallback, useState } from "react";
import { usePools } from "./usePools";

const STORAGE_KEY = "carimbou.currentPool";

function readStoredPoolId(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storePoolId(id: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Sem storage, a escolha vale só até recarregar.
  }
}

export interface CurrentPool {
  pool: PoolSummary | null;
  pools: PoolSummary[];
  isLoading: boolean;
  error: unknown;
  selectPool: (id: number) => void;
}

/** O bolão "em foco": define de qual bolão saem o ranking e o muro da galera. */
export function useCurrentPool(): CurrentPool {
  const { data, isLoading, error } = usePools();
  const [selectedId, setSelectedId] = useState<number | null>(readStoredPoolId);

  const selectPool = useCallback((id: number) => {
    storePoolId(id);
    setSelectedId(id);
  }, []);

  const pools = data?.data ?? [];
  const pool =
    pools.find((candidate) => candidate.id === selectedId) ?? pools[0] ?? null;
  return { pool, pools, isLoading, error, selectPool };
}
