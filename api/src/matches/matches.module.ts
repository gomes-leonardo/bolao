import { Module } from "@nestjs/common";
import { MembershipModule } from "../membership/membership.module.js";
import { MatchesController } from "./matches.controller.js";
import { matchesProvider } from "./matches.provider.js";
import { MatchesService } from "./matches.service.js";
import { predictionUseCasesProvider } from "./prediction-gateway.provider.js";
import { PredictionsService } from "./predictions.service.js";

@Module({
  imports: [MembershipModule],
  controllers: [MatchesController],
  providers: [
    matchesProvider,
    predictionUseCasesProvider,
    MatchesService,
    PredictionsService,
  ],
  exports: [MatchesService, PredictionsService],
})
export class MatchesModule {}
