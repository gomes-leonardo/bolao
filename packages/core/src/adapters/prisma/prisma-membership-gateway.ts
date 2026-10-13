import type { Db } from "../../db.ts";
import type { MembershipGateway } from "../../domain/membership/membership-gateway.ts";

export function createPrismaMembershipGateway(db: Db): MembershipGateway {
  return {
    findVisiblePool(poolId, userId) {
      // A conflação que a porta promete está nesta query: o filtro de membro
      // entra no WHERE, então "não existe" e "não sou membro" voltam como a
      // mesma linha ausente. Separar em duas queries para dar erros diferentes
      // revelaria quais bolões existem.
      return db.pool.findFirst({
        where: { id: poolId, members: { some: { userId } } },
        select: { id: true, ownerId: true, season: true },
      });
    },
  };
}
