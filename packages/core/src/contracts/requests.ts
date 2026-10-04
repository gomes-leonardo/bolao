import { z } from "zod";

const poolName = z
  .string()
  .trim()
  .min(1, "Dá um nome pro bolão.")
  .max(60, "Nome com no máximo 60 caracteres.");

export const createPoolSchema = z.object({ name: poolName });
export type CreatePoolInput = z.infer<typeof createPoolSchema>;

export const updatePoolSchema = z.object({ name: poolName });
export type UpdatePoolInput = z.infer<typeof updatePoolSchema>;

export const joinPoolSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, "O código tem 8 letras ou números."),
});
export type JoinPoolInput = z.infer<typeof joinPoolSchema>;

const goals = z
  .number({ error: "Informe os gols." })
  .int("Gols precisam ser um número inteiro.")
  .min(0, "Gols não podem ser negativos.")
  .max(99, "Calma, no máximo 99 gols.");

export const upsertPredictionSchema = z.object({ home: goals, away: goals });
export type UpsertPredictionInput = z.infer<typeof upsertPredictionSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const roundQuerySchema = z.object({
  round: z.coerce.number().int().min(1).max(38).optional(),
});
export type RoundQueryInput = z.infer<typeof roundQuerySchema>;

export const MAX_ID = 2_147_483_647;

export const idParamSchema = z.coerce
  .number({ error: "Id inválido." })
  .int("Id inválido.")
  .positive("Id inválido.")
  .max(MAX_ID, "Id inválido.");
