import { Controller, Get, Inject } from "@nestjs/common";
import type { Db } from "@bolao/core";
import type { UserView } from "@bolao/core/contracts";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { unauthenticated } from "../common/errors.js";
import { DB } from "../db/db.module.js";

@Controller("me")
export class MeController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserView> {
    const found = await this.db.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true },
    });
    if (!found) throw unauthenticated();
    return found;
  }
}
