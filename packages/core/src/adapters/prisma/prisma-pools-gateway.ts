import type { Db } from "../../db.ts";
import type {
  MemberRecord,
  PoolRecord,
  PoolsGateway,
} from "../../domain/pools/pools-gateway.ts";
import { violatedUniqueConstraint } from "./unique-constraint.ts";

export function createPrismaPoolsGateway(db: Db): PoolsGateway {
  return {
    async createWithInviteCode({ ownerId, name, season, inviteCode }) {
      try {
        return await db.pool.create({
          data: {
            name,
            inviteCode,
            ownerId,
            season,
            members: { create: { userId: ownerId } },
          },
          select: { id: true },
        });
      } catch (error) {
        // Saber que um P2002 nesta constraint significa "código já usado" é
        // conhecimento do Postgres, e para aqui. Quem chama recebe null e
        // decide o que fazer: a política de retry é do domínio.
        if (violatedUniqueConstraint(error) === "pools_invite_code_key") {
          return null;
        }
        throw error;
      }
    },

    async findIdByInviteCode(inviteCode) {
      const pool = await db.pool.findUnique({
        where: { inviteCode },
        select: { id: true },
      });
      return pool?.id ?? null;
    },

    async addMember(poolId, userId) {
      // INSERT ... ON CONFLICT DO NOTHING, numa operação só: dois cliques
      // simultâneos não viram erro 500, um entra e o outro recebe false.
      const { count } = await db.poolMember.createMany({
        data: [{ poolId, userId }],
        skipDuplicates: true,
      });
      return count > 0;
    },

    async deleteMembership(poolId, userId) {
      const { count } = await db.poolMember.deleteMany({
        where: { poolId, userId },
      });
      return count > 0;
    },

    async rename(poolId, name) {
      await db.pool.update({ where: { id: poolId }, data: { name } });
    },

    async deletePool(poolId) {
      await db.pool.delete({ where: { id: poolId } });
    },

    async poolsByIds(poolIds) {
      const pools = await db.pool.findMany({
        where: { id: { in: [...poolIds] } },
        select: {
          id: true,
          name: true,
          inviteCode: true,
          season: true,
          ownerId: true,
          _count: { select: { members: true } },
        },
      });
      return pools.map((pool): PoolRecord => ({
        id: pool.id,
        name: pool.name,
        inviteCode: pool.inviteCode,
        season: pool.season,
        ownerId: pool.ownerId,
        memberCount: pool._count.members,
      }));
    },

    countMemberships(userId) {
      return db.poolMember.count({ where: { userId } });
    },

    async membershipPoolIds(userId, skip, take) {
      const memberships = await db.poolMember.findMany({
        where: { userId },
        orderBy: [{ joinedAt: "desc" }, { poolId: "desc" }],
        skip,
        take,
        select: { poolId: true },
      });
      return memberships.map((membership) => membership.poolId);
    },

    countMembers(poolId) {
      return db.poolMember.count({ where: { poolId } });
    },

    async listMembers(poolId, skip, take) {
      const members = await db.poolMember.findMany({
        where: { poolId },
        orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
        skip,
        take,
        select: { joinedAt: true, user: { select: { id: true, name: true } } },
      });
      return members.map(({ joinedAt, user }): MemberRecord => ({
        id: user.id,
        name: user.name,
        joinedAt,
      }));
    },
  };
}
