import {
  createPrismaMembershipGateway,
  createPrismaPoolsGateway,
  type Db,
} from "@bolao/core";
import {
  createPool,
  joinPool,
  removePoolMember,
  type MemberRecord,
  type PoolRecord,
} from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";
import { generateInviteCode } from "./invite-code.js";

export const POOLS = Symbol("POOLS");

export interface Pools {
  create(command: {
    ownerId: number;
    name: string;
    season: number;
  }): Promise<{ id: number }>;
  join(inviteCode: string, userId: number): Promise<{ poolId: number }>;
  removeMember(command: {
    actorId: number;
    poolId: number;
    memberId: number;
  }): Promise<void>;
  rename(poolId: number, name: string): Promise<void>;
  deletePool(poolId: number): Promise<void>;
  poolsByIds(poolIds: readonly number[]): Promise<PoolRecord[]>;
  countMemberships(userId: number): Promise<number>;
  membershipPoolIds(
    userId: number,
    skip: number,
    take: number,
  ): Promise<number[]>;
  countMembers(poolId: number): Promise<number>;
  listMembers(
    poolId: number,
    skip: number,
    take: number,
  ): Promise<MemberRecord[]>;
}

/**
 * Liga a porta dos bolões ao adapter do Prisma e entrega os casos de uso já
 * amarrados nela.
 *
 * `generateInviteCode` é injetado aqui porque ele importa `node:crypto`, que a
 * cerca do domínio barra — e com razão: aleatoriedade é infraestrutura. O
 * domínio recebe a função como colaborador e decide quantas vezes chamá-la.
 *
 * Os três casos de uso entram amarrados, e as leituras sem decisão passam
 * direto. `createWithInviteCode` e `addMember` ficam fora do alcance da borda
 * de propósito: os dois devolvem resultado em vez de lançar, e chamá-los sem a
 * política em volta perderia o retry e o conflito de membro repetido.
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const poolsProvider: Provider = {
  provide: POOLS,
  inject: [DB],
  useFactory: (db: Db): Pools => {
    const pools = createPrismaPoolsGateway(db);
    const membership = createPrismaMembershipGateway(db);

    return {
      create: (command) => createPool(pools, command, generateInviteCode),
      join: (inviteCode, userId) => joinPool(pools, inviteCode, userId),
      removeMember: (command) =>
        removePoolMember({ pools, membership }, command),
      rename: (poolId, name) => pools.rename(poolId, name),
      deletePool: (poolId) => pools.deletePool(poolId),
      poolsByIds: (poolIds) => pools.poolsByIds(poolIds),
      countMemberships: (userId) => pools.countMemberships(userId),
      membershipPoolIds: (userId, skip, take) =>
        pools.membershipPoolIds(userId, skip, take),
      countMembers: (poolId) => pools.countMembers(poolId),
      listMembers: (poolId, skip, take) =>
        pools.listMembers(poolId, skip, take),
    };
  },
};
