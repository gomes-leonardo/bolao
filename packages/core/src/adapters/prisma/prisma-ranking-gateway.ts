import type { Db } from "../../db.ts";
import type {
  PoolTally,
  RankingGateway,
} from "../../domain/ranking/ranking-gateway.ts";
import { Prisma } from "../../prisma.ts";

interface TallyRow {
  pool_id: number;
  user_id: number;
  name: string;
  points: number;
  exact_hits: number;
}

export function createPrismaRankingGateway(db: Db): RankingGateway {
  return {
    async talliesOf(poolIds, round) {
      // Agregação só: nem RANK(), nem ORDER BY. A ordem e a posição são regra,
      // e regra mora em rankStandings (ADR 0008).
      //
      // O LEFT JOIN é o que mantém no resultado o membro que não palpitou
      // nada, com zero ponto. Sem ele o bolão inteiro desapareceria da
      // classificação até alguém pontuar.
      const rows = await db.$queryRaw<TallyRow[]>(Prisma.sql`
        SELECT pm.pool_id,
               u.id AS user_id,
               u.name,
               COALESCE(SUM(pr.points), 0)::int AS points,
               (COUNT(pr.id) FILTER (WHERE pr.points = 3))::int AS exact_hits
          FROM pool_members pm
          JOIN pools p ON p.id = pm.pool_id
          JOIN users u ON u.id = pm.user_id
          LEFT JOIN (predictions pr JOIN matches m ON m.id = pr.match_id)
                 ON pr.user_id = pm.user_id
                AND m.season = p.season
                AND (${round ?? null}::int IS NULL OR m.round = ${round ?? null}::int)
         WHERE pm.pool_id = ANY(${poolIds}::int[])
         GROUP BY pm.pool_id, u.id, u.name`);

      return rows.map((row): PoolTally => ({
        poolId: row.pool_id,
        user: { id: row.user_id, name: row.name },
        points: row.points,
        exactHits: row.exact_hits,
      }));
    },
  };
}
