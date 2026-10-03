import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import {
  idParamSchema,
  roundQuerySchema,
  type RoundQueryInput,
  upsertPredictionSchema,
  type UpsertPredictionInput,
} from "@bolao/core/contracts";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { MatchesService } from "./matches.service.js";
import { PredictionsService } from "./predictions.service.js";

@Controller("matches")
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly predictions: PredictionsService,
  ) {}

  @Get()
  round(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(roundQuerySchema)) query: RoundQueryInput,
  ) {
    return this.matches.round(user.id, query.round);
  }

  @Get(":id")
  byId(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ZodValidationPipe(idParamSchema)) id: number,
  ) {
    return this.matches.byId(user.id, id);
  }

  @Put(":id/prediction")
  predict(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ZodValidationPipe(idParamSchema)) id: number,
    @Body(new ZodValidationPipe(upsertPredictionSchema))
    body: UpsertPredictionInput,
  ) {
    return this.predictions.upsert(user.id, id, body);
  }
}
