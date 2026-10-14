import { InviteCodeExhaustedError } from "./pool-errors.ts";
import type { PoolsGateway } from "./pools-gateway.ts";

export const MAX_INVITE_CODE_ATTEMPTS = 5;

/**
 * Cria o bolão, gerando um código de convite novo a cada colisão.
 *
 * A política mora aqui — quantas tentativas, gerar outro código a cada uma,
 * desistir no fim. A **detecção** da colisão mora no adapter, que sabe que um
 * P2002 em `pools_invite_code_key` significa "esse código já é de alguém" e
 * devolve `null`. Essa é a divisão: a decisão é de domínio, o jeito de descobri-la
 * é do Postgres.
 *
 * `newInviteCode` entra como colaborador em vez de dado porque um código novo é
 * necessário **por tentativa**: receber uma string pronta deixaria o retry
 * tentando o mesmo código cinco vezes. E porque a aleatoriedade é
 * infraestrutura — `node:crypto` é barrado nesta camada, de propósito.
 */
export async function createPool(
  gateway: PoolsGateway,
  command: { ownerId: number; name: string; season: number },
  newInviteCode: () => string,
): Promise<{ id: number }> {
  for (let attempt = 1; attempt <= MAX_INVITE_CODE_ATTEMPTS; attempt++) {
    const created = await gateway.createWithInviteCode({
      ...command,
      inviteCode: newInviteCode(),
    });
    if (created) return created;
  }
  throw new InviteCodeExhaustedError(MAX_INVITE_CODE_ATTEMPTS);
}
