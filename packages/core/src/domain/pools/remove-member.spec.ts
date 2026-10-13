import { describe, expect, it } from "vitest";
import { fakeMembershipGateway } from "../membership/__fixtures__/fake-membership-gateway.ts";
import { PoolNotVisibleError } from "../membership/membership-errors.ts";
import { fakePoolsGateway } from "./__fixtures__/fake-pools-gateway.ts";
import {
  CannotRemoveOtherMemberError,
  OwnerCannotLeaveError,
  PoolMemberNotFoundError,
} from "./pool-errors.ts";
import { removePoolMember } from "./remove-member.ts";

const pool = { id: 42, ownerId: 7, season: 2026 };

const gateways = (
  setup: Parameters<typeof fakePoolsGateway>[0] = {},
  visible = true,
) => ({
  pools: fakePoolsGateway(setup),
  membership: fakeMembershipGateway(visible ? { pool } : {}),
});

describe("removePoolMember", () => {
  it("o dono remove qualquer membro", async () => {
    const g = gateways({ removed: true });

    await expect(
      removePoolMember(g, { actorId: 7, poolId: 42, memberId: 9 }),
    ).resolves.toBeUndefined();
    expect(g.pools.removeCalls).toEqual([{ poolId: 42, userId: 9 }]);
  });

  it("o membro sai sozinho", async () => {
    const g = gateways({ removed: true });

    await expect(
      removePoolMember(g, { actorId: 9, poolId: 42, memberId: 9 }),
    ).resolves.toBeUndefined();
    expect(g.pools.removeCalls).toEqual([{ poolId: 42, userId: 9 }]);
  });

  it("membro comum não remove outro, e nada é removido", async () => {
    const g = gateways();

    await expect(
      removePoolMember(g, { actorId: 9, poolId: 42, memberId: 11 }),
    ).rejects.toBeInstanceOf(CannotRemoveOtherMemberError);
    expect(g.pools.removeCalls).toEqual([]);
  });

  it("o dono não sai do próprio bolão, e nada é removido", async () => {
    const g = gateways();

    await expect(
      removePoolMember(g, { actorId: 7, poolId: 42, memberId: 7 }),
    ).rejects.toBeInstanceOf(OwnerCannotLeaveError);
    expect(g.pools.removeCalls).toEqual([]);
  });

  it("o dono saindo recebe a explicação, não um 403", async () => {
    // A ordem das recusas é regra: o dono TEM permissão, então checar
    // permissão antes de checar "o dono não sai" daria o erro errado.
    const g = gateways();

    await expect(
      removePoolMember(g, { actorId: 7, poolId: 42, memberId: 7 }),
    ).rejects.not.toBeInstanceOf(CannotRemoveOtherMemberError);
  });

  it("quem não está no bolão não pode ser removido", async () => {
    const g = gateways({ removed: false });

    await expect(
      removePoolMember(g, { actorId: 7, poolId: 42, memberId: 99 }),
    ).rejects.toBeInstanceOf(PoolMemberNotFoundError);
  });

  it("não-membro é recusado por invisibilidade, antes de qualquer outra coisa", async () => {
    const g = gateways({}, false);

    await expect(
      removePoolMember(g, { actorId: 500, poolId: 42, memberId: 9 }),
    ).rejects.toBeInstanceOf(PoolNotVisibleError);
    expect(g.pools.removeCalls).toEqual([]);
  });
});
