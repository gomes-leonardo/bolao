import type {
  ApiError,
  PredictionView,
  RoundView,
} from "@bolao/core/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedMatch, seedPrediction, seedUser } from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

let app: TestApp;
let ana: number;

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
});

const predict = (matchId: number, body: unknown, as: number | null = ana) =>
  app.request<PredictionView & ApiError>(
    "PUT",
    `/matches/${matchId}/prediction`,
    {
      body,
      ...(as === null ? {} : { as }),
    },
  );

async function storedPredictions() {
  return app.db.prediction.findMany({
    select: { homeScore: true, awayScore: true },
  });
}

describe("PUT /matches/:id/prediction", () => {
  it("grava o palpite antes do apito", async () => {
    const matchId = await seedMatch(app.db, { kickoffInMinutes: 30 });

    const response = await predict(matchId, { home: 2, away: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ home: 2, away: 1, points: null });
  });

  it("edita o palpite sem duplicar", async () => {
    const matchId = await seedMatch(app.db, { kickoffInMinutes: 30 });
    await predict(matchId, { home: 2, away: 1 });

    const response = await predict(matchId, { home: 0, away: 0 });

    expect(response.body).toEqual({ home: 0, away: 0, points: null });
    expect(await storedPredictions()).toEqual([{ homeScore: 0, awayScore: 0 }]);
  });

  it("tranca o palpite depois do apito", async () => {
    const matchId = await seedMatch(app.db, { kickoffInMinutes: -1 });

    const response = await predict(matchId, { home: 2, away: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PREDICTION_LOCKED");
    expect(await storedPredictions()).toEqual([]);
  });

  it("não deixa editar um palpite já trancado", async () => {
    const matchId = await seedMatch(app.db, { kickoffInMinutes: -1 });
    await seedPrediction(app.db, ana, matchId, [2, 1]);

    const response = await predict(matchId, { home: 5, away: 0 });

    expect(response.status).toBe(409);
    expect(await storedPredictions()).toEqual([{ homeScore: 2, awayScore: 1 }]);
  });

  it.each(["postponed", "cancelled", "live"] as const)(
    "tranca jogo %s mesmo com horário no futuro",
    async (status) => {
      const matchId = await seedMatch(app.db, { kickoffInMinutes: 60, status });

      const response = await predict(matchId, { home: 1, away: 0 });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("PREDICTION_LOCKED");
    },
  );

  it("responde 404 para jogo que não existe", async () => {
    const response = await predict(999_999, { home: 1, away: 0 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("MATCH_NOT_FOUND");
  });

  it("valida o placar", async () => {
    const matchId = await seedMatch(app.db);

    const response = await predict(matchId, { home: -1, away: "dois" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(response.body.error.details?.map((detail) => detail.path)).toEqual([
      "home",
      "away",
    ]);
  });

  it("exige usuário autenticado", async () => {
    const matchId = await seedMatch(app.db);

    const response = await predict(matchId, { home: 1, away: 0 }, null);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /matches", () => {
  it("mostra a rodada do próximo jogo com o meu palpite e a trava", async () => {
    await seedMatch(app.db, {
      round: 27,
      kickoffInMinutes: -60 * 24 * 7,
      status: "finished",
      score: [1, 0],
    });
    const started = await seedMatch(app.db, {
      round: 28,
      kickoffInMinutes: -10,
      status: "live",
      score: [0, 0],
      home: "GAM",
      away: "DEL",
    });
    const open = await seedMatch(app.db, { round: 28, kickoffInMinutes: 120 });
    await seedPrediction(app.db, ana, open, [3, 1]);

    const response = await app.request<RoundView>("GET", "/matches", {
      as: ana,
    });

    expect(response.status).toBe(200);
    expect(response.body.round).toBe(28);
    expect(
      response.body.matches.map((match) => ({
        id: match.id,
        locked: match.locked,
        score: match.score,
        myPrediction: match.myPrediction,
      })),
    ).toEqual([
      {
        id: started,
        locked: true,
        score: { home: 0, away: 0 },
        myPrediction: null,
      },
      {
        id: open,
        locked: false,
        score: null,
        myPrediction: { home: 3, away: 1, points: null },
      },
    ]);
  });

  it("aceita uma rodada específica", async () => {
    const old = await seedMatch(app.db, {
      round: 27,
      kickoffInMinutes: -60 * 24,
      status: "finished",
      score: [2, 2],
    });
    await seedMatch(app.db, { round: 28 });

    const response = await app.request<RoundView>("GET", "/matches?round=27", {
      as: ana,
    });

    expect(response.body.matches.map((match) => match.id)).toEqual([old]);
  });
});
