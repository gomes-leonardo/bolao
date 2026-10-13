import { requireMember } from "../membership/require-member.ts";
import type { MembershipGateway } from "../membership/membership-gateway.ts";
import {
  CannotRemoveOtherMemberError,
  OwnerCannotLeaveError,
  PoolMemberNotFoundError,
} from "./pool-errors.ts";
import type { PoolsGateway } from "./pools-gateway.ts";

/**
 * Remove alguém do bolão: o dono remove qualquer um, o membro sai sozinho, e o
 * dono não sai.
 *
 * A ordem das recusas é regra, não detalhe. A visibilidade vem primeiro, para
 * quem não é membro não descobrir que o bolão existe. A proibição de o dono
 * sair vem antes da checagem de permissão, porque o dono **tem** permissão: sem
 * essa ordem, o dono tentando sair receberia 403 em vez da explicação de que ele
 * precisa apagar o bolão.
 *
 * Duas portas, então a assinatura é um objeto nomeado — um par posicional
 * obrigaria a decorar a ordem.
 */
export async function removePoolMember(
  gateways: { pools: PoolsGateway; membership: MembershipGateway },
  command: { actorId: number; poolId: number; memberId: number },
): Promise<void> {
  const { actorId, poolId, memberId } = command;
  const pool = await requireMember(gateways.membership, poolId, actorId);

  if (memberId === pool.ownerId) throw new OwnerCannotLeaveError(poolId);

  if (actorId !== memberId && actorId !== pool.ownerId) {
    throw new CannotRemoveOtherMemberError(poolId, actorId);
  }

  const removed = await gateways.pools.removeMember(poolId, memberId);
  if (!removed) throw new PoolMemberNotFoundError(poolId, memberId);
}
