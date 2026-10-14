import type { MemberTally } from "./ranking-gateway.ts";

export interface Standing {
  position: number;
  user: { id: number; name: string };
  points: number;
  exactHits: number;
}

/**
 * Ordena a classificação e atribui a posição.
 *
 * Mais pontos na frente; empate em pontos desempata por cravadas. Empate nos
 * dois divide a posição, e a próxima posição distinta pula o que foi dividido:
 * 1, 2, 2, 4. É o mesmo que o `RANK() OVER` fazia no SQL.
 *
 * O nome entra só como terceiro critério de ordenação, e é importante não
 * confundir o que ele faz: ele decide a ordem de exibição **dentro** de um
 * empate, nunca a posição de ninguém. O `ORDER BY position, u.name` do SQL
 * antigo fazia exatamente isso, e é a distinção que se perde ao traduzir — por
 * isso a posição é calculada depois da ordenação, comparando só pontos e
 * cravadas com a entrada anterior.
 *
 * O tipo devolvido é do domínio, não o `RankingEntry` de `contracts`: o formato
 * de fio é do front e da borda, e uma regra que dependesse dele mudaria junto
 * com um campo de resposta. Os dois são estruturalmente idênticos, então a
 * borda devolve isto direto, e se o contrato mudar o typecheck quebra lá, que é
 * onde a decisão de contrato pertence.
 */
export function rankStandings(tallies: readonly MemberTally[]): Standing[] {
  const ordered = [...tallies].sort(
    (a, b) =>
      b.points - a.points ||
      b.exactHits - a.exactHits ||
      a.user.name.localeCompare(b.user.name, "pt-BR"),
  );

  const standings: Standing[] = [];
  for (const [index, tally] of ordered.entries()) {
    const previous = ordered[index - 1];
    const tied =
      previous !== undefined &&
      previous.points === tally.points &&
      previous.exactHits === tally.exactHits;

    standings.push({
      position: tied ? standings[index - 1]!.position : index + 1,
      user: tally.user,
      points: tally.points,
      exactHits: tally.exactHits,
    });
  }
  return standings;
}
