import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@bolao/core";
import { forbidden, notFound } from "../common/errors.js";
import { DB } from "../db/db.module.js";

export interface PoolAccess {
  id: number;
  ownerId: number;
  season: number;
}

@Injectable()
export class MembershipService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Quem não é membro recebe 404, para não revelar que o bolão existe. */
  async requireMember(poolId: number, userId: number): Promise<PoolAccess> {
    const pool = await this.db.pool.findFirst({
      where: { id: poolId, members: { some: { userId } } },
      select: { id: true, ownerId: true, season: true },
    });
    if (!pool) throw notFound("POOL_NOT_FOUND", "Bolão não encontrado.");
    return pool;
  }

  async requireOwner(poolId: number, userId: number): Promise<PoolAccess> {
    const pool = await this.requireMember(poolId, userId);
    if (pool.ownerId !== userId) {
      throw forbidden("NOT_OWNER", "Só o dono do bolão pode fazer isso.");
    }
    return pool;
  }
}
