import type { Db } from "../../db.ts";
import { toPredictionWindow } from "../../domain/predictions/prediction-window.ts";
import type { PredictionsGateway } from "../../domain/predictions/predictions-gateway.ts";
import { Prisma } from "../../prisma.ts";

interface PlacedRow {
  home_score: number;
  away_score: number;
  points: number | null;
}

/**
 * A janela do palpite mora aqui e em nenhum outro lugar (ADR 0004).
 *
 * A gravação e o muro leem a mesma condição e o mesmo relógio, o do Postgres.
 * As duas queries apelidam `matches` de `m` justamente para este fragmento
 * caber nas duas — antes o predicado estava escrito duas vezes, e manter as
 * duas em sincronia era um combinado, não uma garantia.
 */
const openWindow = Prisma.sql`m.status = 'scheduled' AND m.kickoff_at > now()`;

export function createPrismaPredictionsGateway(db: Db): PredictionsGateway {
  return {
    async placeWhileOpen({ userId, matchId, score }) {
      // Um comando só: o palpite só é gravado se, na mesma operação, o jogo
      // ainda está agendado e o apito não soou. O FOR SHARE conflita com o lock
      // que o registerResult pega ao encerrar o jogo.
      const rows = await db.$queryRaw<PlacedRow[]>(Prisma.sql`
        INSERT INTO predictions (user_id, match_id, home_score, away_score)
        SELECT ${userId}, m.id, ${score.home}, ${score.away}
          FROM matches m
         WHERE m.id = ${matchId}
           AND ${openWindow}
           FOR SHARE
        ON CONFLICT (user_id, match_id) DO UPDATE
           SET home_score = EXCLUDED.home_score,
               away_score = EXCLUDED.away_score,
               updated_at = now()
        RETURNING home_score, away_score, points`);

      const [row] = rows;
      if (!row) return null;
      return {
        score: { home: row.home_score, away: row.away_score },
        points: row.points,
      };
    },

    async windowOf(matchId) {
      const rows = await db.$queryRaw<{ locked: boolean }[]>(Prisma.sql`
        SELECT NOT (${openWindow}) AS locked
          FROM matches m
         WHERE m.id = ${matchId}`);
      return toPredictionWindow(rows[0]);
    },
  };
}
