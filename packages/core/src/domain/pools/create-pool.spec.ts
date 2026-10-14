import { describe, expect, it } from "vitest";
import { fakePoolsGateway } from "./__fixtures__/fake-pools-gateway.ts";
import { MAX_INVITE_CODE_ATTEMPTS, createPool } from "./create-pool.ts";
import { InviteCodeExhaustedError } from "./pool-errors.ts";

const command = { ownerId: 7, name: "Resenha do Trampo", season: 2026 };

/** Um código novo por chamada, para o spec poder afirmar que não repetiu. */
const codes = () => {
  let n = 0;
  return () => `CODIGO${(n += 1)}`;
};

describe("createPool", () => {
  it("cria de primeira e chama a porta uma vez só", async () => {
    const gateway = fakePoolsGateway({ createdId: 42 });

    await expect(createPool(gateway, command, codes())).resolves.toEqual({
      id: 42,
    });
    expect(gateway.createCalls).toHaveLength(1);
  });

  it("passa dono, nome e temporada para a porta", async () => {
    const gateway = fakePoolsGateway({ createdId: 42 });

    await createPool(gateway, command, () => "CODIGO1");

    expect(gateway.createCalls).toEqual([
      { ...command, inviteCode: "CODIGO1" },
    ]);
  });

  it("duas colisões e ele acerta na terceira", async () => {
    const gateway = fakePoolsGateway({ collisions: 2, createdId: 42 });

    await expect(createPool(gateway, command, codes())).resolves.toEqual({
      id: 42,
    });
    expect(gateway.createCalls).toHaveLength(3);
  });

  it("gera um código novo a cada tentativa, nunca repete", async () => {
    // O caso que a política existe para garantir: tentar de novo com o mesmo
    // código colidiria para sempre. Se `newInviteCode` fosse um dado pronto em
    // vez de um colaborador, este caso falharia.
    const gateway = fakePoolsGateway({ collisions: 2, createdId: 42 });

    await createPool(gateway, command, codes());

    const usados = gateway.createCalls.map((call) => call.inviteCode);
    expect(usados).toEqual(["CODIGO1", "CODIGO2", "CODIGO3"]);
    expect(new Set(usados).size).toBe(3);
  });

  it("colidindo sempre, desiste em exatamente cinco tentativas", async () => {
    const gateway = fakePoolsGateway({ alwaysCollides: true });

    await expect(createPool(gateway, command, codes())).rejects.toBeInstanceOf(
      InviteCodeExhaustedError,
    );
    expect(gateway.createCalls).toHaveLength(MAX_INVITE_CODE_ATTEMPTS);
    expect(MAX_INVITE_CODE_ATTEMPTS).toBe(5);
  });
});
