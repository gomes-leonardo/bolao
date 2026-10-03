import { createDb, MatchNotFoundError } from "@bolao/core";
import { resetDatabase } from "@bolao/core/testing";
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
import {
  MatchNotStartedError,
  registerManualResult,
} from "./register-manual-result.ts";

const db = createDb(inject("testDatabaseUrl"));
const sql = new pg.Client({ connectionString: inject("testDatabaseUrl") });
const now = new Date("2026-10-17T21:00:00Z");

beforeAll(() => sql.connect());
afterAll(async () => {
  await resetDatabase(db);
  await sql.end();
  await db.$disconnect();
});
beforeEach(async () => {
  await resetDatabase(db);
  await sql.query(`
    INSERT INTO teams (id, external_id, name, short_name, tla) VALUES
      (1, 100, 'Clube Alfa', 'Alfa', 'ALF'),
      (2, 101, 'Clube Beta', 'Beta', 'BET');
    INSERT INTO matches (external_id, season, round, home_team_id, away_team_id, kickoff_at, status) VALUES
      (500, 2026, 28, 1, 2, '2026-10-17T19:00:00Z', 'live'),
      (501, 2026, 28, 2, 1, '2026-10-18T19:00:00Z', 'scheduled');
  `);
});

describe("registerManualResult", () => {
  it("encerra pelo id externo um jogo que já começou", async () => {
    await registerManualResult(db, {
      externalId: 500,
      score: { home: 1, away: 0 },
      now,
    });

    const { rows } = await sql.query(
      "SELECT status, home_score, away_score FROM matches WHERE external_id = 500",
    );
    expect(rows[0]).toEqual({
      status: "finished",
      home_score: 1,
      away_score: 0,
    });
  });

  it("recusa jogo que ainda não começou", async () => {
    await expect(
      registerManualResult(db, {
        externalId: 501,
        score: { home: 1, away: 0 },
        now,
      }),
    ).rejects.toThrow(MatchNotStartedError);

    const { rows } = await sql.query(
      "SELECT status FROM matches WHERE external_id = 501",
    );
    expect(rows[0]).toEqual({ status: "scheduled" });
  });

  it("recusa jogo que não existe", async () => {
    await expect(
      registerManualResult(db, {
        externalId: 999,
        score: { home: 1, away: 0 },
        now,
      }),
    ).rejects.toThrow(MatchNotFoundError);
  });
});
