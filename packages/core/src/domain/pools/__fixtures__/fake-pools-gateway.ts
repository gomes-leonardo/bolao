import type {
  CreatePoolCommand,
  MemberRecord,
  PoolRecord,
  PoolsGateway,
} from "../pools-gateway.ts";

/**
 * Fake da porta de bolões, escrito à mão.
 *
 * Guarda as chamadas porque metade do que se prova aqui é sobre elas: que o
 * retry gerou códigos **distintos**, que foram exatamente cinco tentativas, e
 * que a remoção **não** foi chamada nos ramos recusados.
 */
export interface FakePoolsGateway extends PoolsGateway {
  readonly createCalls: CreatePoolCommand[];
  readonly addCalls: { poolId: number; userId: number }[];
  readonly removeCalls: { poolId: number; userId: number }[];
}

export interface FakePoolsSetup {
  /** Quantas das primeiras tentativas de criar colidem antes de dar certo. */
  collisions?: number;
  /** Toda tentativa colide: o retry esgota. */
  alwaysCollides?: boolean;
  createdId?: number;
  poolIdByInviteCode?: number | null;
  joined?: boolean;
  removed?: boolean;
  pools?: PoolRecord[];
  members?: MemberRecord[];
  total?: number;
}

export function fakePoolsGateway(setup: FakePoolsSetup = {}): FakePoolsGateway {
  const createCalls: CreatePoolCommand[] = [];
  const addCalls: { poolId: number; userId: number }[] = [];
  const removeCalls: { poolId: number; userId: number }[] = [];

  return {
    createCalls,
    addCalls,
    removeCalls,
    createWithInviteCode(command) {
      createCalls.push(command);
      if (setup.alwaysCollides) return Promise.resolve(null);
      if (createCalls.length <= (setup.collisions ?? 0)) {
        return Promise.resolve(null);
      }
      return Promise.resolve({ id: setup.createdId ?? 1 });
    },
    findIdByInviteCode() {
      return Promise.resolve(setup.poolIdByInviteCode ?? null);
    },
    addMember(poolId, userId) {
      addCalls.push({ poolId, userId });
      return Promise.resolve(setup.joined ?? true);
    },
    removeMember(poolId, userId) {
      removeCalls.push({ poolId, userId });
      return Promise.resolve(setup.removed ?? true);
    },
    rename() {
      return Promise.resolve();
    },
    deletePool() {
      return Promise.resolve();
    },
    poolsByIds() {
      return Promise.resolve(setup.pools ?? []);
    },
    countMemberships() {
      return Promise.resolve(setup.total ?? 0);
    },
    membershipPoolIds() {
      return Promise.resolve((setup.pools ?? []).map((pool) => pool.id));
    },
    countMembers() {
      return Promise.resolve(setup.total ?? 0);
    },
    listMembers() {
      return Promise.resolve(setup.members ?? []);
    },
  };
}
