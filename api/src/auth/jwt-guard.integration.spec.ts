import type {
  ApiError,
  Paginated,
  PoolSummary,
  UserView,
} from "@bolao/core/contracts";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedPool, seedUser } from "../test/fixtures.js";
import {
  createTestApp,
  TEST_JWT_SECRET,
  type TestApp,
} from "../test/test-app.js";

let app: TestApp;
let bia: number;
let caio: number;

const encode = (secret: string) => new TextEncoder().encode(secret);

const sign = (
  sub: number,
  {
    secret = TEST_JWT_SECRET,
    expiresIn = "15m",
    alg = "HS256",
  }: { secret?: string; expiresIn?: string; alg?: "HS256" | "HS512" } = {},
): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg })
    .setSubject(String(sub))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encode(secret));

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.reset();
  await app.close();
});
beforeEach(async () => {
  await app.reset();
  bia = await seedUser(app.db, "Bia");
  caio = await seedUser(app.db, "Caio");
});

describe("JwtAuthGuard nas rotas protegidas", () => {
  it("recusa GET /pools e GET /me sem token", async () => {
    const pools = await app.request<ApiError>("GET", "/pools");
    const me = await app.request<ApiError>("GET", "/me");

    expect(pools.status).toBe(401);
    expect(pools.body.error.code).toBe("UNAUTHENTICATED");
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("recusa token expirado", async () => {
    const token = await sign(bia, { expiresIn: "-1s" });

    const response = await app.request<ApiError>("GET", "/pools", { token });

    expect(response.status).toBe(401);
  });

  it("recusa token assinado com outro segredo", async () => {
    const token = await sign(bia, {
      secret: "outro-segredo-com-32-caracteres-aqui",
    });

    const response = await app.request<ApiError>("GET", "/pools", { token });

    expect(response.status).toBe(401);
  });

  it("recusa token HS512 assinado com o mesmo segredo", async () => {
    const token = await sign(bia, { alg: "HS512" });

    const response = await app.request<ApiError>("GET", "/pools", { token });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("recusa payload adulterado, mesmo com a assinatura original", async () => {
    const token = await sign(bia);
    const [header, , signature] = token.split(".");
    const payload = Buffer.from(JSON.stringify({ sub: String(caio) })).toString(
      "base64url",
    );

    const response = await app.request<ApiError>("GET", "/pools", {
      token: `${header}.${payload}.${signature}`,
    });

    expect(response.status).toBe(401);
  });

  it("autentica o dono do token válido", async () => {
    const mine = await seedPool(app.db, bia, { name: "Da Bia" });
    await seedPool(app.db, caio, { name: "Do Caio" });
    const token = await sign(bia);

    const pools = await app.request<Paginated<PoolSummary>>("GET", "/pools", {
      token,
    });
    const me = await app.request<UserView>("GET", "/me", { token });

    expect(pools.status).toBe(200);
    expect(pools.body.data.map((pool) => pool.id)).toEqual([mine.id]);
    expect(me.body.id).toBe(bia);
    expect(me.body.name).toBe("Bia");
  });

  it("X-Dev-User-Id autentica só com AUTH_MODE=dev", async () => {
    await seedPool(app.db, bia);

    const withDev = await app.request<Paginated<PoolSummary>>("GET", "/pools", {
      as: bia,
    });
    expect(withDev.status).toBe(200);

    delete process.env["AUTH_MODE"];
    try {
      const withoutDev = await app.request<ApiError>("GET", "/pools", {
        as: bia,
      });
      expect(withoutDev.status).toBe(401);
      expect(withoutDev.body.error.code).toBe("UNAUTHENTICATED");
    } finally {
      process.env["AUTH_MODE"] = "dev";
    }
  });
});
