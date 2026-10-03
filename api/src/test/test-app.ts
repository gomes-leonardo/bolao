import "reflect-metadata";
import { createDb, type Db } from "@bolao/core";
import { resetDatabase } from "@bolao/core/testing";
import { Test } from "@nestjs/testing";
import { inject } from "vitest";
import { AppModule } from "../app.module.js";
import { configureApp } from "../app.setup.js";
import { DEV_USER_HEADER } from "../auth/dev-auth.guard.js";
import { DB } from "../db/db.module.js";

export interface TestResponse<T> {
  status: number;
  body: T;
}

export interface RequestOptions {
  as?: number;
  body?: unknown;
}

export interface TestApp {
  db: Db;
  baseUrl: string;
  request<T = unknown>(
    method: string,
    path: string,
    options?: RequestOptions,
  ): Promise<TestResponse<T>>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

/** Sobe o AppModule de verdade numa porta livre, ligado ao banco de teste. */
export async function createTestApp(): Promise<TestApp> {
  process.env["AUTH_MODE"] = "dev";
  const db = createDb(inject("testDatabaseUrl"));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DB)
    .useValue(db)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0);
  const baseUrl = `${await app.getUrl()}/api`;

  return {
    db,
    baseUrl,
    async request<T>(
      method: string,
      path: string,
      { as, body }: RequestOptions = {},
    ) {
      const headers: Record<string, string> = {};
      if (as !== undefined) headers[DEV_USER_HEADER] = String(as);
      if (body !== undefined) headers["content-type"] = "application/json";
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: (text ? JSON.parse(text) : undefined) as T,
      };
    },
    reset: () => resetDatabase(db),
    close: () => app.close(),
  };
}
