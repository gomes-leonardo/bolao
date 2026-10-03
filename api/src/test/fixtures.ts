import type { Db, MatchStatus } from "@bolao/core";

let sequence = 0;
const next = () => ++sequence;

const minutesFromNow = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000);

export async function seedUser(db: Db, name: string): Promise<number> {
  const { id } = await db.user.create({
    data: {
      name,
      email: `${name.toLowerCase()}${next()}@carimbou.dev`,
      passwordHash: "hash",
    },
    select: { id: true },
  });
  return id;
}

async function seedTeam(db: Db, tla: string): Promise<number> {
  const externalId = [...tla].reduce(
    (id, letter) => id * 100 + letter.charCodeAt(0),
    0,
  );
  const { id } = await db.team.upsert({
    where: { externalId },
    create: { externalId, name: `Clube ${tla}`, shortName: tla, tla },
    update: {},
    select: { id: true },
  });
  return id;
}

export interface MatchSeed {
  season?: number;
  round?: number;
  kickoffInMinutes?: number;
  status?: MatchStatus;
  score?: [number, number];
  home?: string;
  away?: string;
}

export async function seedMatch(db: Db, seed: MatchSeed = {}): Promise<number> {
  const { id } = await db.match.create({
    data: {
      externalId: next(),
      season: seed.season ?? 2026,
      round: seed.round ?? 28,
      homeTeamId: await seedTeam(db, seed.home ?? "ALF"),
      awayTeamId: await seedTeam(db, seed.away ?? "BET"),
      kickoffAt: minutesFromNow(seed.kickoffInMinutes ?? 60),
      status: seed.status ?? "scheduled",
      homeScore: seed.score?.[0] ?? null,
      awayScore: seed.score?.[1] ?? null,
    },
    select: { id: true },
  });
  return id;
}

export async function seedPool(
  db: Db,
  ownerId: number,
  {
    name = "Resenha",
    memberIds = [],
  }: { name?: string; memberIds?: number[] } = {},
): Promise<{ id: number; inviteCode: string }> {
  const inviteCode = `TST${String(next()).padStart(5, "0")}`;
  return db.pool.create({
    data: {
      name,
      inviteCode,
      ownerId,
      season: 2026,
      members: {
        create: [ownerId, ...memberIds].map((userId) => ({ userId })),
      },
    },
    select: { id: true, inviteCode: true },
  });
}

export async function seedPrediction(
  db: Db,
  userId: number,
  matchId: number,
  [home, away]: [number, number],
  points: number | null = null,
): Promise<void> {
  await db.prediction.create({
    data: { userId, matchId, homeScore: home, awayScore: away, points },
  });
}
