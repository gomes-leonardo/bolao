import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type { RankingEntry } from "@bolao/core/contracts";
import { DB } from "../db/db.module.js";

interface StandingRow {
  pool_id: number;
  user_id: number;
  name: string;
  points: number;
  exact_hits: number;
  position: number;
}

/**
 * Classificação dos bolões, calculada no Postgres a cada chamada.
 * É o ponto isolado para trocar por um ranking em cache (Redis) depois.
 */
@Injectable()
export class RankingService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async standings(
    poolIds: number[],
    round?: number,
  ): Promise<Map<number, RankingEntry[]>> {
    const byPool = new Map<number, RankingEntry[]>(
      poolIds.map((id) => [id, []]),
    );
    if (poolIds.length === 0) return byPool;

    const rows = await this.db.$queryRaw<StandingRow[]>`
      SELECT pm.pool_id,
             u.id AS user_id,
             u.name,
             COALESCE(SUM(pr.points), 0)::int AS points,
             (COUNT(pr.id) FILTER (WHERE pr.points = 3))::int AS exact_hits,
             (RANK() OVER (
               PARTITION BY pm.pool_id
               ORDER BY COALESCE(SUM(pr.points), 0) DESC,
                        COUNT(pr.id) FILTER (WHERE pr.points = 3) DESC
             ))::int AS position
        FROM pool_members pm
        JOIN pools p ON p.id = pm.pool_id
        JOIN users u ON u.id = pm.user_id
        LEFT JOIN (predictions pr JOIN matches m ON m.id = pr.match_id)
               ON pr.user_id = pm.user_id
              AND m.season = p.season
              AND (${round ?? null}::int IS NULL OR m.round = ${round ?? null}::int)
       WHERE pm.pool_id = ANY(${poolIds}::int[])
       GROUP BY pm.pool_id, u.id, u.name
       ORDER BY pm.pool_id, position, u.name`;

    for (const row of rows) {
      byPool.get(row.pool_id)?.push({
        position: row.position,
        user: { id: row.user_id, name: row.name },
        points: row.points,
        exactHits: row.exact_hits,
      });
    }
    return byPool;
  }
}
