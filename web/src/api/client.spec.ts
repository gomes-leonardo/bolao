import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, writeSession } from "../auth/session";
import { ApiRequestError, apiRequest } from "./client";

function makeSut(response: Response | Error) {
  const fetchImpl = vi.fn<typeof fetch>();
  if (response instanceof Error) fetchImpl.mockRejectedValue(response);
  else fetchImpl.mockResolvedValue(response);
  return { fetchImpl };
}

const errorOf = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

describe("apiRequest", () => {
  afterEach(() => clearSession());

  it("envia o usuário de dev no header", async () => {
    writeSession({ kind: "dev", userId: 7 });
    const { fetchImpl } = makeSut(Response.json({ ok: true }));

    await apiRequest("/me", { fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:3333/api/me");
    expect(init?.headers).toEqual({ "X-Dev-User-Id": "7" });
  });

  it("envia o token como Bearer e o corpo em JSON", async () => {
    writeSession({ kind: "token", accessToken: "abc" });
    const { fetchImpl } = makeSut(Response.json({}));

    await apiRequest("/pools", {
      method: "POST",
      body: { name: "Resenha" },
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0] ?? [];
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer abc",
        "Content-Type": "application/json",
      },
      body: '{"name":"Resenha"}',
    });
  });

  it("transforma o erro padronizado da API em ApiRequestError", async () => {
    const { fetchImpl } = makeSut(
      Response.json(
        {
          error: {
            code: "PREDICTION_LOCKED",
            message: "Bola rolou, palpite trancado.",
          },
        },
        { status: 409 },
      ),
    );

    const error = await errorOf(
      apiRequest("/matches/1/prediction", { fetchImpl }),
    );

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 409,
      code: "PREDICTION_LOCKED",
      message: "Bola rolou, palpite trancado.",
    });
  });

  it("avisa quando a API está fora do ar", async () => {
    const { fetchImpl } = makeSut(new TypeError("Failed to fetch"));

    const error = await errorOf(apiRequest("/me", { fetchImpl }));

    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("devolve undefined para 204", async () => {
    const { fetchImpl } = makeSut(new Response(null, { status: 204 }));

    await expect(
      apiRequest("/pools/1", { method: "DELETE", fetchImpl }),
    ).resolves.toBeUndefined();
  });
});
