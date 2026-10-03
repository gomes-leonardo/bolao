import type {
  ApiError,
  MemberView,
  Paginated,
  PoolSummary,
} from "@bolao/core/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  seedMatch,
  seedPool,
  seedPrediction,
  seedUser,
} from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

type Body<T> = T & ApiError;

let app: TestApp;
let ana: number;
let beto: number;
let caio: number;

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
});

describe("POST /pools", () => {
  it("cria o bolão com código de convite e o dono como membro", async () => {
    const response = await app.request<Body<PoolSummary>>("POST", "/pools", {
      as: ana,
      body: { name: "  Resenha do Trampo  " },
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Resenha do Trampo",
      season: 2026,
      isOwner: true,
      memberCount: 1,
      myPosition: 1,
      myPoints: 0,
    });
    expect(response.body.inviteCode).toMatch(
      /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/,
    );
  });

  it("recusa nome vazio", async () => {
    const response = await app.request<Body<PoolSummary>>("POST", "/pools", {
      as: ana,
      body: { name: "   " },
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      { path: "name", message: "Dá um nome pro bolão." },
    ]);
  });
});

describe("GET /pools", () => {
  it("lista só os meus bolões, paginados, com minha posição e palpites pendentes", async () => {
    const resenha = await seedPool(app.db, ana, {
      name: "Resenha",
      memberIds: [beto],
    });
    await seedPool(app.db, beto, { name: "Cornetas", memberIds: [ana] });
    await seedPool(app.db, ana, { name: "Fut de Quinta" });
    await seedPool(app.db, caio, { name: "Alheio" });
    const finished = await seedMatch(app.db, {
      kickoffInMinutes: -120,
      status: "finished",
      score: [1, 0],
    });
    await seedPrediction(app.db, beto, finished, [1, 0], 3);
    await seedPrediction(app.db, ana, finished, [2, 0], 1);
    const open = await seedMatch(app.db, { kickoffInMinutes: 60 });
    await seedMatch(app.db, { kickoffInMinutes: 90 });
    await seedPrediction(app.db, ana, open, [1, 1]);

    const firstPage = await app.request<Paginated<PoolSummary>>(
      "GET",
      "/pools?pageSize=2",
      { as: ana },
    );
    const secondPage = await app.request<Paginated<PoolSummary>>(
      "GET",
      "/pools?pageSize=2&page=2",
      {
        as: ana,
      },
    );

    expect(firstPage.body.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    const names = [...firstPage.body.data, ...secondPage.body.data].map(
      (pool) => pool.name,
    );
    expect(names.sort()).toEqual(["Cornetas", "Fut de Quinta", "Resenha"]);
    const resenhaSummary = [
      ...firstPage.body.data,
      ...secondPage.body.data,
    ].find((pool) => pool.id === resenha.id);
    expect(resenhaSummary).toMatchObject({
      memberCount: 2,
      myPosition: 2,
      myPoints: 1,
      pendingPredictions: 1,
    });
  });
});

describe("acesso ao bolão", () => {
  it("esconde o bolão de quem não é membro", async () => {
    const pool = await seedPool(app.db, ana);

    const response = await app.request<ApiError>("GET", `/pools/${pool.id}`, {
      as: caio,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("POOL_NOT_FOUND");
  });

  it("só o dono renomeia", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const byMember = await app.request<ApiError>("PATCH", `/pools/${pool.id}`, {
      as: beto,
      body: { name: "Golpe" },
    });
    const byOwner = await app.request<PoolSummary>(
      "PATCH",
      `/pools/${pool.id}`,
      {
        as: ana,
        body: { name: "Resenha 2.0" },
      },
    );

    expect(byMember.status).toBe(403);
    expect(byMember.body.error.code).toBe("NOT_OWNER");
    expect(byOwner.status).toBe(200);
    expect(byOwner.body.name).toBe("Resenha 2.0");
  });

  it("só o dono apaga", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const byMember = await app.request("DELETE", `/pools/${pool.id}`, {
      as: beto,
    });
    const byOwner = await app.request("DELETE", `/pools/${pool.id}`, {
      as: ana,
    });
    const afterwards = await app.request("GET", `/pools/${pool.id}`, {
      as: ana,
    });

    expect(byMember.status).toBe(403);
    expect(byOwner.status).toBe(204);
    expect(afterwards.status).toBe(404);
  });
});

describe("POST /pools/join", () => {
  it("entra pelo código, sem diferenciar maiúsculas", async () => {
    const pool = await seedPool(app.db, ana);

    const response = await app.request<PoolSummary>("POST", "/pools/join", {
      as: beto,
      body: { inviteCode: pool.inviteCode.toLowerCase() },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: pool.id,
      isOwner: false,
      memberCount: 2,
    });
  });

  it("não entra duas vezes", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const response = await app.request<ApiError>("POST", "/pools/join", {
      as: beto,
      body: { inviteCode: pool.inviteCode },
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ALREADY_MEMBER");
  });

  it("dois cliques simultâneos: um entra, o outro recebe 409", async () => {
    const pool = await seedPool(app.db, ana);
    const join = () =>
      app.request<ApiError>("POST", "/pools/join", {
        as: beto,
        body: { inviteCode: pool.inviteCode },
      });

    const responses = await Promise.all([join(), join(), join()]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409, 409,
    ]);
    expect(await app.db.poolMember.count({ where: { poolId: pool.id } })).toBe(
      2,
    );
  });

  it("avisa quando o código não existe", async () => {
    const response = await app.request<ApiError>("POST", "/pools/join", {
      as: beto,
      body: { inviteCode: "ZZZZ9999" },
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("POOL_NOT_FOUND");
  });
});

describe("membros", () => {
  it("lista os membros com o dono marcado", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const response = await app.request<Paginated<MemberView>>(
      "GET",
      `/pools/${pool.id}/members`,
      {
        as: beto,
      },
    );

    expect(
      response.body.data.map(({ name, isOwner }) => ({ name, isOwner })),
    ).toEqual([
      { name: "Ana", isOwner: true },
      { name: "Beto", isOwner: false },
    ]);
    expect(response.body.meta.total).toBe(2);
  });

  it("membro sai do bolão", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const response = await app.request(
      "DELETE",
      `/pools/${pool.id}/members/${beto}`,
      { as: beto },
    );

    expect(response.status).toBe(204);
    expect(await app.db.poolMember.count({ where: { poolId: pool.id } })).toBe(
      1,
    );
  });

  it("membro não remove outro membro", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto, caio] });

    const response = await app.request<ApiError>(
      "DELETE",
      `/pools/${pool.id}/members/${caio}`,
      {
        as: beto,
      },
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("NOT_OWNER");
  });

  it("dono remove membro", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const response = await app.request(
      "DELETE",
      `/pools/${pool.id}/members/${beto}`,
      { as: ana },
    );

    expect(response.status).toBe(204);
  });

  it("dono não sai do próprio bolão", async () => {
    const pool = await seedPool(app.db, ana, { memberIds: [beto] });

    const response = await app.request<ApiError>(
      "DELETE",
      `/pools/${pool.id}/members/${ana}`,
      {
        as: ana,
      },
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("OWNER_CANNOT_LEAVE");
  });

  it("avisa quando a pessoa não está no bolão", async () => {
    const pool = await seedPool(app.db, ana);

    const response = await app.request<ApiError>(
      "DELETE",
      `/pools/${pool.id}/members/${caio}`,
      {
        as: ana,
      },
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("MEMBER_NOT_FOUND");
  });
});
