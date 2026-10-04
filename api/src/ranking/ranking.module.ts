import { Module } from "@nestjs/common";
import { RankingService } from "./ranking.service.js";

@Module({
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
