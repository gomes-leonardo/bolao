import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import type { TestProject } from "vitest/node";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
config({ path: `${packageRoot}.env`, quiet: true });

function requireUrl(name: string): URL {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} não definida. Rode \`npm run setup\` na raiz.`);
  return new URL(value);
}

const testUrl = requireUrl("TEST_DATABASE_URL");
const devUrl = requireUrl("DATABASE_URL");
const testDatabase = testUrl.pathname.slice(1);

if (testUrl.host === devUrl.host && testUrl.pathname === devUrl.pathname) {
  throw new Error(
    `TEST_DATABASE_URL aponta para o banco de desenvolvimento ("${testDatabase}"). ` +
      "Os testes de integração recriam esse banco do zero e apagariam seus dados.",
  );
}

async function withAdminClient(
  run: (client: pg.Client) => Promise<unknown>,
): Promise<void> {
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

const dropDatabase = (client: pg.Client) =>
  client.query(`DROP DATABASE IF EXISTS "${testDatabase}" WITH (FORCE)`);

export async function setup(project: TestProject): Promise<void> {
  await withAdminClient(async (client) => {
    await dropDatabase(client);
    await client.query(`CREATE DATABASE "${testDatabase}"`);
  });
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      DATABASE_URL: testUrl.toString(),
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
    stdio: "pipe",
  });
  project.provide("testDatabaseUrl", testUrl.toString());
}

export async function teardown(): Promise<void> {
  await withAdminClient(dropDatabase);
}

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}
