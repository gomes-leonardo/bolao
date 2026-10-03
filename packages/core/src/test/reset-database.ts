import type { Db } from "../db.ts";

export async function resetDatabase(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    "TRUNCATE predictions, pool_members, pools, matches, teams, users RESTART IDENTITY CASCADE",
  );
}
