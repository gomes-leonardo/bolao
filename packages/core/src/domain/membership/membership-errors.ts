/**
 * O bolão não aparece para quem pediu: ou não existe, ou quem pediu não é
 * membro. Os dois casos chegam aqui indistinguíveis, de propósito.
 *
 * A conflação não mora neste erro, mora na porta: `findVisiblePool` devolve o
 * mesmo `null` nas duas situações, então o domínio nunca aprende que o bolão
 * existe e não tem como vazar isso numa mensagem.
 *
 * O campo é atribuído no corpo do construtor: `erasableSyntaxOnly` está ligado
 * no `packages/core/tsconfig.json` e proíbe parameter properties.
 */
export class PoolNotVisibleError extends Error {
  readonly poolId: number;

  constructor(poolId: number) {
    super(`Bolão ${poolId} não está visível para este usuário`);
    this.name = "PoolNotVisibleError";
    this.poolId = poolId;
  }
}

/**
 * Quem pediu é membro do bolão, mas a operação é só do dono.
 *
 * Diferente do `PoolNotVisibleError`: aqui dizer que o bolão existe não vaza
 * nada, porque quem perguntou já está dentro dele.
 */
export class NotPoolOwnerError extends Error {
  readonly poolId: number;
  readonly userId: number;

  constructor(poolId: number, userId: number) {
    super(`Usuário ${userId} não é dono do bolão ${poolId}`);
    this.name = "NotPoolOwnerError";
    this.poolId = poolId;
    this.userId = userId;
  }
}
