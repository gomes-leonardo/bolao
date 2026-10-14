import { NotPoolOwnerError, PoolNotVisibleError } from "./membership-errors.ts";
import type { MembershipGateway, PoolAccess } from "./membership-gateway.ts";

/**
 * Exige que o bolão esteja visível para o usuário.
 *
 * Quem não é membro recebe o mesmo erro de quem pediu um bolão que não existe,
 * porque a porta não distingue os dois.
 */
export async function requireMember(
  gateway: MembershipGateway,
  poolId: number,
  userId: number,
): Promise<PoolAccess> {
  const pool = await gateway.findVisiblePool(poolId, userId);
  if (!pool) throw new PoolNotVisibleError(poolId);
  return pool;
}

/**
 * Exige que o usuário seja o dono.
 *
 * A visibilidade é checada primeiro, de propósito: quem não é membro não deve
 * descobrir que o bolão existe só porque pediu uma operação de dono.
 */
export async function requireOwner(
  gateway: MembershipGateway,
  poolId: number,
  userId: number,
): Promise<PoolAccess> {
  const pool = await requireMember(gateway, poolId, userId);
  if (pool.ownerId !== userId) throw new NotPoolOwnerError(poolId, userId);
  return pool;
}
