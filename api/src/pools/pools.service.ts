import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type {
  MemberView,
  Paginated,
  PaginationInput,
  PoolSummary,
  RankingView,
} from "@bolao/core/contracts";
import { Prisma } from "@bolao/core/prisma";
import { conflict, forbidden, notFound } from "../common/errors.js";
import { paginated, skipOf } from "../common/pagination.js";
import { currentSeason } from "../common/season.js";
import { DB } from "../db/db.module.js";
import { MatchesService } from "../matches/matches.service.js";
import { MembershipService } from "../membership/membership.service.js";
import { RankingService } from "../ranking/ranking.service.js";
import { generateInviteCode } from "./invite-code.js";

const MAX_INVITE_CODE_ATTEMPTS = 5;

const isUniqueViolation = (error: unknown, field: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002" &&
  JSON.stringify(error.meta ?? {}).includes(field);

@Injectable()
export class PoolsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: MembershipService,
    private readonly ranking: RankingService,
    private readonly matches: MatchesService,
  ) {}

  async create(userId: number, name: string): Promise<PoolSummary> {
    for (let attempt = 1; ; attempt++) {
      try {
        const pool = await this.db.pool.create({
          data: {
            name,
            inviteCode: generateInviteCode(),
            ownerId: userId,
            season: currentSeason(),
            members: { create: { userId } },
          },
          select: { id: true },
        });
        return this.summary(userId, pool.id);
      } catch (error) {
        if (
          !isUniqueViolation(error, "invite_code") ||
          attempt >= MAX_INVITE_CODE_ATTEMPTS
        ) {
          throw error;
        }
      }
    }
  }

  async list(
    userId: number,
    pagination: PaginationInput,
  ): Promise<Paginated<PoolSummary>> {
    const where = { userId };
    const [total, memberships] = await Promise.all([
      this.db.poolMember.count({ where }),
      this.db.poolMember.findMany({
        where,
        orderBy: [{ joinedAt: "desc" }, { poolId: "desc" }],
        skip: skipOf(pagination),
        take: pagination.pageSize,
        select: { poolId: true },
      }),
    ]);
    const summaries = await this.summaries(
      userId,
      memberships.map((membership) => membership.poolId),
    );
    return paginated(summaries, total, pagination);
  }

  async get(userId: number, poolId: number): Promise<PoolSummary> {
    await this.membership.requireMember(poolId, userId);
    return this.summary(userId, poolId);
  }

  async rename(
    userId: number,
    poolId: number,
    name: string,
  ): Promise<PoolSummary> {
    await this.membership.requireOwner(poolId, userId);
    await this.db.pool.update({ where: { id: poolId }, data: { name } });
    return this.summary(userId, poolId);
  }

  async remove(userId: number, poolId: number): Promise<void> {
    await this.membership.requireOwner(poolId, userId);
    await this.db.pool.delete({ where: { id: poolId } });
  }

  async join(userId: number, inviteCode: string): Promise<PoolSummary> {
    const pool = await this.db.pool.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        members: { where: { userId }, select: { userId: true } },
      },
    });
    if (!pool)
      throw notFound("POOL_NOT_FOUND", "Nenhum bolão com esse código.");
    if (pool.members.length > 0) throw this.alreadyMember();

    try {
      await this.db.poolMember.create({ data: { poolId: pool.id, userId } });
    } catch (error) {
      if (isUniqueViolation(error, "pool_id")) throw this.alreadyMember();
      throw error;
    }
    return this.summary(userId, pool.id);
  }

  async members(
    userId: number,
    poolId: number,
    pagination: PaginationInput,
  ): Promise<Paginated<MemberView>> {
    const pool = await this.membership.requireMember(poolId, userId);
    const where = { poolId };
    const [total, members] = await Promise.all([
      this.db.poolMember.count({ where }),
      this.db.poolMember.findMany({
        where,
        orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
        skip: skipOf(pagination),
        take: pagination.pageSize,
        select: { joinedAt: true, user: { select: { id: true, name: true } } },
      }),
    ]);
    return paginated(
      members.map(({ joinedAt, user }) => ({
        id: user.id,
        name: user.name,
        isOwner: user.id === pool.ownerId,
        joinedAt: joinedAt.toISOString(),
      })),
      total,
      pagination,
    );
  }

  /** O dono remove qualquer membro; o membro pode sair sozinho; o dono não sai. */
  async removeMember(
    actorId: number,
    poolId: number,
    memberId: number,
  ): Promise<void> {
    const pool = await this.membership.requireMember(poolId, actorId);
    if (memberId === pool.ownerId) {
      throw conflict(
        "OWNER_CANNOT_LEAVE",
        "O dono não sai do próprio bolão. Se quiser acabar com ele, apaga o bolão.",
      );
    }
    if (actorId !== memberId && actorId !== pool.ownerId) {
      throw forbidden(
        "NOT_OWNER",
        "Só o dono do bolão pode remover outros membros.",
      );
    }
    const { count } = await this.db.poolMember.deleteMany({
      where: { poolId, userId: memberId },
    });
    if (count === 0)
      throw notFound("MEMBER_NOT_FOUND", "Essa pessoa não está no bolão.");
  }

  async rankingOf(
    userId: number,
    poolId: number,
    round?: number,
  ): Promise<RankingView> {
    const pool = await this.membership.requireMember(poolId, userId);
    const standings = await this.ranking.standings([poolId], round);
    return {
      poolId,
      season: pool.season,
      round: round ?? null,
      entries: standings.get(poolId) ?? [],
    };
  }

  private async summary(userId: number, poolId: number): Promise<PoolSummary> {
    const [summary] = await this.summaries(userId, [poolId]);
    if (!summary) throw notFound("POOL_NOT_FOUND", "Bolão não encontrado.");
    return summary;
  }

  private async summaries(
    userId: number,
    poolIds: number[],
  ): Promise<PoolSummary[]> {
    const [pools, standings] = await Promise.all([
      this.db.pool.findMany({
        where: { id: { in: poolIds } },
        select: {
          id: true,
          name: true,
          inviteCode: true,
          season: true,
          ownerId: true,
          _count: { select: { members: true } },
        },
      }),
      this.ranking.standings(poolIds),
    ]);

    const pendingBySeason = new Map<number, number>();
    for (const season of new Set(pools.map((pool) => pool.season))) {
      pendingBySeason.set(
        season,
        await this.matches.pendingPredictions(userId, season),
      );
    }

    const byId = new Map(pools.map((pool) => [pool.id, pool]));
    return poolIds.flatMap((id) => {
      const pool = byId.get(id);
      if (!pool) return [];
      const mine = standings.get(id)?.find((entry) => entry.user.id === userId);
      return [
        {
          id: pool.id,
          name: pool.name,
          inviteCode: pool.inviteCode,
          season: pool.season,
          isOwner: pool.ownerId === userId,
          memberCount: pool._count.members,
          myPosition: mine?.position ?? 0,
          myPoints: mine?.points ?? 0,
          pendingPredictions: pendingBySeason.get(pool.season) ?? 0,
        },
      ];
    });
  }

  private alreadyMember() {
    return conflict("ALREADY_MEMBER", "Tu já tá nesse bolão.");
  }
}
