import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  createPoolSchema,
  type CreatePoolInput,
  idParamSchema,
  joinPoolSchema,
  type JoinPoolInput,
  paginationSchema,
  type PaginationInput,
  roundQuerySchema,
  type RoundQueryInput,
  updatePoolSchema,
  type UpdatePoolInput,
} from "@bolao/core/contracts";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { PredictionsService } from "../matches/predictions.service.js";
import { PoolsService } from "./pools.service.js";

const idPipe = new ZodValidationPipe(idParamSchema);

@Controller("pools")
export class PoolsController {
  constructor(
    private readonly pools: PoolsService,
    private readonly predictions: PredictionsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPoolSchema)) body: CreatePoolInput,
  ) {
    return this.pools.create(user.id, body.name);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: PaginationInput,
  ) {
    return this.pools.list(user.id, pagination);
  }

  @Post("join")
  @HttpCode(200)
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(joinPoolSchema)) body: JoinPoolInput,
  ) {
    return this.pools.join(user.id, body.inviteCode);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id", idPipe) id: number) {
    return this.pools.get(user.id, id);
  }

  @Patch(":id")
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
    @Body(new ZodValidationPipe(updatePoolSchema)) body: UpdatePoolInput,
  ) {
    return this.pools.rename(user.id, id, body.name);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
  ) {
    return this.pools.remove(user.id, id);
  }

  @Get(":id/members")
  members(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
    @Query(new ZodValidationPipe(paginationSchema)) pagination: PaginationInput,
  ) {
    return this.pools.members(user.id, id, pagination);
  }

  @Delete(":id/members/:userId")
  @HttpCode(204)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
    @Param("userId", idPipe) memberId: number,
  ) {
    return this.pools.removeMember(user.id, id, memberId);
  }

  @Get(":id/ranking")
  ranking(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
    @Query(new ZodValidationPipe(roundQuerySchema)) query: RoundQueryInput,
  ) {
    return this.pools.rankingOf(user.id, id, query.round);
  }

  @Get(":id/matches/:matchId/predictions")
  wall(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", idPipe) id: number,
    @Param("matchId", idPipe) matchId: number,
  ) {
    return this.predictions.wall(id, user.id, matchId);
  }
}
