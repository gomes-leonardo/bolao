import { config } from "dotenv";
import { DEFAULT_BCRYPT_ROUNDS, hashPassword } from "../src/auth/password.ts";
import { createDb } from "../src/db.ts";
import { registerResult } from "../src/matches/register-result.ts";

config({ path: new URL("../.env", import.meta.url), quiet: true });

const url = process.env["DATABASE_URL"];
if (!url)
  throw new Error("DATABASE_URL não definida. Confere o packages/core/.env.");

const db = createDb(url);
const SEASON = 2026;

// Senha única de dev: todos os usuários do seed entram com ela.
const DEV_PASSWORD = "carimbou123";

const people = ["Leo", "Bia", "Duda", "Caio", "Rafa", "Lu"];

// Palpite de cada pessoa por posição do jogo na rodada (mandante, visitante).
const guesses: [number, number][][] = [
  [
    [1, 1],
    [0, 2],
    [2, 0],
    [1, 0],
    [2, 1],
    [2, 2],
    [1, 2],
    [0, 0],
    [2, 1],
    [0, 1],
  ],
  [
    [2, 1],
    [0, 1],
    [2, 0],
    [1, 1],
    [3, 1],
    [1, 1],
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 2],
    [1, 0],
    [1, 0],
    [3, 1],
    [2, 2],
    [1, 2],
    [0, 0],
    [2, 0],
    [0, 2],
  ],
  [
    [0, 1],
    [0, 2],
    [2, 1],
    [0, 0],
    [1, 0],
    [0, 1],
    [2, 1],
    [1, 1],
    [2, 1],
    [0, 1],
  ],
  [
    [2, 2],
    [1, 3],
    [3, 0],
    [2, 0],
    [2, 2],
    [3, 2],
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 2],
  ],
  [
    [1, 0],
    [0, 0],
    [1, 1],
    [1, 0],
    [3, 1],
    [2, 1],
    [1, 2],
    [0, 0],
    [3, 1],
    [0, 1],
  ],
];

async function main() {
  const rounds = await db.match.findMany({
    where: { season: SEASON, round: { in: [27, 28] } },
    orderBy: [{ round: "asc" }, { kickoffAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      round: true,
      status: true,
      homeScore: true,
      awayScore: true,
    },
  });
  if (rounds.length === 0) {
    throw new Error(
      "Nenhum jogo das rodadas 27 e 28. Rode antes:\n" +
        "  npm run cli -- import -r 27 -s 2026 -f cli/fixtures/bsa-2026-amostra.json\n" +
        "  npm run cli -- import -r 28 -s 2026 -f cli/fixtures/bsa-2026-amostra.json",
    );
  }

  const passwordHash = await hashPassword(DEV_PASSWORD, DEFAULT_BCRYPT_ROUNDS);
  const users = [];
  for (const name of people) {
    const email = `${name.toLowerCase()}@carimbou.dev`;
    users.push(
      await db.user.upsert({
        where: { email },
        create: { name, email, passwordHash },
        update: { passwordHash },
        select: { id: true, name: true },
      }),
    );
  }
  const [leo, bia, duda, caio] = users;
  if (!leo || !bia || !duda || !caio)
    throw new Error("Usuários de dev não foram criados.");

  const pools = [
    {
      name: "Resenha do Trampo",
      inviteCode: "RSNH2026",
      ownerId: leo.id,
      members: users,
    },
    {
      name: "Os Cornetas",
      inviteCode: "CRNT2026",
      ownerId: bia.id,
      members: [bia, leo, caio],
    },
    {
      name: "Fut de Quinta",
      inviteCode: "FUTQ2026",
      ownerId: duda.id,
      members: [duda, leo],
    },
  ];
  for (const pool of pools) {
    const { id } = await db.pool.upsert({
      where: { inviteCode: pool.inviteCode },
      create: {
        name: pool.name,
        inviteCode: pool.inviteCode,
        ownerId: pool.ownerId,
        season: SEASON,
      },
      update: {},
      select: { id: true },
    });
    for (const member of pool.members) {
      await db.poolMember.upsert({
        where: { poolId_userId: { poolId: id, userId: member.id } },
        create: { poolId: id, userId: member.id },
        update: {},
      });
    }
  }

  for (const round of [27, 28]) {
    const matches = rounds.filter((match) => match.round === round);
    for (const [personIndex, user] of users.entries()) {
      for (const [matchIndex, match] of matches.entries()) {
        // Na rodada 28 metade da galera ainda não palpitou tudo.
        if (round === 28 && (personIndex + matchIndex) % 3 === 0) continue;
        const [home, away] = guesses[personIndex]?.[matchIndex] ?? [0, 0];
        await db.prediction.upsert({
          where: { userId_matchId: { userId: user.id, matchId: match.id } },
          create: {
            userId: user.id,
            matchId: match.id,
            homeScore: home,
            awayScore: away,
          },
          update: { homeScore: home, awayScore: away },
        });
      }
    }
  }

  for (const match of rounds) {
    if (
      match.status === "finished" &&
      match.homeScore !== null &&
      match.awayScore !== null
    ) {
      await registerResult(db, {
        matchId: match.id,
        score: { home: match.homeScore, away: match.awayScore },
      });
    }
  }

  console.log(
    `Dados de dev prontos. Entre com qualquer e-mail @carimbou.dev e a senha ${DEV_PASSWORD},`,
  );
  console.log("ou use o header X-Dev-User-Id com um destes ids:");
  for (const user of users) console.log(`  ${user.id}  ${user.name}`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
