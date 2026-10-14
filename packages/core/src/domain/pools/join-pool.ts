import { AlreadyMemberError, InviteCodeNotFoundError } from "./pool-errors.ts";
import type { PoolsGateway } from "./pools-gateway.ts";

/**
 * Entra no bolão pelo código de convite.
 *
 * O erro de código inexistente é diferente do de bolão invisível, mesmo os dois
 * virando 404 `POOL_NOT_FOUND` na borda: a mensagem é outra, e quem digitou um
 * código errado merece saber que foi o código.
 */
export async function joinPool(
  gateway: PoolsGateway,
  inviteCode: string,
  userId: number,
): Promise<{ poolId: number }> {
  const poolId = await gateway.findIdByInviteCode(inviteCode);
  if (poolId === null) throw new InviteCodeNotFoundError(inviteCode);

  const joined = await gateway.addMember(poolId, userId);
  if (!joined) throw new AlreadyMemberError(poolId, userId);

  return { poolId };
}
