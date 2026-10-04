import pg from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
} from "vitest";
import { createDb } from "../db.ts";
import { resetDatabase } from "../test/reset-database.ts";
import { MatchNotFoundError, registerResult } from "./register-result.ts";

const db = createDb(inject("testDatabaseUrl"));
const sql = new pg.Client({ connectionString: inject("testDatabaseUrl") });

beforeAll(() => sql.connect());
afterAll(async () => {
  await resetDatabase(db);
  await sql.end();
  await db.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(db);
  await sql.query(`
    INSERT INTO users (id, name, email, password_hash) VALUES
      (1, 'Ana', 'ana@carimbou.dev', 'hash'),
      (2, 'Beto', 'beto@carimbou.dev', 'hash'),
      (3, 'Caio', 'caio@carimbou.dev', 'hash');
    INSERT INTO teams (id, external_id, name, short_name, tla) VALUES
      (1, 100, 'Clube Alfa', 'Alfa', 'ALF'),
      (2, 101, 'Clube Beta', 'Beta', 'BET');
    INSERT INTO matches (id, external_id, season, round, home_team_id, away_team_id, kickoff_at, status) VALUES
      (1, 500, 2026, 1, 1, 2, now() - interval '2 hours', 'live');
    INSERT INTO predictions (user_id, match_id, home_score, away_score) VALUES
      (1, 1, 2, 1),
      (2, 1, 3, 0),
      (3, 1, 0, 0);
  `);
});

async function pointsByUser() {
  const { rows } = await sql.query<{ user_id: number; points: number | null }>(
    "SELECT user_id, points FROM predictions ORDER BY user_id",
  );
  return rows.map((row) => [row.user_id, row.points]);
}

describe("registerResult", () => {
  it("encerra o jogo com o placar informado", async () => {
    await registerResult(db, { matchId: 1, score: { home: 2, away: 1 } });

    const { rows } = await sql.query(
      "SELECT status, home_score, away_score FROM matches WHERE id = 1",
    );
    expect(rows[0]).toEqual({
      status: "finished",
      home_score: 2,
      away_score: 1,
    });
  });

  it("grava os pontos de cada palpite do jogo", async () => {
    const result = await registerResult(db, {
      matchId: 1,
      score: { home: 2, away: 1 },
    });

    expect(result).toEqual({ scored: 3 });
    expect(await pointsByUser()).toEqual([
      [1, 3],
      [2, 1],
      [3, 0],
    ]);
  });

  it("recalcula tudo quando o resultado é corrigido", async () => {
    await registerResult(db, { matchId: 1, score: { home: 2, away: 1 } });
    await registerResult(db, { matchId: 1, score: { home: 0, away: 0 } });

    expect(await pointsByUser()).toEqual([
      [1, 0],
      [2, 0],
      [3, 3],
    ]);
  });

  it("falha com MatchNotFoundError sem tocar em nada quando o jogo não existe", async () => {
    await expect(
      registerResult(db, { matchId: 999, score: { home: 1, away: 0 } }),
    ).rejects.toThrow(MatchNotFoundError);

    expect(await pointsByUser()).toEqual([
      [1, null],
      [2, null],
      [3, null],
    ]);
  });
});
