import { readFile } from "node:fs/promises";
import { createDb, type Db, type Score } from "@bolao/core";
import { Command } from "commander";
import {
  fetchRound,
  parseMatches,
  type FootballDataMatch,
} from "./football-data/client.ts";
import { parsePositiveInt, parseScore } from "./commands/parse-score.ts";
import { registerManualResult } from "./commands/register-manual-result.ts";
import { importRound } from "./import/import-round.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida. Confere o cli/.env.`);
  return value;
}

async function withDb<T>(run: (db: Db) => Promise<T>): Promise<T> {
  const db = createDb(requireEnv("DATABASE_URL"));
  try {
    return await run(db);
  } finally {
    await db.$disconnect();
  }
}

async function loadMatches(options: {
  season: number;
  round: number;
  file?: string;
}): Promise<FootballDataMatch[]> {
  if (options.file) {
    const all = parseMatches(JSON.parse(await readFile(options.file, "utf8")));
    return all.filter((match) => match.matchday === options.round);
  }
  return fetchRound({
    season: options.season,
    round: options.round,
    apiKey: requireEnv("FOOTBALL_DATA_API_KEY"),
  });
}

const program = new Command()
  .name("carimbou")
  .description(
    "Importa jogos do Brasileirão e registra resultados no Carimbou.",
  );

program
  .command("import")
  .description(
    "Importa ou atualiza os jogos de uma rodada (pontua os que já acabaram)",
  )
  .requiredOption(
    "-r, --round <rodada>",
    "rodada do campeonato",
    parsePositiveInt,
  )
  .option(
    "-s, --season <ano>",
    "temporada",
    parsePositiveInt,
    new Date().getFullYear(),
  )
  .option(
    "-f, --file <caminho>",
    "JSON local no formato da football-data, em vez da API",
  )
  .action(async (options: { round: number; season: number; file?: string }) => {
    const matches = await loadMatches(options);
    if (matches.length === 0) {
      throw new Error(`Nenhum jogo encontrado para a rodada ${options.round}.`);
    }
    const summary = await withDb((db) =>
      importRound(db, { season: options.season, matches }),
    );
    console.log(
      `Rodada ${options.round}/${options.season}: ${summary.matches} jogos e ${summary.teams} times importados, ${summary.scored} jogos pontuados.`,
    );
  });

program
  .command("result")
  .description("Registra o placar final de um jogo e recalcula os pontos")
  .requiredOption(
    "-m, --match <id>",
    "id do jogo na football-data",
    parsePositiveInt,
  )
  .argument("<placar>", "placar final, por exemplo 2-1", parseScore)
  .action(async (score: Score, options: { match: number }) => {
    const { scored } = await withDb((db) =>
      registerManualResult(db, { externalId: options.match, score }),
    );
    console.log(
      `Jogo ${options.match} encerrado em ${score.home}-${score.away}: ${scored} palpites pontuados.`,
    );
  });

try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
