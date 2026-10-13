import { Prisma } from "../../prisma.ts";

/**
 * A janela do palpite, escrita uma vez (ADR 0004 e ADR 0008).
 *
 * Toda operação que depende de "este jogo ainda aceita palpite" lê este
 * fragmento, e com ele o relógio do Postgres: a gravação, o muro da galera, a
 * flag `locked` da tela da rodada e a conta de palpites que faltam. Antes o
 * predicado estava escrito em quatro lugares, dois deles com o relógio da
 * aplicação, e manter os quatro em sincronia era um combinado, não uma
 * garantia.
 *
 * Exige que a query apelide `matches` de `m`.
 */
export const openWindow = Prisma.sql`m.status = 'scheduled' AND m.kickoff_at > now()`;
