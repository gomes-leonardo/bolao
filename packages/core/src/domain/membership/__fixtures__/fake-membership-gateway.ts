import type { MembershipGateway, PoolAccess } from "../membership-gateway.ts";

/**
 * Fake da porta, escrito à mão.
 *
 * Guarda as chamadas em vez de só devolver valores: parte do que se quer provar
 * é que a porta foi consultada com os dois ids, na ordem certa. Trocar os
 * parâmetros autorizaria a pessoa errada e não mudaria nenhum valor de retorno.
 */
export interface FakeMembershipGateway extends MembershipGateway {
  readonly findCalls: { poolId: number; userId: number }[];
}

export interface FakeMembershipSetup {
  /** O bolão visível. Ausente significa invisível: não existe, ou não é membro. */
  pool?: PoolAccess;
}

export function fakeMembershipGateway(
  setup: FakeMembershipSetup = {},
): FakeMembershipGateway {
  const findCalls: { poolId: number; userId: number }[] = [];

  return {
    findCalls,
    findVisiblePool(poolId, userId) {
      findCalls.push({ poolId, userId });
      return Promise.resolve(setup.pool ?? null);
    },
  };
}
