import { Module } from "@nestjs/common";
import { MatchesModule } from "../matches/matches.module.js";
import { MembershipModule } from "../membership/membership.module.js";
import { RankingModule } from "../ranking/ranking.module.js";
import { PoolsController } from "./pools.controller.js";
import { PoolsService } from "./pools.service.js";

@Module({
  imports: [MembershipModule, RankingModule, MatchesModule],
  controllers: [PoolsController],
  providers: [PoolsService],
})
export class PoolsModule {}
