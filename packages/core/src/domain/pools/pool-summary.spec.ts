import { describe, expect, it } from "vitest";
import type { Standing } from "../ranking/rank-standings.ts";
import { summarizePool } from "./pool-summary.ts";
import type { PoolRecord } from "./pools-gateway.ts";

const pool: PoolRecord = {
  id: 42,
  name: "Resenha do Trampo",
  inviteCode: "ABCD2345",
  season: 2026,
  ownerId: 7,
  memberCount: 5,
};

const standings: Standing[] = [
  { position: 1, user: { id: 7, name: "Leo" }, points: 9, exactHits: 3 },
  { position: 2, user: { id: 9, name: "Bia" }, points: 4, exactHits: 1 },
];

describe("summarizePool", () => {
  it("copia nome, código, temporada e total de membros", () => {
    expect(summarizePool(pool, 7, standings, 3)).toMatchObject({
      id: 42,
      name: "Resenha do Trampo",
      inviteCode: "ABCD2345",
      season: 2026,
      memberCount: 5,
      pendingPredictions: 3,
    });
  });

  it("isOwner é verdadeiro só para o dono", () => {
    expect(summarizePool(pool, 7, standings, 0).isOwner).toBe(true);
    expect(summarizePool(pool, 9, standings, 0).isOwner).toBe(false);
  });

  it("lê posição e pontos da entrada de quem está olhando", () => {
    expect(summarizePool(pool, 9, standings, 0)).toMatchObject({
      myPosition: 2,
      myPoints: 4,
    });
  });

  it("quem não está na classificação aparece com zero, não com undefined", () => {
    // O `?? 0` é a razão desta função existir. `undefined` vazaria para o JSON
    // e `1` colocaria quem não pontuou na liderança.
    const resumo = summarizePool(pool, 999, standings, 0);

    expect(resumo.myPosition).toBe(0);
    expect(resumo.myPoints).toBe(0);
  });

  it("classificação vazia também vira zero", () => {
    expect(summarizePool(pool, 7, [], 0)).toMatchObject({
      myPosition: 0,
      myPoints: 0,
    });
  });
});
