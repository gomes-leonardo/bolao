import { createDb } from "@bolao/core";
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
import type { FootballDataMatch } from "../football-data/client.ts";
import { importRound } from "./import-round.ts";

const db = createDb(inject("testDatabaseUrl"));
const sql = new pg.Client({ connectionString: inject("testDatabaseUrl") });

beforeAll(() => sql.connect());
afterAll(async () => {
  await resetDatabase(db);
  await sql.end();
  await db.$disconnect();
});
beforeEach(() => resetDatabase(db));

const alfa = {
  id: 10,
  name: "Clube Alfa",
  shortName: "Alfa",
  tla: "ALF",
  crest: null,
};
const beta = {
  id: 11,
  name: "Clube Beta",
  shortName: "Beta",
  tla: "BET",
  crest: null,
};
const gama = {
  id: 12,
  name: "Clube Gama",
  shortName: "Gama",
  tla: "GAM",
  crest: null,
};

function apiMatch(
  overrides: Partial<FootballDataMatch> = {},
): FootballDataMatch {
  return {
    id: 5001,
    utcDate: "2026-10-17T19:00:00Z",
    status: "TIMED",
    matchday: 28,
    homeTeam: alfa,
    awayTeam: beta,
    score: { fullTime: { home: null, away: null } },
    ...overrides,
  };
}

async function predict(externalMatchId: number, home: number, away: number) {
  await sql.query(
    `INSERT INTO users (name, email, password_hash) VALUES ('Ana', 'ana@carimbou.dev', 'hash')
     ON CONFLICT DO NOTHING`,
  );
  await sql.query(
    `INSERT INTO predictions (user_id, match_id, home_score, away_score)
     SELECT u.id, m.id, $2, $3 FROM users u, matches m WHERE m.external_id = $1`,
    [externalMatchId, home, away],
  );
}

interface StoredMatch {
  external_id: number;
  season: number;
  round: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_at: Date;
  home: string;
  away: string;
}

async function storedMatches(): Promise<StoredMatch[]> {
  const { rows } = await sql.query<StoredMatch>(
    `SELECT m.external_id, m.season, m.round, m.status, m.home_score, m.away_score,
            m.kickoff_at, h.tla AS home, a.tla AS away
       FROM matches m
       JOIN teams h ON h.id = m.home_team_id
       JOIN teams a ON a.id = m.away_team_id
      ORDER BY m.external_id`,
  );
  return rows;
}

async function storedPoints() {
  const { rows } = await sql.query<{ points: number | null }>(
    "SELECT points FROM predictions",
  );
  return rows.map((row) => row.points);
}

describe("importRound", () => {
  it("cria os times e os jogos da rodada", async () => {
    const summary = await importRound(db, {
      season: 2026,
      matches: [
        apiMatch(),
        apiMatch({ id: 5002, homeTeam: gama, awayTeam: alfa }),
      ],
    });

    expect(summary).toEqual({ teams: 3, matches: 2, scored: 0 });
    expect(await storedMatches()).toEqual([
      expect.objectContaining({
        external_id: 5001,
        season: 2026,
        round: 28,
        status: "scheduled",
        home: "ALF",
        away: "BET",
      }),
      expect.objectContaining({ external_id: 5002, home: "GAM", away: "ALF" }),
    ]);
    expect((await storedMatches())[0]?.kickoff_at.toISOString()).toBe(
      "2026-10-17T19:00:00.000Z",
    );
  });

  it("não duplica nada quando a rodada é importada de novo", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          utcDate: "2026-10-18T21:30:00Z",
          homeTeam: { ...alfa, name: "Alfa FC" },
        }),
      ],
    });

    const { rows } = await sql.query(
      "SELECT (SELECT count(*) FROM teams)::int AS teams, (SELECT count(*) FROM matches)::int AS matches, (SELECT name FROM teams WHERE external_id = 10) AS name",
    );
    expect(rows[0]).toEqual({ teams: 2, matches: 1, name: "Alfa FC" });
    expect((await storedMatches())[0]?.kickoff_at.toISOString()).toBe(
      "2026-10-18T21:30:00.000Z",
    );
  });

  it("guarda o placar parcial de jogo ao vivo sem pontuar", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await predict(5001, 1, 0);

    const summary = await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "IN_PLAY",
          score: { fullTime: { home: 1, away: 0 } },
        }),
      ],
    });

    expect(summary.scored).toBe(0);
    expect(await storedMatches()).toEqual([
      expect.objectContaining({ status: "live", home_score: 1, away_score: 0 }),
    ]);
    expect(await storedPoints()).toEqual([null]);
  });

  it("pontua os palpites quando o jogo chega encerrado", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await predict(5001, 2, 1);

    const summary = await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "FINISHED",
          score: { fullTime: { home: 2, away: 1 } },
        }),
      ],
    });

    expect(summary.scored).toBe(1);
    expect(await storedPoints()).toEqual([3]);
  });

  it("conserta um jogo encerrado que ficou sem pontos numa importação anterior", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await predict(5001, 2, 1);
    await sql.query(
      "UPDATE matches SET status = 'finished', home_score = 2, away_score = 1 WHERE external_id = 5001",
    );

    const summary = await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "FINISHED",
          score: { fullTime: { home: 2, away: 1 } },
        }),
      ],
    });

    expect(summary.scored).toBe(1);
    expect(await storedPoints()).toEqual([3]);
  });

  it("zera os pontos quando o jogo deixa de estar encerrado", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await predict(5001, 2, 1);
    await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "FINISHED",
          score: { fullTime: { home: 2, away: 1 } },
        }),
      ],
    });

    await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "PAUSED",
          score: { fullTime: { home: 1, away: 1 } },
        }),
      ],
    });

    expect(await storedMatches()).toEqual([
      expect.objectContaining({ status: "live", home_score: 1, away_score: 1 }),
    ]);
    expect(await storedPoints()).toEqual([null]);
  });

  it("repontua quando o placar oficial é corrigido", async () => {
    await importRound(db, { season: 2026, matches: [apiMatch()] });
    await predict(5001, 2, 1);
    await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "FINISHED",
          score: { fullTime: { home: 2, away: 1 } },
        }),
      ],
    });

    const summary = await importRound(db, {
      season: 2026,
      matches: [
        apiMatch({
          status: "AWARDED",
          score: { fullTime: { home: 3, away: 0 } },
        }),
      ],
    });

    expect(summary.scored).toBe(1);
    expect(await storedPoints()).toEqual([1]);
  });
});
