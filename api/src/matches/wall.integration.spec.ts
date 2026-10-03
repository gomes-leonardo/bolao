import type { ApiError, WallView } from "@bolao/core/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  seedMatch,
  seedPool,
  seedPrediction,
  seedUser,
} from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

let app: TestApp;
let ana: number;
let beto: number;
let caio: number;
let pool: { id: number };

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.reset();
  await app.close();
});
beforeEach(async () => {
  await app.reset();
  ana = await seedUser(app.db, "Ana");
  beto = await seedUser(app.db, "Beto");
  caio = await seedUser(app.db, "Caio");
  pool = await seedPool(app.db, ana, { memberIds: [beto] });
});

const wall = (matchId: number, as = ana) =>
  app.request<WallView & ApiError>(
    "GET",
    `/pools/${pool.id}/matches/${matchId}/predictions`,
    { as },
  );

describe("GET /pools/:id/matches/:matchId/predictions", () => {
  it("esconde os palpites antes do apito", async () => {
    const matchId = await seedMatch(app.db, { kickoffInMinutes: 30 });
    await seedPrediction(app.db, beto, matchId, [2, 0]);

    const response = await wall(matchId);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PREDICTIONS_HIDDEN");
  });

  it("revela os palpites dos membros depois do apito", async () => {
    const matchId = await seedMatch(app.db, {
      kickoffInMinutes: -20,
      status: "live",
      score: [1, 0],
    });
    await seedPrediction(app.db, beto, matchId, [2, 0]);
    await seedPrediction(app.db, caio, matchId, [1, 0]);

    const response = await wall(matchId);

    expect(response.status).toBe(200);
    expect(response.body.match).toMatchObject({
      id: matchId,
      score: { home: 1, away: 0 },
    });
    expect(response.body.entries).toEqual([
      { user: { id: ana, name: "Ana" }, prediction: null },
      {
        user: { id: beto, name: "Beto" },
        prediction: { home: 2, away: 0, points: null },
      },
    ]);
  });

  it("esconde o muro de quem não é membro", async () => {
    const matchId = await seedMatch(app.db, {
      kickoffInMinutes: -20,
      status: "live",
      score: [0, 0],
    });

    const response = await wall(matchId, caio);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("POOL_NOT_FOUND");
  });

  it("avisa quando o jogo não existe", async () => {
    const response = await wall(999_999);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("MATCH_NOT_FOUND");
  });
});
