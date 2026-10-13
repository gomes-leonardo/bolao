import { Module } from "@nestjs/common";
import { MembershipModule } from "../membership/membership.module.js";
import { MatchesController } from "./matches.controller.js";
import { MatchesService } from "./matches.service.js";
import { predictionGatewayProvider } from "./prediction-gateway.provider.js";
import { PredictionsService } from "./predictions.service.js";

@Module({
  imports: [MembershipModule],
  controllers: [MatchesController],
  providers: [MatchesService, PredictionsService, predictionGatewayProvider],
  exports: [MatchesService, PredictionsService],
})
export class MatchesModule {}
