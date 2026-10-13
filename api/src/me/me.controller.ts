import { Controller, Get, Inject } from "@nestjs/common";
import type { UserView } from "@bolao/core/contracts";
import type { UsersGateway } from "@bolao/core/domain";
import type { AuthenticatedUser } from "../auth/authenticated-user.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { USERS_GATEWAY } from "../auth/users-gateway.provider.js";
import { unauthenticated } from "../common/errors.js";

@Controller("me")
export class MeController {
  constructor(@Inject(USERS_GATEWAY) private readonly users: UsersGateway) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserView> {
    const found = await this.users.findById(user.id);
    // Token válido de uma conta que não existe mais não autentica ninguém.
    if (!found) throw unauthenticated();
    return found;
  }
}
