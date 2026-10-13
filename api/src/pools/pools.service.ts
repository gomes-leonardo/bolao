import { Inject, Injectable } from "@nestjs/common";
import type {
  MemberView,
  Paginated,
  PaginationInput,
  PoolSummary,
  RankingView,
} from "@bolao/core/contracts";
import { PoolNotVisibleError, summarizePool } from "@bolao/core/domain";
import { paginated, skipOf } from "../common/pagination.js";
import { currentSeason } from "../common/season.js";
import { MatchesService } from "../matches/matches.service.js";
import {
  MEMBERSHIP,
  type Membership,
} from "../membership/membership.provider.js";
import { RankingService } from "../ranking/ranking.service.js";
import { POOLS, type Pools } from "./pools.provider.js";

/**
 * A borda dos bolões.
 *
 * Nenhuma regra mora aqui. O que sobrou é autorização delegada, paginação, o
 * fan-out das leituras do resumo e a passagem do domínio para o formato de fio.
 */
@Injectable()
export class PoolsService {
  constructor(
    @Inject(POOLS) private readonly pools: Pools,
    @Inject(MEMBERSHIP) private readonly membership: Membership,
    private readonly ranking: RankingService,
    private readonly matches: MatchesService,
  ) {}

  async create(userId: number, name: string): Promise<PoolSummary> {
    const { id } = await this.pools.create({
      ownerId: userId,
      name,
      season: currentSeason(),
    });
    return this.summary(userId, id);
  }

  async list(
    userId: number,
    pagination: PaginationInput,
  ): Promise<Paginated<PoolSummary>> {
    const [total, poolIds] = await Promise.all([
      this.pools.countMemberships(userId),
      this.pools.membershipPoolIds(
        userId,
        skipOf(pagination),
        pagination.pageSize,
      ),
    ]);
    const summaries = await this.summaries(userId, poolIds);
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
    await this.pools.rename(poolId, name);
    return this.summary(userId, poolId);
  }

  async remove(userId: number, poolId: number): Promise<void> {
    await this.membership.requireOwner(poolId, userId);
    await this.pools.deletePool(poolId);
  }

  async join(userId: number, inviteCode: string): Promise<PoolSummary> {
    const { poolId } = await this.pools.join(inviteCode, userId);
    return this.summary(userId, poolId);
  }

  async members(
    userId: number,
    poolId: number,
    pagination: PaginationInput,
  ): Promise<Paginated<MemberView>> {
    const pool = await this.membership.requireMember(poolId, userId);
    const [total, members] = await Promise.all([
      this.pools.countMembers(poolId),
      this.pools.listMembers(poolId, skipOf(pagination), pagination.pageSize),
    ]);
    return paginated(
      members.map((member) => ({
        id: member.id,
        name: member.name,
        isOwner: member.id === pool.ownerId,
        joinedAt: member.joinedAt.toISOString(),
      })),
      total,
      pagination,
    );
  }

  removeMember(
    actorId: number,
    poolId: number,
    memberId: number,
  ): Promise<void> {
    return this.pools.removeMember({ actorId, poolId, memberId });
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
    if (!summary) throw new PoolNotVisibleError(poolId);
    return summary;
  }

  /**
   * O fan-out do resumo: três leituras, uma delas deduplicada por temporada
   * para não repetir a conta de pendências por bolão.
   *
   * O `flatMap` sobre `poolIds` é load-bearing: ele preserva a ordem da
   * paginação, que vem de `membershipPoolIds`. `poolsByIds` devolve na ordem do
   * banco, e trocar um pelo outro embaralharia a lista entre páginas sem
   * quebrar nenhum teste — o de integração ordena antes de comparar.
   */
  private async summaries(
    userId: number,
    poolIds: number[],
  ): Promise<PoolSummary[]> {
    const [pools, standings] = await Promise.all([
      this.pools.poolsByIds(poolIds),
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
      return [
        summarizePool(
          pool,
          userId,
          standings.get(id) ?? [],
          pendingBySeason.get(pool.season) ?? 0,
        ),
      ];
    });
  }
}
