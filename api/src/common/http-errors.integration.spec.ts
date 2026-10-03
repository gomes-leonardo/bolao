import type { ApiError } from "@bolao/core/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedUser } from "../test/fixtures.js";
import { createTestApp, type TestApp } from "../test/test-app.js";

let app: TestApp;
let ana: number;
let baseUrl: string;

beforeAll(async () => {
  app = await createTestApp();
  await app.reset();
  ana = await seedUser(app.db, "Ana");
  baseUrl = app.baseUrl;
});
afterAll(async () => {
  await app.reset();
  await app.close();
});

async function rawPost(path: string, body: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-dev-user-id": String(ana),
    },
    body,
  });
  return { status: response.status, body: (await response.json()) as ApiError };
}

describe("erros de HTTP padronizados", () => {
  it("recusa id maior que o limite do banco com 400", async () => {
    const response = await app.request<ApiError>("GET", "/pools/3000000000", {
      as: ana,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      { path: "id", message: "Id inválido." },
    ]);
  });

  it("responde 400 em português para JSON malformado", async () => {
    const response = await rawPost("/pools", "{nome: ");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "VALIDATION_FAILED",
      message: "JSON inválido.",
    });
  });

  it("responde 413 para corpo grande demais", async () => {
    const response = await rawPost(
      "/pools",
      JSON.stringify({ name: "x".repeat(200_000) }),
    );

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
