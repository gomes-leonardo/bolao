import type { ApiError, RankingView } from "@bolao/core/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  seedMatch,
  seedPool,
  seedPrediction,
  seedUser,
} from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

let app: TestApp;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.reset();
  await app.close();
});
beforeEach(() => app.reset());

const finishedMatch = (round: number, season = 2026) =>
  seedMatch(app.db, {
    round,
    season,
    kickoffInMinutes: -60 * 24,
    status: "finished",
    score: [1, 0],
  });

const table = (ranking: RankingView) =>
  ranking.entries.map((entry) => [
    entry.position,
    entry.user.name,
    entry.points,
    entry.exactHits,
  ]);

describe("GET /pools/:id/ranking", () => {
  it("ordena por pontos e desempata por cravadas, com empate dividindo a posição", async () => {
    const [ana, beto, caio, duda, eva] = await Promise.all(
      ["Ana", "Beto", "Caio", "Duda", "Eva"].map((name) =>
        seedUser(app.db, name),
      ),
    );
    const pool = await seedPool(app.db, ana!, {
      memberIds: [beto!, caio!, duda!, eva!],
    });
    const [m1, m2, m3] = [
      await finishedMatch(27),
      await finishedMatch(27),
      await finishedMatch(28),
    ];
    await seedPrediction(app.db, ana!, m1, [1, 0], 3);
    await seedPrediction(app.db, ana!, m2, [1, 0], 3);
    await seedPrediction(app.db, beto!, m1, [2, 0], 1);
    await seedPrediction(app.db, beto!, m2, [1, 0], 3);
    await seedPrediction(app.db, beto!, m3, [3, 1], 1);
    await seedPrediction(app.db, caio!, m1, [2, 1], 1);
    await seedPrediction(app.db, caio!, m2, [3, 2], 1);
    await seedPrediction(app.db, caio!, m3, [1, 0], 3);
    await seedPrediction(app.db, duda!, m3, [0, 1], 0);

    const response = await app.request<RankingView>(
      "GET",
      `/pools/${pool.id}/ranking`,
      { as: ana! },
    );

    expect(response.status).toBe(200);
    expect(table(response.body)).toEqual([
      [1, "Ana", 6, 2],
      [2, "Beto", 5, 1],
      [2, "Caio", 5, 1],
      [4, "Duda", 0, 0],
      [4, "Eva", 0, 0],
    ]);
  });

  it("filtra por rodada", async () => {
    const [ana, beto] = await Promise.all([
      seedUser(app.db, "Ana"),
      seedUser(app.db, "Beto"),
    ]);
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });
    const r27 = await finishedMatch(27);
    const r28 = await finishedMatch(28);
    await seedPrediction(app.db, ana, r27, [1, 0], 3);
    await seedPrediction(app.db, beto, r28, [1, 0], 3);
    await seedPrediction(app.db, ana, r28, [2, 0], 1);

    const response = await app.request<RankingView>(
      "GET",
      `/pools/${pool.id}/ranking?round=28`,
      {
        as: ana,
      },
    );

    expect(response.body.round).toBe(28);
    expect(table(response.body)).toEqual([
      [1, "Beto", 3, 1],
      [2, "Ana", 1, 0],
    ]);
  });

  it("ignora jogos de outra temporada e palpites de quem não é do bolão", async () => {
    const [ana, outsider] = await Promise.all([
      seedUser(app.db, "Ana"),
      seedUser(app.db, "Zé"),
    ]);
    const pool = await seedPool(app.db, ana);
    const lastSeason = await finishedMatch(38, 2025);
    const current = await finishedMatch(1);
    await seedPrediction(app.db, ana, lastSeason, [1, 0], 3);
    await seedPrediction(app.db, outsider, current, [1, 0], 3);

    const response = await app.request<RankingView>(
      "GET",
      `/pools/${pool.id}/ranking`,
      { as: ana },
    );

    expect(table(response.body)).toEqual([[1, "Ana", 0, 0]]);
  });

  it("esconde o ranking de quem não é membro", async () => {
    const [ana, outsider] = await Promise.all([
      seedUser(app.db, "Ana"),
      seedUser(app.db, "Zé"),
    ]);
    const pool = await seedPool(app.db, ana);

    const response = await app.request<ApiError>(
      "GET",
      `/pools/${pool.id}/ranking`,
      {
        as: outsider,
      },
    );

    expect(response.status).toBe(404);
  });
});
