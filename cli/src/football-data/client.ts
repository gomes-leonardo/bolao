import { z } from "zod";
import { apiStatuses } from "./status.ts";

const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "BSA";

export class FootballDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FootballDataError";
  }
}

const teamSchema = z
  .object({
    id: z.number().int(),
    name: z.string().min(1),
    shortName: z.string().nullable(),
    tla: z
      .string()
      .regex(/^[A-Z0-9]{3}$/, "sigla do time precisa ter 3 letras"),
    crest: z.url().nullish(),
  })
  .transform((team) => ({ ...team, shortName: team.shortName ?? team.name }));

const matchSchema = z.object({
  id: z.number().int(),
  utcDate: z.iso.datetime(),
  status: z.enum(apiStatuses),
  matchday: z.number().int().min(1).max(38),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: z.object({
    fullTime: z.object({
      home: z.number().int().nullable(),
      away: z.number().int().nullable(),
    }),
  }),
});

const matchesSchema = z.object({ matches: z.array(matchSchema) });

export type FootballDataMatch = z.infer<typeof matchSchema>;

export function parseMatches(json: unknown): FootballDataMatch[] {
  const parsed = matchesSchema.safeParse(json);
  if (!parsed.success) {
    throw new FootballDataError(
      `Resposta inesperada:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data.matches;
}

export interface FetchRoundOptions {
  season: number;
  round: number;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export async function fetchRound({
  season,
  round,
  apiKey,
  fetch = globalThis.fetch,
}: FetchRoundOptions): Promise<FootballDataMatch[]> {
  const url = new URL(`${BASE_URL}/competitions/${COMPETITION}/matches`);
  url.searchParams.set("season", String(season));
  url.searchParams.set("matchday", String(round));

  const response = await fetch(url, { headers: { "X-Auth-Token": apiKey } });
  if (!response.ok) {
    throw new FootballDataError(
      `football-data respondeu ${response.status}: ${await response.text()}`,
    );
  }
  return parseMatches(await response.json());
}
