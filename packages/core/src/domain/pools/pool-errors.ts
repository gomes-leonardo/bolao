/** Nenhum bolão responde a esse código de convite. */
export class InviteCodeNotFoundError extends Error {
  readonly inviteCode: string;

  constructor(inviteCode: string) {
    super(`Nenhum bolão com o código ${inviteCode}`);
    this.name = "InviteCodeNotFoundError";
    this.inviteCode = inviteCode;
  }
}

/** Quem tentou entrar já está no bolão. */
export class AlreadyMemberError extends Error {
  readonly poolId: number;
  readonly userId: number;

  constructor(poolId: number, userId: number) {
    super(`Usuário ${userId} já é membro do bolão ${poolId}`);
    this.name = "AlreadyMemberError";
    this.poolId = poolId;
    this.userId = userId;
  }
}

/** O dono não sai do próprio bolão: ou ele fica, ou o bolão acaba. */
export class OwnerCannotLeaveError extends Error {
  readonly poolId: number;

  constructor(poolId: number) {
    super(`O dono não sai do bolão ${poolId}`);
    this.name = "OwnerCannotLeaveError";
    this.poolId = poolId;
  }
}

/** Membro comum só remove a si mesmo. */
export class CannotRemoveOtherMemberError extends Error {
  readonly poolId: number;
  readonly actorId: number;

  constructor(poolId: number, actorId: number) {
    super(`Usuário ${actorId} não pode remover outros do bolão ${poolId}`);
    this.name = "CannotRemoveOtherMemberError";
    this.poolId = poolId;
    this.actorId = actorId;
  }
}

/** A pessoa que se tentou remover não está no bolão. */
export class PoolMemberNotFoundError extends Error {
  readonly poolId: number;
  readonly memberId: number;

  constructor(poolId: number, memberId: number) {
    super(`Usuário ${memberId} não está no bolão ${poolId}`);
    this.name = "PoolMemberNotFoundError";
    this.poolId = poolId;
    this.memberId = memberId;
  }
}

/**
 * Esgotaram as tentativas de gerar um código de convite livre.
 *
 * Este erro **não** é traduzido em `api/src/common/domain-errors.ts`, e a
 * omissão é deliberada: num alfabeto de 31^8, cinco colisões seguidas são falha
 * nossa, não erro de quem chamou. Sem tradução ele cai no 500 com log, que é
 * onde um problema nosso tem que aparecer. Traduzir isto para 4xx faria um bug
 * nosso parecer culpa do cliente e o tiraria do log.
 */
export class InviteCodeExhaustedError extends Error {
  readonly attempts: number;

  constructor(attempts: number) {
    super(`Não consegui um código de convite livre em ${attempts} tentativas`);
    this.name = "InviteCodeExhaustedError";
    this.attempts = attempts;
  }
}
