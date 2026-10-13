import { describe, expect, it } from "vitest";
import { rankStandings } from "./rank-standings.ts";
import type { MemberTally } from "./ranking-gateway.ts";

const tally = (
  name: string,
  points: number,
  exactHits: number,
  id = name.charCodeAt(0),
): MemberTally => ({ user: { id, name }, points, exactHits });

const table = (standings: ReturnType<typeof rankStandings>) =>
  standings.map((s) => [s.position, s.user.name, s.points, s.exactHits]);

describe("rankStandings", () => {
  it("ordena por pontos", () => {
    const result = rankStandings([
      tally("Beto", 3, 1),
      tally("Ana", 6, 2),
      tally("Caio", 1, 0),
    ]);

    expect(table(result)).toEqual([
      [1, "Ana", 6, 2],
      [2, "Beto", 3, 1],
      [3, "Caio", 1, 0],
    ]);
  });

  it("empate em pontos desempata por cravadas", () => {
    const result = rankStandings([tally("Ana", 5, 1), tally("Beto", 5, 3)]);

    expect(table(result)).toEqual([
      [1, "Beto", 5, 3],
      [2, "Ana", 5, 1],
    ]);
  });

  it("empate divide a posição e a próxima distinta pula", () => {
    // A mesma tabela que o ranking.integration.spec.ts afirma contra o banco
    // de verdade: 1, 2, 2, 4, 4. Se este caso e aquele divergirem, a tradução
    // do RANK() está errada.
    const result = rankStandings([
      tally("Ana", 6, 2),
      tally("Beto", 5, 1),
      tally("Caio", 5, 1),
      tally("Duda", 0, 0),
      tally("Eva", 0, 0),
    ]);

    expect(table(result)).toEqual([
      [1, "Ana", 6, 2],
      [2, "Beto", 5, 1],
      [2, "Caio", 5, 1],
      [4, "Duda", 0, 0],
      [4, "Eva", 0, 0],
    ]);
  });

  it("o nome ordena dentro do empate, na ordem alfabética", () => {
    const result = rankStandings([
      tally("Caio", 5, 1),
      tally("Ana", 5, 1),
      tally("Beto", 5, 1),
    ]);

    expect(result.map((s) => s.user.name)).toEqual(["Ana", "Beto", "Caio"]);
  });

  it("ordena por pt-BR, não por byte: caixa não joga ninguém para o fim", () => {
    // Este caso existe para prender a escolha do comparador, e é ASCII puro.
    // A collation do banco é de byte (datlocprovider = c), onde "ana" vem
    // DEPOIS de "Bruno" porque minúscula tem código maior. Em pt-BR a caixa é
    // diferença terciária, então "ana" vem antes. Trocar o localeCompare por
    // `a < b` inverte esta linha.
    const result = rankStandings([tally("Bruno", 5, 1), tally("ana", 5, 1)]);

    expect(result.map((s) => s.user.name)).toEqual(["ana", "Bruno"]);
  });

  it("ordena por pt-BR, não por byte: acento não joga ninguém para o fim", () => {
    // Mesma razão, com acento: em byte "Ávila" vem depois de "Zeca", porque Á
    // é multibyte. Em pt-BR vem antes de "Bruno".
    const result = rankStandings([tally("Bruno", 5, 1), tally("Ávila", 5, 1)]);

    expect(result.map((s) => s.user.name)).toEqual(["Ávila", "Bruno"]);
  });

  it("empate triplo e a próxima distinta pula para a quarta", () => {
    // Encadeia a leitura da posição anterior por mais de um passo.
    const result = rankStandings([
      tally("Ana", 5, 1),
      tally("Beto", 5, 1),
      tally("Caio", 5, 1),
      tally("Duda", 1, 0),
    ]);

    expect(result.map((s) => s.position)).toEqual([1, 1, 1, 4]);
  });

  it("o nome nunca muda a posição de ninguém", () => {
    // O caso que mata a tradução errada: se o nome entrasse no cálculo da
    // posição junto com pontos e cravadas, estes três viriam 1, 2, 3 — cada um
    // com nome diferente, logo nenhum empate. Eles estão empatados.
    const result = rankStandings([
      tally("Caio", 5, 1),
      tally("Ana", 5, 1),
      tally("Beto", 5, 1),
    ]);

    expect(result.map((s) => s.position)).toEqual([1, 1, 1]);
  });

  it("membros sem ponto entram e empatam entre si", () => {
    const result = rankStandings([
      tally("Zeca", 0, 0),
      tally("Ana", 3, 1),
      tally("Bia", 0, 0),
    ]);

    expect(table(result)).toEqual([
      [1, "Ana", 3, 1],
      [2, "Bia", 0, 0],
      [2, "Zeca", 0, 0],
    ]);
  });

  it("bolão vazio devolve tabela vazia", () => {
    expect(rankStandings([])).toEqual([]);
  });

  it("não altera o array recebido", () => {
    const tallies = [tally("Beto", 1, 0), tally("Ana", 9, 3)];
    const antes = tallies.map((t) => t.user.name);

    rankStandings(tallies);

    expect(tallies.map((t) => t.user.name)).toEqual(antes);
  });
});
