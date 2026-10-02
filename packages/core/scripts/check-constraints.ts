import { config } from "dotenv";
import pg from "pg";
import { cases, fixtures, type ConstraintCase, type Expectation } from "./constraint-cases.ts";
import { predictionCases } from "./prediction-cases.ts";

config({ path: new URL("../../../.env", import.meta.url), quiet: true });

const sqlStates: Record<string, Expectation> = {
  "23505": "unique_violation",
  "23514": "check_violation",
  "23503": "foreign_key_violation",
  "23001": "restrict_violation",
  "23502": "not_null_violation",
};

type Outcome = { passed: true } | { passed: false; reason: string };

async function runCase(client: pg.Client, testCase: ConstraintCase): Promise<Outcome> {
  await client.query("SAVEPOINT test_case");
  try {
    await client.query(testCase.sql);
    if (testCase.expect !== "ok") {
      return { passed: false, reason: `esperava ${testCase.expect}, mas o comando passou` };
    }
    if (testCase.verify) {
      const { rows } = await client.query<{ ok: boolean }>(testCase.verify);
      if (rows[0]?.ok !== true) {
        return { passed: false, reason: "o comando passou, mas a verificação falhou" };
      }
    }
    return { passed: true };
  } catch (error) {
    if (!(error instanceof pg.DatabaseError)) throw error;
    const got = (error.code && sqlStates[error.code]) ?? `${error.code}: ${error.message}`;
    if (got !== testCase.expect) {
      return { passed: false, reason: `esperava ${testCase.expect}, veio ${got}` };
    }
    if (testCase.constraint && error.constraint !== testCase.constraint) {
      return { passed: false, reason: `esperava a constraint ${testCase.constraint}, disparou ${error.constraint}` };
    }
    return { passed: true };
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT test_case");
  }
}

async function main(): Promise<number> {
  const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
  await client.connect();
  let failures = 0;
  try {
    await client.query("BEGIN");
    await client.query(fixtures);
    for (const testCase of [...cases, ...predictionCases]) {
      const outcome = await runCase(client, testCase);
      if (outcome.passed) {
        console.log(`  ✓ ${testCase.table}: ${testCase.name}`);
      } else {
        failures++;
        console.log(`  ✗ ${testCase.table}: ${testCase.name}\n      ${outcome.reason}`);
      }
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
  console.log(failures === 0 ? "\nTodas as constraints ok." : `\n${failures} caso(s) falharam.`);
  return failures === 0 ? 0 : 1;
}

process.exitCode = await main();
