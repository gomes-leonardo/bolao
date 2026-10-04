import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { ErrorFilter } from "./common/error.filter.js";
import { DbModule } from "./db/db.module.js";
import { HealthController } from "./health/health.controller.js";
import { MatchesModule } from "./matches/matches.module.js";
import { MeController } from "./me/me.controller.js";
import { PoolsModule } from "./pools/pools.module.js";

@Module({
  imports: [DbModule, AuthModule, MatchesModule, PoolsModule],
  controllers: [HealthController, MeController],
  providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {}
