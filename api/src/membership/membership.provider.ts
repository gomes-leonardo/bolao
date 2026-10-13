import { createPrismaMembershipGateway, type Db } from "@bolao/core";
import {
  requireMember,
  requireOwner,
  type PoolAccess,
} from "@bolao/core/domain";
import type { Provider } from "@nestjs/common";
import { DB } from "../db/db.module.js";

export const MEMBERSHIP = Symbol("MEMBERSHIP");

export interface Membership {
  requireMember(poolId: number, userId: number): Promise<PoolAccess>;
  requireOwner(poolId: number, userId: number): Promise<PoolAccess>;
}

/**
 * Liga a porta da autorização ao adapter do Prisma e entrega os casos de uso já
 * amarrados nela.
 *
 * A borda recebe os casos de uso, não a porta crua, e é de propósito:
 * `findVisiblePool` devolve `null` em vez de lançar, então chamá-la direto e
 * esquecer o `if` é um bypass silencioso de autorização. Fora do alcance da
 * borda, não tem como ser chamada por engano (ADR 0008).
 *
 * Depende do token `DB`, que é `@Global()`, então os testes de integração
 * continuam trocando o banco com `overrideProvider(DB)`.
 */
export const membershipProvider: Provider = {
  provide: MEMBERSHIP,
  inject: [DB],
  useFactory: (db: Db): Membership => {
    const gateway = createPrismaMembershipGateway(db);
    return {
      requireMember: (poolId, userId) => requireMember(gateway, poolId, userId),
      requireOwner: (poolId, userId) => requireOwner(gateway, poolId, userId),
    };
  },
};
