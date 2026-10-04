import { describe, expect, it, vi } from "vitest";
import { FootballDataError, fetchRound, parseMatches } from "./client.ts";

const apiMatch = {
  id: 5001,
  utcDate: "2026-10-17T19:00:00Z",
  status: "FINISHED",
  matchday: 28,
  homeTeam: {
    id: 10,
    name: "Clube Alfa",
    shortName: "Alfa",
    tla: "ALF",
    crest: null,
  },
  awayTeam: {
    id: 11,
    name: "Clube Beta",
    shortName: null,
    tla: "BET",
    crest: null,
  },
  score: { fullTime: { home: 2, away: 1 } },
};

function makeSut(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response);
  return {
    fetch,
    run: () => fetchRound({ season: 2026, round: 28, apiKey: "chave", fetch }),
  };
}

describe("fetchRound", () => {
  it("pede a rodada do Brasileirão com a chave no header", async () => {
    const { fetch, run } = makeSut(Response.json({ matches: [apiMatch] }));

    await run();

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe(
      "https://api.football-data.org/v4/competitions/BSA/matches?season=2026&matchday=28",
    );
    expect(init?.headers).toEqual({ "X-Auth-Token": "chave" });
  });

  it("devolve os jogos já validados", async () => {
    const { run } = makeSut(Response.json({ matches: [apiMatch] }));

    const [match] = await run();

    expect(match).toMatchObject({
      id: 5001,
      status: "FINISHED",
      score: { fullTime: { home: 2 } },
    });
  });

  it("falha com FootballDataError quando a API responde erro", async () => {
    const { run } = makeSut(
      new Response("Your API token is invalid.", { status: 403 }),
    );

    const error: unknown = await run().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FootballDataError);
    expect((error as Error).message).toMatch(/403.*token is invalid/);
  });
});

describe("parseMatches", () => {
  it("usa o nome quando o nome curto vem vazio", () => {
    const [match] = parseMatches({ matches: [apiMatch] });

    expect(match?.awayTeam.shortName).toBe("Clube Beta");
  });

  it("rejeita time sem sigla de 3 letras", () => {
    const invalid = {
      ...apiMatch,
      homeTeam: { ...apiMatch.homeTeam, tla: null },
    };

    expect(() => parseMatches({ matches: [invalid] })).toThrow(
      FootballDataError,
    );
  });

  it("rejeita status desconhecido", () => {
    expect(() =>
      parseMatches({ matches: [{ ...apiMatch, status: "HALFTIME" }] }),
    ).toThrow(FootballDataError);
  });

  it("rejeita jogo encerrado sem placar", () => {
    const finishedWithoutScore = {
      ...apiMatch,
      status: "FINISHED",
      score: { fullTime: { home: null, away: null } },
    };

    expect(() => parseMatches({ matches: [finishedWithoutScore] })).toThrow(
      /5001.*encerrado sem placar/s,
    );
  });

  it("rejeita placar com só um lado preenchido", () => {
    const halfScore = {
      ...apiMatch,
      status: "IN_PLAY",
      score: { fullTime: { home: 1, away: null } },
    };

    expect(() => parseMatches({ matches: [halfScore] })).toThrow(
      /5001.*placar incompleto/s,
    );
  });

  it("aceita jogo agendado sem placar", () => {
    const scheduled = {
      ...apiMatch,
      status: "TIMED",
      score: { fullTime: { home: null, away: null } },
    };

    expect(parseMatches({ matches: [scheduled] })).toHaveLength(1);
  });
});
