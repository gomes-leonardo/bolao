import type { Standing } from "../ranking/rank-standings.ts";
import type { PoolRecord } from "./pools-gateway.ts";

/**
 * O resumo de um bolão para um leitor específico.
 *
 * Tipo de domínio, estruturalmente idêntico ao `PoolSummary` de `contracts`. A
 * duplicata é de propósito e a cerca do lint a exige: uma regra que importasse
 * o formato de fio mudaria junto com um campo de resposta.
 */
export interface PoolOverview {
  id: number;
  name: string;
  inviteCode: string;
  season: number;
  isOwner: boolean;
  memberCount: number;
  myPosition: number;
  myPoints: number;
  pendingPredictions: number;
}

/**
 * Projeta o bolão do ponto de vista de quem está olhando.
 *
 * Função pura, sem porta, e a assimetria em relação aos outros casos de uso é o
 * ponto: porta existe para o I/O de que uma regra precisa, e esta regra não
 * precisa de nenhum — ela recebe o resultado do I/O que a borda já fez. Por isso
 * é uma função como `scorePrediction`, não um caso de uso com gateway.
 *
 * O que ela protege é pequeno e real: `myPosition: 0` e `myPoints: 0` querem
 * dizer "fora da classificação", e esse `0` está documentado num lugar só.
 * `undefined` vazaria para o JSON e `1` colocaria quem não pontuou na
 * liderança.
 *
 * O fan-out das três leituras fica na borda: paralelizar e deduplicar por
 * temporada é otimização de N+1, não decisão que se possa errar.
 */
export function summarizePool(
  pool: PoolRecord,
  viewerId: number,
  standings: readonly Standing[],
  pendingPredictions: number,
): PoolOverview {
  const mine = standings.find((entry) => entry.user.id === viewerId);

  return {
    id: pool.id,
    name: pool.name,
    inviteCode: pool.inviteCode,
    season: pool.season,
    isOwner: pool.ownerId === viewerId,
    memberCount: pool.memberCount,
    myPosition: mine?.position ?? 0,
    myPoints: mine?.points ?? 0,
    pendingPredictions,
  };
}
