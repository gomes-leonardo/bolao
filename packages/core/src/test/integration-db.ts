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
// Cada pacote pode usar o próprio banco, para as suítes não brigarem se rodarem em paralelo.
const databaseOverride = process.env["TEST_DATABASE_NAME"];
if (databaseOverride) testUrl.pathname = `/${databaseOverride}`;
const databaseName = (url: URL) => decodeURIComponent(url.pathname.slice(1));
const testDatabase = databaseName(testUrl);

if (testDatabase === databaseName(requireUrl("DATABASE_URL"))) {
  throw new Error(
    `TEST_DATABASE_URL aponta para o banco de desenvolvimento ("${testDatabase}"). ` +
      "Os testes de integração recriam esse banco do zero e apagariam seus dados.",
  );
}
if (!testDatabase.endsWith("_test")) {
  throw new Error(
    `O banco de testes precisa terminar em "_test" (recebido: "${testDatabase}"). ` +
      "A suíte apaga e recria esse banco a cada execução.",
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
  client.query(
    `DROP DATABASE IF EXISTS ${client.escapeIdentifier(testDatabase)} WITH (FORCE)`,
  );

export async function setup(project: TestProject): Promise<void> {
  await withAdminClient(async (client) => {
    await dropDatabase(client);
    await client.query(
      `CREATE DATABASE ${client.escapeIdentifier(testDatabase)}`,
    );
  });
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: packageRoot,
    env: {
      ...process.env,
      DATABASE_URL: testUrl.toString(),
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
    stdio: ["ignore", "inherit", "inherit"],
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
