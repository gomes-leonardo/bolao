import pg from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
} from "vitest";
import {
  cases,
  fixtures,
  type ConstraintCase,
  type Expectation,
} from "./__fixtures__/constraint-cases.ts";
import { predictionCases } from "./__fixtures__/prediction-cases.ts";

const sqlStates: Record<Exclude<Expectation, "ok">, string> = {
  unique_violation: "23505",
  check_violation: "23514",
  foreign_key_violation: "23503",
  restrict_violation: "23001",
  not_null_violation: "23502",
};

const client = new pg.Client({ connectionString: inject("testDatabaseUrl") });

beforeAll(() => client.connect());
afterAll(() => client.end());

beforeEach(async () => {
  await client.query("BEGIN");
  await client.query(
    "TRUNCATE predictions, pool_members, pools, matches, teams, users RESTART IDENTITY CASCADE",
  );
  await client.query(fixtures);
});
afterEach(() => client.query("ROLLBACK"));

async function attempt(sql: string): Promise<pg.DatabaseError | undefined> {
  try {
    await client.query(sql);
    return undefined;
  } catch (error) {
    if (error instanceof pg.DatabaseError) return error;
    throw error;
  }
}

async function assertCase(testCase: ConstraintCase): Promise<void> {
  const error = await attempt(testCase.sql);

  if (testCase.expect === "ok") {
    expect(error?.message).toBeUndefined();
    if (testCase.verify) {
      const { rows } = await client.query<{ ok: boolean }>(testCase.verify);
      expect(rows[0]?.ok).toBe(true);
    }
    return;
  }

  expect(error?.code, error?.message ?? "o comando passou").toBe(
    sqlStates[testCase.expect],
  );
  if (testCase.constraint) {
    expect(error?.constraint).toBe(testCase.constraint);
  }
}

const byTable = Map.groupBy(
  [...cases, ...predictionCases],
  (testCase) => testCase.table,
);

for (const [table, tableCases] of byTable) {
  describe(table, () => {
    it.each(tableCases)("$name", assertCase);
  });
}
