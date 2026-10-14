import { describe, expect, it } from "vitest";
import { fakePoolsGateway } from "./__fixtures__/fake-pools-gateway.ts";
import { joinPool } from "./join-pool.ts";
import { AlreadyMemberError, InviteCodeNotFoundError } from "./pool-errors.ts";

describe("joinPool", () => {
  it("entra no bolão do código e devolve o id", async () => {
    const gateway = fakePoolsGateway({ poolIdByInviteCode: 42, joined: true });

    await expect(joinPool(gateway, "ABCD2345", 9)).resolves.toEqual({
      poolId: 42,
    });
    expect(gateway.addCalls).toEqual([{ poolId: 42, userId: 9 }]);
  });

  it("código inexistente recusa sem tentar inserir", async () => {
    const gateway = fakePoolsGateway({ poolIdByInviteCode: null });

    await expect(joinPool(gateway, "ZZZZ9999", 9)).rejects.toBeInstanceOf(
      InviteCodeNotFoundError,
    );
    expect(gateway.addCalls).toEqual([]);
  });

  it("quem já é membro recebe conflito, não um segundo ingresso", async () => {
    const gateway = fakePoolsGateway({ poolIdByInviteCode: 42, joined: false });

    await expect(joinPool(gateway, "ABCD2345", 9)).rejects.toBeInstanceOf(
      AlreadyMemberError,
    );
  });
});
