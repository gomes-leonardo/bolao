import { Module } from "@nestjs/common";
import { rankingGatewayProvider } from "./ranking.provider.js";
import { RankingService } from "./ranking.service.js";

@Module({
  providers: [rankingGatewayProvider, RankingService],
  exports: [RankingService],
})
export class RankingModule {}
