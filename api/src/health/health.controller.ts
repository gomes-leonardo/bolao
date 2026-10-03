import { Controller, Get, Inject } from "@nestjs/common";
import type { Db } from "@bolao/core";
import { Public } from "../auth/public.decorator.js";
import { DB } from "../db/db.module.js";

@Public()
@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async check() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
