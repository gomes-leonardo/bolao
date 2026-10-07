import { hashPassword } from "@bolao/core/auth";
import type {
  ApiError,
  AuthSession,
  Paginated,
  PoolSummary,
} from "@bolao/core/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedUser } from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

type Body<T> = T & ApiError;

const PASSWORD = "carimbou123";

let app: TestApp;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.reset();
  await app.close();
});
beforeEach(async () => {
  await app.reset();
});

describe("POST /auth/register", () => {
  it("cria a conta, devolve a sessão e o token abre uma rota protegida", async () => {
    const response = await app.request<AuthSession>("POST", "/auth/register", {
      body: { name: "Leo", email: "leo@resenha.com", password: PASSWORD },
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: "Leo",
      email: "leo@resenha.com",
    });
    expect(response.body.user).not.toHaveProperty("password");
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(typeof response.body.accessToken).toBe("string");

    const pools = await app.request<Paginated<PoolSummary>>("GET", "/pools", {
      token: response.body.accessToken,
    });
    expect(pools.status).toBe(200);
    expect(pools.body.data).toEqual([]);
  });

  it("guarda a senha hasheada, nunca em claro", async () => {
    await app.request("POST", "/auth/register", {
      body: { name: "Leo", email: "leo@resenha.com", password: PASSWORD },
    });

    const stored = await app.db.user.findUnique({
      where: { email: "leo@resenha.com" },
      select: { passwordHash: true },
    });
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("recusa e-mail já usado, sem diferenciar maiúsculas", async () => {
    await app.request("POST", "/auth/register", {
      body: { name: "Leo", email: "leo@resenha.com", password: PASSWORD },
    });

    const response = await app.request<ApiError>("POST", "/auth/register", {
      body: { name: "Leo", email: "Leo@Resenha.com", password: PASSWORD },
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("valida nome, e-mail e senha com details por campo", async () => {
    const response = await app.request<ApiError>("POST", "/auth/register", {
      body: { name: "   ", email: "sem-arroba", password: "123" },
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_FAILED");
    expect(
      response.body.error.details?.map((detail) => detail.path).sort(),
    ).toEqual(["email", "name", "password"]);
  });
});

describe("POST /auth/login", () => {
  let leoId: number;

  beforeEach(async () => {
    leoId = await seedUser(app.db, "Leo");
    await app.db.user.update({
      where: { id: leoId },
      data: {
        email: "leo@resenha.com",
        passwordHash: await hashPassword(PASSWORD, 4),
      },
    });
  });

  it("entra com a senha certa e devolve a sessão sem o hash", async () => {
    const response = await app.request<AuthSession>("POST", "/auth/login", {
      body: { email: "leo@resenha.com", password: PASSWORD },
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: leoId,
      name: "Leo",
      email: "leo@resenha.com",
    });
    expect(typeof response.body.accessToken).toBe("string");
  });

  it("senha errada e e-mail inexistente devolvem a mesma resposta", async () => {
    const wrong = await app.request<Body<AuthSession>>("POST", "/auth/login", {
      body: { email: "leo@resenha.com", password: "senha-errada" },
    });
    const miss = await app.request<Body<AuthSession>>("POST", "/auth/login", {
      body: { email: "ninguem@resenha.com", password: "senha-errada" },
    });

    expect(wrong.status).toBe(401);
    expect(miss.status).toBe(401);
    expect(wrong.body).toEqual(miss.body);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("não deixa o tempo de resposta distinguir os dois ramos", async () => {
    const measure = async (email: string) => {
      const started = performance.now();
      await app.request("POST", "/auth/login", {
        body: { email, password: "senha-errada" },
      });
      return performance.now() - started;
    };
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)] ?? 0;
    };

    await measure("leo@resenha.com");
    await measure("ninguem@resenha.com");

    const wrong: number[] = [];
    const miss: number[] = [];
    for (let i = 0; i < 15; i++) {
      wrong.push(await measure("leo@resenha.com"));
      miss.push(await measure("ninguem@resenha.com"));
    }

    const ratio = median(wrong) / median(miss);
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(4);
  });
});

describe("rotas públicas", () => {
  it("health e as rotas de auth respondem sem token (não são 401)", async () => {
    const health = await app.request("GET", "/health");
    const register = await app.request("POST", "/auth/register", { body: {} });
    const login = await app.request("POST", "/auth/login", { body: {} });

    expect(health.status).toBe(200);
    expect(register.status).toBe(400);
    expect(login.status).toBe(400);
  });
});
